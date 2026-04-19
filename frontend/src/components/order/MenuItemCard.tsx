import { Check, Clock, Minus, Plus } from 'lucide-react';

import { MenuItemImage } from '@/components/ui/MenuItemImage';
import { Badge, Button, Card } from '@/components/ui';
import type { MenuItem } from '@/types/order';

export interface MenuItemCardProps {
  item: MenuItem;
  quantity?: number;
  onAdd?: (itemId: string) => void;
  onRemove?: (itemId: string) => void;
}

export function MenuItemCard({
  item,
  quantity = 0,
  onAdd,
  onRemove,
}: MenuItemCardProps): JSX.Element {
  const soldOut = item.is_sold_out ?? item.isSoldOut;
  const imageUrl = item.image_url ?? item.imageUrl;
  const prepTime = item.prep_time_minutes ?? item.prepTimeMinutes ?? 0;

  return (
    <Card className="card-hover relative overflow-hidden p-0" interactive>
      {soldOut ? (
        <div className="absolute inset-0 z-10 flex items-start justify-end bg-[rgba(7,13,26,0.55)] p-3">
          <Badge variant="closed" label="Sold Out" />
        </div>
      ) : null}

      <div className="h-32 w-full overflow-hidden border-b border-[var(--color-border)]">
        <MenuItemImage
          imageUrl={imageUrl}
          category={item.category}
          alt={item.name}
          className="h-full w-full"
        />
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-heading">{item.name}</h3>
            <p className="mt-1 line-clamp-2 text-meta">
              {item.description ?? 'Prepared fresh for pickup.'}
            </p>
          </div>
          <span className="text-heading text-[var(--color-accent-light)]">
            Rs {item.price.toFixed(0)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Badge
            variant="info"
            icon={<Clock size={12} aria-hidden="true" />}
            label={`~${prepTime} min`}
          />

          {quantity > 0 ? (
            <div className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[rgba(17,30,53,0.72)] px-2 py-1">
              <button
                type="button"
                aria-label={`Decrease ${item.name}`}
                className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-primary)]"
                onClick={() => onRemove?.(item.id)}
                disabled={soldOut}
              >
                <Minus size={14} />
              </button>
              <span className="min-w-[20px] text-center text-body font-semibold">
                {quantity}
              </span>
              <button
                type="button"
                aria-label={`Increase ${item.name}`}
                className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)] text-white"
                onClick={() => onAdd?.(item.id)}
                disabled={soldOut}
              >
                <Plus size={14} />
              </button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => onAdd?.(item.id)}
              disabled={soldOut}
            >
              Add
            </Button>
          )}
        </div>

        {Array.isArray(item.dietary_tags ?? item.dietaryTags) &&
        (item.dietary_tags ?? item.dietaryTags).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {(item.dietary_tags ?? item.dietaryTags).map((tag) => (
              <Badge
                key={tag}
                variant="info"
                icon={<Check size={12} aria-hidden="true" />}
                label={tag}
              />
            ))}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
