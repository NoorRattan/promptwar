import { z } from 'zod';

export const orderItemSchema = z.object({
  menuItemId: z.string().uuid('Invalid menu item.'),
  quantity: z.number().int().min(1).max(20),
  specialInstructions: z.string().max(200).optional(),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Add at least one item.').max(20),
  pickupZoneId: z.string().uuid('Please select a pickup zone.'),
  pickupSlot: z.string().datetime('Please select a pickup time.'),
  specialInstructions: z.string().max(500).optional(),
});

export type CreateOrderFormData = z.infer<typeof createOrderSchema>;
