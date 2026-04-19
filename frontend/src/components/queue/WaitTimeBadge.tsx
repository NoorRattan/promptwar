import { Clock } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';

export function waitBadgeVariant(minutes: number): 'open' | 'warn' | 'danger' {
  if (minutes <= 5) {
    return 'open';
  }
  if (minutes <= 15) {
    return 'warn';
  }
  return 'danger';
}

export function WaitTimeBadge({ minutes }: { minutes: number }): JSX.Element {
  return (
    <Badge
      variant={waitBadgeVariant(minutes)}
      icon={<Clock size={12} aria-hidden="true" />}
      label={`${minutes} min`}
    />
  );
}
