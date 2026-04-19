import * as Dialog from '@radix-ui/react-dialog';
import { ShoppingCart, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import type { CartItem } from '@/types/order';

export interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  totalAmount: number;
  pickupZones: Array<{ id: string; label: string }>;
  pickupZoneId: string;
  onPickupZoneChange: (value: string) => void;
  pickupSlots: string[];
  pickupSlot: string;
  onPickupSlotChange: (value: string) => void;
  instructions: string;
  onInstructionsChange: (value: string) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onPlaceOrder: () => void;
  isPlacingOrder?: boolean;
}

export function CartDrawer({
  isOpen,
  onClose,
  items,
  totalAmount,
  pickupZones,
  pickupZoneId,
  onPickupZoneChange,
  pickupSlots,
  pickupSlot,
  onPickupSlotChange,
  instructions,
  onInstructionsChange,
  onUpdateQuantity,
  onPlaceOrder,
  isPlacingOrder = false,
}: CartDrawerProps): JSX.Element {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-fade-in fixed inset-0 z-[140] bg-[var(--color-bg-overlay)] backdrop-blur-sm" />
        <Dialog.Content className="animate-slide-up fixed bottom-0 left-0 right-0 z-[150] rounded-t-[24px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-[0_-28px_64px_rgba(2,6,23,0.48)] lg:left-auto lg:right-6 lg:top-6 lg:h-[calc(100%-48px)] lg:w-[420px] lg:rounded-[24px]">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(37,99,235,0.16)] text-[var(--color-accent-light)]">
                  <ShoppingCart size={18} />
                </div>
                <div>
                  <Dialog.Title className="text-title">Order Summary</Dialog.Title>
                  <p className="text-meta">{items.length} line items</p>
                </div>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close cart drawer"
                  className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[rgba(17,30,53,0.72)] text-[var(--color-text-secondary)]"
                >
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="space-y-3">
                {items.map((item) => {
                  const menuItem = item.menu_item ?? item.menuItem;
                  const itemId = item.menu_item_id ?? menuItem.id;
                  return (
                    <div
                      key={itemId}
                      className="rounded-[16px] border border-[var(--color-border)] bg-[rgba(17,30,53,0.46)] p-4"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-heading">{menuItem.name}</p>
                          <p className="text-meta">Rs {menuItem.price.toFixed(0)} each</p>
                        </div>
                        <span className="text-heading text-[var(--color-accent-light)]">
                          Rs {(menuItem.price * item.quantity).toFixed(0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[rgba(7,13,26,0.42)] px-2 py-1 w-fit">
                        <button
                          type="button"
                          className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-primary)]"
                          onClick={() => onUpdateQuantity(itemId, item.quantity - 1)}
                          aria-label={`Decrease ${menuItem.name}`}
                        >
                          -
                        </button>
                        <span className="min-w-[20px] text-center text-body font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)] text-white"
                          onClick={() => onUpdateQuantity(itemId, item.quantity + 1)}
                          aria-label={`Increase ${menuItem.name}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="pickup-zone" className="text-label">
                    Pickup Zone
                  </label>
                  <select
                    id="pickup-zone"
                    className="form-input mt-2"
                    value={pickupZoneId}
                    onChange={(event) => onPickupZoneChange(event.target.value)}
                  >
                    <option value="">Select pickup zone</option>
                    {pickupZones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-label">Pickup Slot</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {pickupSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        className={`filter-pill justify-center ${pickupSlot === slot ? 'is-active' : ''}`}
                        onClick={() => onPickupSlotChange(slot)}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="special-instructions" className="text-label">
                    Special Instructions
                  </label>
                  <textarea
                    id="special-instructions"
                    className="form-input mt-2 min-h-[88px]"
                    value={instructions}
                    onChange={(event) => onInstructionsChange(event.target.value)}
                    placeholder="Add pickup notes or dietary details"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-[var(--color-border)] px-5 py-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-body text-[var(--color-text-secondary)]">Total</span>
                <span className="text-title">Rs {totalAmount.toFixed(0)}</span>
              </div>
              <Button
                className="w-full"
                onClick={onPlaceOrder}
                isLoading={isPlacingOrder}
                disabled={!pickupZoneId || !pickupSlot || items.length === 0}
                loadingLabel="Placing Order..."
              >
                Place Order
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
