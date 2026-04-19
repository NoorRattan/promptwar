import { ArrowRight } from 'lucide-react';

import { DensityBadge } from '@/components/crowd/DensityBadge';
import { Button, Card, ProgressBar } from '@/components/ui';
import type { ZoneDensity } from '@/types/crowd';

export interface ZoneCardProps {
  zone: ZoneDensity;
  onNavigate?: (zoneId: string) => void;
}

export function ZoneCard({ zone, onNavigate }: ZoneCardProps): JSX.Element {
  const percent = Math.round((zone.density ?? 0) * 100);
  const progressVariant =
    zone.level === 'CRITICAL'
      ? 'danger'
      : zone.level === 'HIGH' || zone.level === 'MEDIUM'
        ? 'warning'
        : 'success';

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <p className="text-heading">{zone.name}</p>
          <p className="text-meta mt-1">{zone.count} attendees in zone</p>
        </div>
        <DensityBadge level={zone.level} />
      </div>
      <div className="mb-3 flex items-center justify-between text-meta">
        <span>Density</span>
        <span>{percent}%</span>
      </div>
      <ProgressBar value={percent} variant={progressVariant} size="md" />
      {onNavigate ? (
        <div className="mt-4 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            rightIcon={<ArrowRight size={14} />}
            onClick={() => onNavigate(zone.id)}
            aria-label={`Navigate to ${zone.name}`}
          >
            Open on map
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
