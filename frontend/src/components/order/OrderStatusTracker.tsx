import type { OrderStatus } from '@/types/order';

const STEPS: Array<{ value: OrderStatus; label: string }> = [
  { value: 'received', label: 'Received' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'collected', label: 'Collected' },
];

export function OrderStatusTracker({
  currentStatus,
}: {
  currentStatus: OrderStatus | Uppercase<OrderStatus>;
}): JSX.Element {
  const normalizedStatus = currentStatus.toLowerCase() as OrderStatus;
  const activeIndex = Math.max(
    STEPS.findIndex((step) => step.value === normalizedStatus),
    0
  );

  return (
    <div role="status" aria-label={`Order status: ${normalizedStatus}`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        {STEPS.map((step, index) => {
          const isComplete = index < activeIndex;
          const isCurrent = index === activeIndex;

          return (
            <div key={step.value} className="flex min-w-0 flex-1 items-center gap-2">
              <div
                className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                  isComplete || isCurrent
                    ? 'border-[var(--color-accent-light)] bg-[rgba(37,99,235,0.2)] text-white'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'
                }`}
              >
                {index + 1}
                {isCurrent ? (
                  <span className="absolute inset-[-4px] rounded-full border border-[rgba(59,130,246,0.42)] animate-[live-pulse_2s_ease-in-out_infinite]" />
                ) : null}
              </div>
              {index < STEPS.length - 1 ? (
                <div
                  className={`h-[2px] flex-1 rounded-full ${
                    index < activeIndex
                      ? 'bg-[var(--color-accent-light)]'
                      : 'bg-[rgba(74,94,138,0.24)]'
                  }`}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {STEPS.map((step, index) => (
          <p
            key={step.value}
            className={`text-center text-[11px] font-medium ${
              index === activeIndex
                ? 'text-[var(--color-text-primary)]'
                : 'text-[var(--color-text-secondary)]'
            }`}
          >
            {step.label}
          </p>
        ))}
      </div>
    </div>
  );
}
