import { Coffee, Package, Star, Utensils } from 'lucide-react';

const CATEGORY_GRADIENTS: Record<string, string> = {
  snacks: 'linear-gradient(135deg, #1E293B 0%, #0F4C75 100%)',
  mains: 'linear-gradient(135deg, #1E293B 0%, #7C2D12 100%)',
  hot_food: 'linear-gradient(135deg, #1E293B 0%, #7C2D12 100%)',
  beverages: 'linear-gradient(135deg, #1E293B 0%, #064E3B 100%)',
  desserts: 'linear-gradient(135deg, #1E293B 0%, #4C1D95 100%)',
  default: 'linear-gradient(135deg, #1E293B 0%, #1E3A5F 100%)',
};

function getCategoryKey(category: string | null | undefined): string {
  const normalized = (category ?? '').toLowerCase();
  if (normalized === 'snack') return 'snacks';
  if (normalized === 'main' || normalized === 'hot food') return 'hot_food';
  if (normalized === 'drink') return 'beverages';
  return normalized || 'default';
}

function categoryIcon(category: string | null | undefined): JSX.Element {
  const normalized = getCategoryKey(category);

  if (normalized === 'snacks') {
    return <Package size={32} className="text-blue-300/70" aria-hidden="true" />;
  }
  if (normalized === 'mains' || normalized === 'hot_food') {
    return <Utensils size={32} className="text-orange-300/70" aria-hidden="true" />;
  }
  if (normalized === 'beverages') {
    return <Coffee size={32} className="text-emerald-300/70" aria-hidden="true" />;
  }
  return <Star size={32} className="text-violet-300/70" aria-hidden="true" />;
}

export interface MenuItemImageProps {
  imageUrl: string | null | undefined;
  category?: string | null;
  alt: string;
  className?: string;
}

export function MenuItemImage({
  imageUrl,
  category,
  alt,
  className = '',
}: MenuItemImageProps): JSX.Element {
  const normalizedCategory = getCategoryKey(category);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={alt}
        className={`h-full w-full object-cover ${className}`}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`flex h-full w-full items-center justify-center ${className}`}
      style={{
        background:
          CATEGORY_GRADIENTS[normalizedCategory] ?? CATEGORY_GRADIENTS.default,
      }}
      aria-hidden="true"
    >
      {categoryIcon(normalizedCategory)}
    </div>
  );
}
