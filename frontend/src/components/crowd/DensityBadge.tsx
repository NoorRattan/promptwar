import { Activity, AlertCircle, CheckCircle2, Flame } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import type { DensityLevel } from '@/types/crowd';

export interface DensityBadgeProps {
  level: DensityLevel;
}

function densityBadgeMeta(level: DensityLevel): {
  label: string;
  variant: 'low' | 'medium' | 'high' | 'critical';
  icon: JSX.Element;
} {
  switch (level) {
    case 'MEDIUM':
      return {
        label: 'Medium',
        variant: 'medium',
        icon: <Activity size={12} aria-hidden="true" />,
      };
    case 'HIGH':
      return {
        label: 'High',
        variant: 'high',
        icon: <AlertCircle size={12} aria-hidden="true" />,
      };
    case 'CRITICAL':
      return {
        label: 'Critical',
        variant: 'critical',
        icon: <Flame size={12} aria-hidden="true" />,
      };
    default:
      return {
        label: 'Low',
        variant: 'low',
        icon: <CheckCircle2 size={12} aria-hidden="true" />,
      };
  }
}

export function DensityBadge({ level }: DensityBadgeProps): JSX.Element {
  const meta = densityBadgeMeta(level);

  return (
    <Badge
      variant={meta.variant}
      role="status"
      aria-label={`Crowd density: ${meta.label}`}
      icon={meta.icon}
      label={meta.label}
    />
  );
}
