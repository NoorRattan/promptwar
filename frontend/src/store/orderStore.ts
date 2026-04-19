import { create } from 'zustand';
import { CartItem, MenuItem, Order, OrderStatus } from '@/types';

interface OrderState {
  cart: CartItem[];
  items: CartItem[];
  activeOrders: Order[];
  orderHistory: Order[];
  isPlacingOrder: boolean;
  error: string | null;
}

interface OrderActions {
  addToCart: (item: MenuItem, quantity?: number) => void;
  addItem: (item: { menu_item: MenuItem; quantity?: number; special_instructions?: string }) => void;
  removeFromCart: (menuItemId: string) => void;
  updateCartItemQuantity: (menuItemId: string, quantity: number) => void;
  updateCartItemInstructions: (menuItemId: string, instructions: string) => void;
  clearCart: () => void;
  setActiveOrders: (orders: Order[]) => void;
  addActiveOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  setIsPlacingOrder: (loading: boolean) => void;
  setError: (error: string | null) => void;
  cartTotal: () => number;
  getTotalPrice: () => number;
  cartItemCount: () => number;
}

type OrderStore = OrderState & OrderActions;

export const useOrderStore = create<OrderStore>()((set, get) => ({
  cart: [],
  items: [],
  activeOrders: [],
  orderHistory: [],
  isPlacingOrder: false,
  error: null,

  addToCart: (item, quantity = 1) =>
    set((state) => {
      const existing = state.cart.find((c) => c.menuItem.id === item.id);
      if (existing) {
        const next = state.cart.map((c) =>
          c.menuItem.id === item.id ? { ...c, quantity: c.quantity + quantity } : c
        );
        return {
          cart: next,
          items: next,
        };
      }
      const next = [
        ...state.cart,
        {
          menuItem: item,
          menu_item: item,
          quantity,
          specialInstructions: '',
          special_instructions: '',
          price: item.price,
          name: item.name,
          menu_item_id: item.id,
        },
      ];
      return { cart: next, items: next };
    }),
  addItem: ({ menu_item, quantity = 1, special_instructions = '' }) =>
    set((state) => {
      const existing = state.cart.find((c) => c.menuItem.id === menu_item.id);
      if (existing) {
        const next = state.cart.map((c) =>
          c.menuItem.id === menu_item.id
            ? {
                ...c,
                quantity: c.quantity + quantity,
                specialInstructions: special_instructions || c.specialInstructions,
                special_instructions: special_instructions || c.special_instructions,
                price: menu_item.price,
                name: menu_item.name,
                menu_item_id: menu_item.id,
              }
            : c
        );
        return { cart: next, items: next };
      }

      const next = [
        ...state.cart,
        {
          menuItem: menu_item,
          menu_item,
          quantity,
          specialInstructions: special_instructions,
          special_instructions,
          price: menu_item.price,
          name: menu_item.name,
          menu_item_id: menu_item.id,
        },
      ];
      return { cart: next, items: next };
    }),

  removeFromCart: (menuItemId) =>
    set((state) => {
      const next = state.cart.filter((c) => c.menuItem.id !== menuItemId);
      return { cart: next, items: next };
    }),

  updateCartItemQuantity: (menuItemId, quantity) =>
    set((state) => ({
      cart: state.cart.map((c) =>
        c.menuItem.id === menuItemId ? { ...c, quantity } : c
      ).filter((c) => c.quantity > 0),
      items: state.cart.map((c) =>
        c.menuItem.id === menuItemId ? { ...c, quantity } : c
      ).filter((c) => c.quantity > 0),
    })),

  updateCartItemInstructions: (menuItemId, instructions) =>
    set((state) => ({
      cart: state.cart.map((c) =>
        c.menuItem.id === menuItemId
          ? { ...c, specialInstructions: instructions, special_instructions: instructions }
          : c
      ),
      items: state.cart.map((c) =>
        c.menuItem.id === menuItemId
          ? { ...c, specialInstructions: instructions, special_instructions: instructions }
          : c
      ),
    })),

  clearCart: () => set({ cart: [], items: [] }),
  setActiveOrders: (orders) => set({ activeOrders: orders }),
  addActiveOrder: (order) => set((state) => ({ activeOrders: [...state.activeOrders, order] })),
  updateOrderStatus: (orderId, status) =>
    set((state) => ({
      activeOrders: state.activeOrders.map((o) => (o.id === orderId ? { ...o, status } : o)),
    })),
  setIsPlacingOrder: (isPlacingOrder) => set({ isPlacingOrder }),
  setError: (error) => set({ error }),

  cartTotal: () => {
    return get().cart.reduce((total, item) => total + item.menuItem.price * item.quantity, 0);
  },
  getTotalPrice: () => {
    return get().cart.reduce((total, item) => total + item.menuItem.price * item.quantity, 0);
  },
  cartItemCount: () => {
    return get().cart.reduce((count, item) => count + item.quantity, 0);
  },
}));
