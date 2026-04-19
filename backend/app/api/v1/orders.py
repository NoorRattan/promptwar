"""Order endpoints."""

import logging
import uuid
from decimal import Decimal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db, require_admin
from app.core.rate_limit import RATE_ORDER, RATE_READ, RATE_WRITE, limiter
from app.core.security import generate_order_code
from app.db.models.audit_log import AuditLog
from app.db.models.menu_item import MenuItem
from app.db.models.order import Order, OrderStatus
from app.db.models.user import User, UserRole
from app.firebase.fcm import send_order_ready
from app.firebase.firestore import write_order_state
from app.schemas.order import (
    CreateOrderRequest,
    MenuAvailabilityRequest,
    MenuItemResponse,
    OrderResponse,
    UpdateOrderStatusRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _audit_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


def _validate_status_transition(current: OrderStatus, new: OrderStatus) -> bool:
    allowed = [
        OrderStatus.RECEIVED,
        OrderStatus.CONFIRMED,
        OrderStatus.PREPARING,
        OrderStatus.READY,
        OrderStatus.COLLECTED,
    ]
    if new == OrderStatus.CANCELLED:
        return current == OrderStatus.RECEIVED
    try:
        return allowed.index(new) > allowed.index(current)
    except ValueError:
        return False


def _pickup_zone_name(order: Order) -> str | None:
    return None


@router.get(
    "/menu", response_model=list[MenuItemResponse], summary="List menu items by venue"
)
@limiter.limit(RATE_READ)
async def get_menu(
    request: Request,
    venue_id: uuid.UUID,
    category: str | None = None,
    dietary_tag: str | None = None,
    available_only: bool = False,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[MenuItemResponse]:
    """Return menu items for a venue."""
    query = select(MenuItem).where(MenuItem.venue_id == venue_id)
    if category:
        query = query.where(MenuItem.category == category.upper())
    if available_only:
        query = query.where(
            MenuItem.is_available.is_(True), MenuItem.is_sold_out.is_(False)
        )

    result = await db.execute(query)
    items = result.scalars().all()
    if dietary_tag:
        items = [item for item in items if dietary_tag in (item.dietary_tags or [])]
    return [MenuItemResponse.model_validate(item) for item in items]


@router.get("", response_model=list[OrderResponse], summary="List orders")
@limiter.limit(RATE_READ)
async def list_orders(
    request: Request,
    venue_id: uuid.UUID | None = None,
    status_filter: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> list[OrderResponse]:
    """List attendee orders or venue orders for staff/admin users."""
    query = select(Order)
    if current_user.role in (UserRole.ADMIN, UserRole.STAFF):
        if venue_id is not None:
            query = query.where(Order.venue_id == venue_id)
    else:
        query = query.where(Order.user_id == current_user.id)
        if venue_id is not None:
            query = query.where(Order.venue_id == venue_id)
    if status_filter is not None:
        try:
            query = query.where(Order.status == OrderStatus(status_filter.upper()))
        except ValueError as exc:
            raise HTTPException(
                status_code=422, detail="Invalid order status filter"
            ) from exc
    result = await db.execute(query.order_by(Order.created_at.desc()))
    return [OrderResponse.model_validate(order) for order in result.scalars().all()]


@router.post(
    "",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create order",
)
@limiter.limit(RATE_ORDER)
async def create_order(
    request: Request,
    body: CreateOrderRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> OrderResponse:
    """Create an order with server-side pricing and generated order code."""
    item_ids = [item.menu_item_id for item in body.items]
    result = await db.execute(select(MenuItem).where(MenuItem.id.in_(item_ids)))
    menu_items = {item.id: item for item in result.scalars().all()}

    total_price = Decimal("0.00")
    venue_id: uuid.UUID | None = None
    stored_items: list[dict[str, object]] = []
    for requested_item in body.items:
        menu_item = menu_items.get(requested_item.menu_item_id)
        if menu_item is None or not menu_item.is_available or menu_item.is_sold_out:
            raise HTTPException(status_code=400, detail="Menu item is not available")
        if venue_id is None:
            venue_id = menu_item.venue_id
        elif venue_id != menu_item.venue_id:
            raise HTTPException(
                status_code=400, detail="All items must come from the same venue"
            )
        subtotal = Decimal(menu_item.price) * requested_item.quantity
        total_price += subtotal
        stored_items.append(
            {
                "menu_item_id": str(menu_item.id),
                "name": menu_item.name,
                "quantity": requested_item.quantity,
                "price": float(menu_item.price),
                "special_instructions": requested_item.special_instructions,
            }
        )

    if venue_id is None:
        raise HTTPException(status_code=400, detail="No menu items were found")

    order = Order(
        id=uuid.uuid4(),
        order_code=generate_order_code(),
        user_id=current_user.id,
        venue_id=venue_id,
        items=stored_items,
        total_price=total_price,
        status=OrderStatus.RECEIVED,
        pickup_zone_id=body.pickup_zone_id,
        pickup_slot=body.pickup_slot,
        special_instructions=body.special_instructions,
        is_demo=body.is_demo,
    )
    db.add(order)
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="order_created",
            resource_type="order",
            resource_id=str(order.id),
            ip_address=_audit_ip(request),
        )
    )
    await db.commit()
    await db.refresh(order)

    background_tasks.add_task(
        write_order_state,
        str(order.id),
        current_user.firebase_uid,
        order.status.value,
        order.order_code,
        order.pickup_slot.isoformat() if order.pickup_slot else None,
        _pickup_zone_name(order),
    )
    return OrderResponse.model_validate(order)


@router.get("/{order_id}", response_model=OrderResponse, summary="Get single order")
@limiter.limit(RATE_READ)
async def get_order(
    request: Request,
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> OrderResponse:
    """Fetch a single order for its owner or for staff/admin users."""
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if (
        current_user.role not in (UserRole.ADMIN, UserRole.STAFF)
        and order.user_id != current_user.id
    ):
        raise HTTPException(status_code=403, detail="Not authorized")
    return OrderResponse.model_validate(order)


@router.patch(
    "/{order_id}/status", response_model=OrderResponse, summary="Update order status"
)
@limiter.limit(RATE_WRITE)
async def update_order_status(
    request: Request,
    order_id: uuid.UUID,
    body: UpdateOrderStatusRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin),
) -> OrderResponse:
    """Update order status for staff/admin users."""
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")

    new_status = OrderStatus(body.status)
    if not _validate_status_transition(order.status, new_status):
        raise HTTPException(status_code=400, detail="Invalid status transition")

    order.status = new_status
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="order_status_updated",
            resource_type="order",
            resource_id=str(order.id),
            details={"new_status": new_status.value},
            ip_address=_audit_ip(request),
        )
    )
    await db.commit()
    await db.refresh(order)

    owner_result = await db.execute(select(User).where(User.id == order.user_id))
    owner = owner_result.scalar_one_or_none()

    if owner is not None:
        background_tasks.add_task(
            write_order_state,
            str(order.id),
            owner.firebase_uid,
            order.status.value,
            order.order_code,
            order.pickup_slot.isoformat() if order.pickup_slot else None,
            _pickup_zone_name(order),
        )
        if order.status == OrderStatus.READY and owner.fcm_token and not order.is_demo:
            background_tasks.add_task(
                send_order_ready,
                owner.fcm_token,
                order.order_code,
                _pickup_zone_name(order) or "pickup counter",
            )

    return OrderResponse.model_validate(order)


@router.delete("/{order_id}", response_model=OrderResponse, summary="Cancel order")
@limiter.limit(RATE_WRITE)
async def cancel_order(
    request: Request,
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> OrderResponse:
    """Cancel an attendee order while it is still in received state."""
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if order.status != OrderStatus.RECEIVED:
        raise HTTPException(
            status_code=400, detail="Only received orders can be cancelled"
        )

    order.status = OrderStatus.CANCELLED
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="order_cancelled",
            resource_type="order",
            resource_id=str(order.id),
            ip_address=_audit_ip(request),
        )
    )
    await db.commit()
    await db.refresh(order)
    return OrderResponse.model_validate(order)


@router.patch(
    "/menu/{menu_item_id}/availability",
    response_model=MenuItemResponse,
    summary="Update menu availability",
)
@limiter.limit(RATE_WRITE)
async def update_menu_availability(
    request: Request,
    menu_item_id: uuid.UUID,
    body: MenuAvailabilityRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_admin),
) -> MenuItemResponse:
    """Update menu item availability for staff/admin users."""
    result = await db.execute(select(MenuItem).where(MenuItem.id == menu_item_id))
    menu_item = result.scalar_one_or_none()
    if menu_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    menu_item.is_sold_out = body.is_sold_out
    if body.is_available is not None:
        menu_item.is_available = body.is_available
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="menu_item_availability_updated",
            resource_type="menu_item",
            resource_id=str(menu_item.id),
            details={
                "is_sold_out": body.is_sold_out,
                "is_available": body.is_available,
            },
            ip_address=_audit_ip(request),
        )
    )
    await db.commit()
    await db.refresh(menu_item)
    return MenuItemResponse.model_validate(menu_item)
