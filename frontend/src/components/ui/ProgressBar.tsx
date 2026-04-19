export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASS_MAP: Record<NonNullable<ProgressBarProps['size']>, string> = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
};

function getColor(value: number): string {
  if (value <= 40) return 'var(--density-low)';
  if (value <= 65) return 'var(--density-medium)';
  if (value <= 85) return 'var(--density-high)';
  return 'var(--density-critical)';
}

export function ProgressBar({
  value,
  max = 100,
  label,
  size = 'md',
  className = '',
}: ProgressBarProps): JSX.Element {
  const boundedValue = Math.max(0, Math.min(max, value));
  const percentage = max <= 0 ? 0 : (boundedValue / max) * 100;

  return (
    <div className={`w-full ${className}`}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.round(boundedValue)}
        aria-label={label}
        className={`progress-track ${SIZE_CLASS_MAP[size]}`}
      >
        <div
          className="progress-value"
          style={{ width: `${percentage}%`, background: getColor(percentage) }}
        />
      </div>
    </div>
  );
}
