import apiClient, { cachedGet } from './client';
import { MenuItem, Order } from '@/types';

interface OrderItemResponse {
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  special_instructions: string | null;
}

interface OrderResponse {
  id: string;
  order_code: string;
  user_id: string;
  venue_id: string;
  items: OrderItemResponse[];
  total_price: number;
  status: Order['status'];
  pickup_zone_id: string | null;
  pickup_slot: string | null;
  special_instructions: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string | null;
}

interface MenuItemResponse {
  id: string;
  venue_id: string;
  name: string;
  description: string | null;
  price: number;
  category: MenuItem['category'];
  dietary_tags: string[];
  image_url: string | null;
  prep_time_minutes: number;
  is_available: boolean;
  is_sold_out: boolean;
}

// Convert order response fields from snake_case to camelCase
const mapOrderResponse = (data: OrderResponse): Order => ({
  id: data.id,
  orderCode: data.order_code,
  userId: data.user_id,
  venueId: data.venue_id,
  items: data.items.map((item) => ({
    menuItemId: item.menu_item_id,
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    subtotal: item.subtotal,
    specialInstructions: item.special_instructions
  })),
  totalPrice: data.total_price,
  status: data.status,
  pickupZoneId: data.pickup_zone_id,
  pickupSlot: data.pickup_slot,
  specialInstructions: data.special_instructions,
  isDemo: data.is_demo,
  createdAt: data.created_at,
  updatedAt: data.updated_at
});

// Convert menu response fields from snake_case to camelCase
const mapMenuItemResponse = (data: MenuItemResponse): MenuItem => ({
  id: data.id,
  venueId: data.venue_id,
  name: data.name,
  description: data.description,
  price: data.price,
  category: data.category,
  dietaryTags: data.dietary_tags,
  imageUrl: data.image_url,
  prepTimeMinutes: data.prep_time_minutes,
  isAvailable: data.is_available,
  isSoldOut: data.is_sold_out
});

/**
 * Get food and beverage menu for a venue
 * @param venueId Venue ID
 * @param options Filters for category or dietary features
 * @returns Promise resolving to array of MenuItem
 */
export async function getMenu(
  venueId: string,
  options?: { category?: string; dietaryTag?: string }
): Promise<MenuItem[]> {
  const payload = await cachedGet<MenuItemResponse[]>(
    '/orders/menu',
    {
      venue_id: venueId,
      category: options?.category,
      dietary_tag: options?.dietaryTag,
    },
    300_000
  );
  return payload.map(mapMenuItemResponse);
}

/**
 * Create a new order
 * @param data Order details
 * @returns Promise resolving to created Order
 */
export async function createOrder(data: {
  items: Array<{ menuItemId: string; quantity: number; specialInstructions?: string }>;
  pickupZoneId: string;
  pickupSlot: string;
  specialInstructions?: string;
  isDemo?: boolean;
}): Promise<Order> {
  const response = await apiClient.post<OrderResponse>(`/orders`, {
    items: data.items.map(item => ({
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
      special_instructions: item.specialInstructions
    })),
    pickup_zone_id: data.pickupZoneId,
    pickup_slot: data.pickupSlot,
    special_instructions: data.specialInstructions,
    is_demo: data.isDemo
  });
  return mapOrderResponse(response.data);
}

/**
 * Get a specific order by ID
 * @param orderId Order ID
 * @returns Promise resolving to Order
 */
export async function getOrder(orderId: string): Promise<Order> {
  const response = await apiClient.get<OrderResponse>(`/orders/${orderId}`);
  return mapOrderResponse(response.data);
}

/**
 * Get all past orders for the current user
 * @param status Optional status filter
 * @returns Promise resolving to array of Order
 */
export async function getMyOrders(status?: string): Promise<Order[]> {
  const response = await apiClient.get<OrderResponse[]>(`/orders`, {
    params: { status }
  });
  return response.data.map(mapOrderResponse);
}

/**
 * Cancel an unfulfilled order
 * @param orderId Order ID
 * @returns Promise resolving to success boolean and message
 */
export async function cancelOrder(orderId: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.delete<{ success: boolean; message: string }>(`/orders/${orderId}`);
  return response.data;
}

/**
 * Update the status of an existing order (Admin/Staff only)
 * @param orderId Order ID
 * @param status New order status
 * @returns Promise resolving to updated Order
 */
export async function updateOrderStatus(orderId: string, status: string): Promise<Order> {
  const response = await apiClient.patch<OrderResponse>(`/orders/${orderId}/status`, { status });
  return mapOrderResponse(response.data);
}
