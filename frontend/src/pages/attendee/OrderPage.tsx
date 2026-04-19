import { Check, ShoppingCart, Utensils } from 'lucide-react';
import { getAuth } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { DEMO_VENUE, getDemoMenuItems } from '@/data/demoData';
import { CartDrawer } from '@/components/order/CartDrawer';
import { MenuItemCard } from '@/components/order/MenuItemCard';
import { AttendeeLayout } from '@/components/layout/AttendeeLayout';
import { Badge, Card, Skeleton, useToast } from '@/components/ui';
import { getMenu, createOrder } from '@/lib/api/orders';
import { buildDemoPath, isDemoSearch } from '@/lib/routing/demo';
import { useAuthStore } from '@/store/authStore';
import { useOrderStore } from '@/store/orderStore';
import { useQueueStore } from '@/store/queueStore';
import { useVenueStore } from '@/store/venueStore';
import type { MenuItem } from '@/types/order';

const DIETARY_FILTERS = [
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'gluten-free', label: 'Gluten-Free' },
  { key: 'halal', label: 'Halal' },
] as const;

function normalizeCategory(category: string | null | undefined): string {
  const value = (category ?? '').toLowerCase().trim();
  if (value === 'snack') return 'snacks';
  if (value === 'main' || value === 'hot_food' || value === 'hot food') return 'mains';
  if (value === 'drink' || value === 'beverage') return 'beverages';
  if (value === 'merch' || value === 'merchandise') return 'merchandise';
  return value;
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    all: 'All',
    snacks: 'Snacks',
    mains: 'Mains',
    beverages: 'Drinks',
    desserts: 'Desserts',
  };
  return labels[category] ?? category;
}

function pickupSlots(): string[] {
  const slots: string[] = [];
  const start = new Date();
  start.setSeconds(0, 0);
  start.setMinutes(Math.ceil(start.getMinutes() / 5) * 5);

  for (let index = 0; index < 4; index += 1) {
    const slotTime = new Date(start.getTime() + index * 5 * 60000);
    slots.push(
      slotTime.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })
    );
  }

  return slots;
}

export default function OrderPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const isAnonymous = useAuthStore((state) => state.isAnonymous);
  const isDemoMode = isAnonymous || isDemoSearch(location.search);
  const currentVenue = useVenueStore((state) => state.currentVenue);
  const zones = useVenueStore((state) => state.zones);
  const queues = useQueueStore((state) => state.queues);
  const cart = useOrderStore((state) => state.cart);
  const addToCart = useOrderStore((state) => state.addToCart);
  const updateCartItemQuantity = useOrderStore((state) => state.updateCartItemQuantity);
  const clearCart = useOrderStore((state) => state.clearCart);
  const cartTotal = useOrderStore((state) => state.cartTotal);
  const cartItemCount = useOrderStore((state) => state.cartItemCount);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pickupZoneId, setPickupZoneId] = useState('');
  const [pickupSlot, setPickupSlot] = useState('');
  const [instructions, setInstructions] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    const loadMenu = async (): Promise<void> => {
      const venueId = currentVenue?.id ?? DEMO_VENUE.id;
      const auth = getAuth();
      const isAnonymousSession = auth.currentUser?.isAnonymous ?? isAnonymous;
      const useBundledDemoData =
        isAnonymousSession || isDemoMode || venueId === DEMO_VENUE.id;

      setLoading(true);
      try {
        if (useBundledDemoData) {
          setMenuItems(getDemoMenuItems(venueId));
          return;
        }

        if (!currentVenue?.id) {
          setMenuItems(getDemoMenuItems(venueId));
          return;
        }

        const items = await getMenu(currentVenue.id);
        setMenuItems(items.length > 0 ? items : getDemoMenuItems(currentVenue.id));
      } catch {
        setMenuItems(getDemoMenuItems(venueId));
      } finally {
        setLoading(false);
      }
    };

    void loadMenu();
  }, [currentVenue?.id, isAnonymous, isDemoMode]);

  const visibleItems = useMemo(
    () =>
      menuItems.filter((item) => normalizeCategory(item.category) !== 'merchandise'),
    [menuItems]
  );

  const categories = useMemo(() => {
    const values = new Set(
      visibleItems.map((item) => normalizeCategory(item.category)).filter(Boolean)
    );
    return ['all', ...Array.from(values)];
  }, [visibleItems]);

  const filteredItems = useMemo(() => {
    let items =
      category === 'all'
        ? visibleItems
        : visibleItems.filter((item) => normalizeCategory(item.category) === category);

    activeFilters.forEach((filter) => {
      items = items.filter((item) => {
        const dietaryTags = (item.dietary_tags ?? item.dietaryTags ?? []).map((tag) =>
          tag.toLowerCase()
        );
        return dietaryTags.includes(filter);
      });
    });

    return items;
  }, [activeFilters, category, visibleItems]);

  const quantities = useMemo(
    () =>
      cart.reduce<Record<string, number>>((accumulator, item) => {
        accumulator[item.menuItem.id] = item.quantity;
        return accumulator;
      }, {}),
    [cart]
  );

  const pickupZoneOptions = useMemo(() => {
    const foodQueueOptions = queues
      .filter(
        (queue) =>
          normalizeCategory(queue.queue_type ?? queue.queueType) === 'food' &&
          (queue.is_open ?? queue.isOpen)
      )
      .map((queue) => ({
        id: queue.zone_id ?? queue.id,
        label: queue.name,
      }));

    if (foodQueueOptions.length > 0) {
      return foodQueueOptions;
    }

    return zones
      .filter((zone) => normalizeCategory(zone.zone_type ?? zone.zoneType) === 'food')
      .map((zone) => ({
        id: zone.id,
        label: zone.name,
      }));
  }, [queues, zones]);

  const slotOptions = useMemo(() => pickupSlots(), []);
  const totalAmount = cartTotal();

  const placeOrder = async (): Promise<void> => {
    if (cart.length === 0 || !pickupZoneId || !pickupSlot) {
      return;
    }

    setPlacingOrder(true);
    try {
      const order = await createOrder({
        items: cart.map((item) => ({
          menuItemId: item.menuItem.id,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions,
        })),
        pickupZoneId,
        pickupSlot: new Date().toISOString(),
        specialInstructions: instructions,
        isDemo: isAnonymous,
      });

      clearCart();
      setDrawerOpen(false);
      navigate(
        buildDemoPath(`/order/${order.id}/status`, location.search, isAnonymous)
      );
    } catch {
      showToast('error', 'Order could not be placed.');
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <AttendeeLayout title="Food">
      <div className="page-content-shell">
        <div className="page-stack animate-page-enter">
          <div className="page-copy">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-display">Order Food</h1>
              <Badge variant="info" label={`${cartItemCount()} items`} />
            </div>
            <p className="text-meta">Skip the queue with live pickup zones and five-minute collection windows.</p>
          </div>

          {!loading && visibleItems.length > 0 && visibleItems.length < 6 ? (
            <Card className="p-4">
              <p className="text-heading">Limited menu available today</p>
              <p className="mt-1 text-meta">
                Some counters are offline right now, so only a smaller live menu is available.
              </p>
            </Card>
          ) : null}

          <h2 className="sr-only">Menu Items</h2>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((option) => (
              <button
                key={option}
                type="button"
                className={`filter-pill ${category === option ? 'is-active' : ''}`}
                onClick={() => setCategory(option)}
              >
                {categoryLabel(option)}
              </button>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {DIETARY_FILTERS.map((filter) => {
              const active = activeFilters.has(filter.key);
              return (
                <button
                  key={filter.key}
                  type="button"
                  className={`filter-pill ${active ? 'is-active' : ''}`}
                  onClick={() => {
                    setActiveFilters((current) => {
                      const next = new Set(current);
                      if (next.has(filter.key)) {
                        next.delete(filter.key);
                      } else {
                        next.add(filter.key);
                      }
                      return next;
                    });
                  }}
                >
                  {active ? <Check size={14} /> : null}
                  {filter.label}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-[240px]" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="empty-state">
              <Utensils size={48} style={{ opacity: 0.3, margin: '0 auto 16px' }} />
              <p className="text-heading">No items match your filters.</p>
              <button
                type="button"
                onClick={() => {
                  setCategory('all');
                  setActiveFilters(new Set());
                }}
                className="mt-3 bg-transparent text-sm text-[var(--color-accent-light)]"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="stagger-children grid grid-cols-2 gap-3 md:grid-cols-3">
              {filteredItems.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  quantity={quantities[item.id] ?? 0}
                  onAdd={(itemId) => {
                    const target = visibleItems.find((menuItem) => menuItem.id === itemId);
                    if (target) {
                      addToCart(target, 1);
                    }
                  }}
                  onRemove={(itemId) => updateCartItemQuantity(itemId, (quantities[itemId] ?? 0) - 1)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {cartItemCount() > 0 ? (
        <button
          type="button"
          className="focus-ring fixed bottom-[calc(var(--nav-height)+env(safe-area-inset-bottom)+14px)] right-4 z-[120] inline-flex items-center gap-3 rounded-full bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_100%)] px-4 py-3 text-white shadow-[0_18px_32px_rgba(37,99,235,0.28)]"
          onClick={() => setDrawerOpen(true)}
          aria-label={`Open cart with ${cartItemCount()} items`}
        >
          <ShoppingCart size={16} />
          <span className="text-sm font-semibold">{cartItemCount()} items</span>
          <span className="text-sm font-semibold">Rs {totalAmount.toFixed(0)}</span>
        </button>
      ) : null}

      <CartDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        items={cart}
        totalAmount={totalAmount}
        pickupZones={pickupZoneOptions}
        pickupZoneId={pickupZoneId}
        onPickupZoneChange={setPickupZoneId}
        pickupSlots={slotOptions}
        pickupSlot={pickupSlot}
        onPickupSlotChange={setPickupSlot}
        instructions={instructions}
        onInstructionsChange={setInstructions}
        onUpdateQuantity={(itemId, quantity) => updateCartItemQuantity(itemId, quantity)}
        onPlaceOrder={() => {
          void placeOrder();
        }}
        isPlacingOrder={placingOrder}
      />
    </AttendeeLayout>
  );
}
