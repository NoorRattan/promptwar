import { Armchair, RefreshCw, Ticket } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { AttendeeLayout } from '@/components/layout/AttendeeLayout';
import { UpgradeOfferCard } from '@/components/seat/UpgradeOfferCard';
import { BackButton, Button, Card, Skeleton, useToast } from '@/components/ui';
import { acceptUpgrade, declineUpgrade, getSeatUpgrades } from '@/lib/api/seats';
import { useAuthStore } from '@/store/authStore';
import { useSeatStore } from '@/store/seatStore';
import { useVenueStore } from '@/store/venueStore';
import type { SeatUpgrade } from '@/types/seat';

export default function SeatsPage(): JSX.Element {
  const { showToast } = useToast();
  const { user, setAuth } = useAuthStore();
  const currentVenue = useVenueStore((state) => state.currentVenue);
  const { upgradeOffers, setOffers, removeOffer } = useSeatStore();
  const [loading, setLoading] = useState(true);

  const currentSeat = user?.seat_number ?? user?.seatNumber ?? 'A-101';
  const seatDetail = useMemo(() => {
    const [section = 'A', row = '10'] = currentSeat.split('-');
    return {
      section,
      row,
      seat: currentSeat,
    };
  }, [currentSeat]);

  const loadOffers = async (): Promise<void> => {
    if (!currentVenue?.id) {
      setOffers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const offers = await getSeatUpgrades(currentVenue.id);
      setOffers(offers);
    } catch {
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOffers();
  }, [currentVenue?.id]);

  const handleAccept = async (offer: SeatUpgrade): Promise<void> => {
    try {
      await acceptUpgrade(offer.id);
      setAuth({
        ...user,
        seatNumber: offer.toSeat,
        seat_number: offer.toSeat,
        role: user?.role ?? 'attendee',
      });
      removeOffer(offer.id);
      showToast('success', 'Upgrade accepted.');
    } catch {
      showToast('error', 'Upgrade could not be accepted.');
    }
  };

  const handleDecline = async (offer: SeatUpgrade): Promise<void> => {
    try {
      await declineUpgrade(offer.id);
    } finally {
      removeOffer(offer.id);
    }
  };

  return (
    <AttendeeLayout title="Seat">
      <div className="page-content-shell">
        <div className="page-stack animate-page-enter">
          <BackButton />

          <Card className="p-5">
            <p className="text-label">Current Seat</p>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-[18px] bg-[rgba(37,99,235,0.12)] text-[var(--color-accent-light)]">
                <Armchair size={42} />
              </div>
              <div>
                <h1 className="text-display">{seatDetail.seat}</h1>
                <p className="text-body text-[var(--color-text-secondary)]">
                  Section {seatDetail.section} | Row {seatDetail.row}
                </p>
                <p className="mt-1 text-meta">View quality: 4/5</p>
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-between gap-3">
            <div className="page-copy">
              <h2 className="text-title">Available Upgrades</h2>
              <p className="text-meta">Refresh to check for new premium seats.</p>
            </div>
            <Button
              variant="ghost"
              leftIcon={<RefreshCw size={14} />}
              onClick={() => {
                void loadOffers();
              }}
            >
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, index) => (
                <Skeleton key={index} variant="card" />
              ))}
            </div>
          ) : upgradeOffers.length === 0 ? (
            <div className="empty-state">
              <Ticket size={28} />
              <p className="text-heading">No upgrade offers right now</p>
              <p className="text-meta">Check back after the first half.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upgradeOffers.map((offer) => (
                <UpgradeOfferCard
                  key={offer.id}
                  offer={offer}
                  onAccept={() => {
                    void handleAccept(offer);
                  }}
                  onDecline={() => {
                    void handleDecline(offer);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AttendeeLayout>
  );
}
