interface SkeletonProps {
  className?: string;
  variant?: 'card' | 'text' | 'circle' | 'full';
}

const VARIANT_CLASS_MAP: Record<NonNullable<SkeletonProps['variant']>, string> = {
  card: 'h-24 w-full rounded-[16px]',
  text: 'h-4 w-3/4 rounded-[10px]',
  circle: 'h-10 w-10 rounded-full',
  full: 'h-full w-full rounded-[16px]',
};

export function Skeleton({
  className = '',
  variant = 'full',
}: SkeletonProps): JSX.Element {
  return <div aria-hidden="true" className={`skeleton ${VARIANT_CLASS_MAP[variant]} ${className}`} />;
}

export function SkeletonText({
  className = '',
  lines = 1,
}: {
  className?: string;
  lines?: number;
}): JSX.Element {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} variant="text" className={className} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }): JSX.Element {
  return (
    <div className={`surface-card rounded-[16px] p-4 ${className}`}>
      <Skeleton variant="text" className="mb-4 h-5 w-2/3" />
      <SkeletonText lines={3} />
    </div>
  );
}
