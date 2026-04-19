import { ArrowRight, Clock } from 'lucide-react';

import { Badge, Button, Card } from '@/components/ui';
import type { SeatUpgrade } from '@/types/seat';

export interface UpgradeOfferCardProps {
  offer: SeatUpgrade;
  onAccept: () => void;
  onDecline: () => void;
}

function countdownLabel(secondsLeft: number): string {
  const minutes = Math.max(Math.floor(secondsLeft / 60), 0);
  const seconds = Math.max(secondsLeft % 60, 0)
    .toString()
    .padStart(2, '0');

  return `${minutes}:${seconds}`;
}

export function UpgradeOfferCard({
  offer,
  onAccept,
  onDecline,
}: UpgradeOfferCardProps): JSX.Element {
  return (
    <Card className="p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-label">Upgrade Offer</p>
          <h3 className="mt-1 text-heading">
            {offer.fromSeat}
            <ArrowRight className="mx-2 inline-block" size={14} />
            {offer.toSeat}
          </h3>
          <p className="mt-1 text-meta">
            {offer.fromSection ?? 'Current section'} to {offer.toSection ?? 'Upgraded section'}
          </p>
        </div>
        <Badge variant="info" label={`Rs ${offer.priceDifference.toFixed(0)}`} />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <Badge
          variant="warn"
          icon={<Clock size={12} aria-hidden="true" />}
          label={`Expires in ${countdownLabel(
            offer.seconds_until_expiry ?? offer.secondsUntilExpiry
          )}`}
        />
        <p className="text-meta">{offer.status}</p>
      </div>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={onAccept}>
          Accept Upgrade
        </Button>
        <Button variant="ghost" className="flex-1" onClick={onDecline}>
          Pass
        </Button>
      </div>
    </Card>
  );
}
