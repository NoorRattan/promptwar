export type OrderStatus =
  | 'received'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'collected'
  | 'cancelled';

export type MenuCategory = string;

export interface MenuItem {
  readonly id: string;
  readonly venueId: string;
  readonly venue_id?: string;
  readonly name: string;
  readonly description: string | null;
  readonly price: number;
  readonly category: MenuCategory;
  readonly dietaryTags: string[];
  readonly dietary_tags?: string[];
  readonly imageUrl: string | null;
  readonly image_url?: string | null;
  readonly prepTimeMinutes: number;
  readonly prep_time_minutes?: number;
  readonly isAvailable: boolean;
  readonly is_available?: boolean;
  readonly isSoldOut: boolean;
  readonly is_sold_out?: boolean;
}

export interface CartItem {
  menuItem: MenuItem;
  menu_item?: MenuItem;
  quantity: number;
  specialInstructions: string;
  special_instructions?: string;
  price?: number;
  name?: string;
  menu_item_id?: string;
}

export interface OrderItemDetail {
  readonly menuItemId: string;
  readonly menu_item_id?: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly unit_price?: number;
  readonly subtotal: number;
  readonly specialInstructions: string | null;
  readonly special_instructions?: string | null;
}

export interface Order {
  readonly id: string;
  readonly orderCode: string;
  readonly order_code?: string;
  readonly userId: string;
  readonly user_id?: string;
  readonly venueId: string;
  readonly venue_id?: string;
  readonly items: OrderItemDetail[];
  readonly totalPrice: number;
  readonly total_amount?: number;
  readonly total_price?: number;
  readonly status: OrderStatus;
  readonly pickupZoneId: string | null;
  readonly pickup_zone_id?: string | null;
  readonly pickupSlot: string | null;
  readonly pickup_slot?: string | null;
  readonly specialInstructions: string | null;
  readonly special_instructions?: string | null;
  readonly isDemo: boolean;
  readonly is_demo?: boolean;
  readonly createdAt: string;
  readonly created_at?: string;
  readonly updatedAt: string | null;
  readonly updated_at?: string | null;
}

export const ORDER_STATUS_STEPS: OrderStatus[] = [
  'received',
  'confirmed',
  'preparing',
  'ready',
  'collected',
];

export interface OrderStatusState {
  order_code?: string;
  pickup_zone_name?: string;
  pickup_zone_id?: string;
  pickup_slot?: string | null;
  status: OrderStatus | Uppercase<OrderStatus>;
  updated_at?: string | null;
  items?: OrderItemDetail[];
  total_amount?: number;
}
