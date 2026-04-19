import { useEffect, useState } from 'react';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card } from '@/components/ui';
import { getSeatUpgrades } from '@/lib/api/seats';
import { useVenueStore } from '@/store/venueStore';
import type { SeatUpgrade } from '@/types/seat';

export default function SeatsAdminPage(): JSX.Element {
  const currentVenue = useVenueStore((state) => state.currentVenue);
  const [offers, setOffers] = useState<SeatUpgrade[]>([]);

  useEffect(() => {
    const loadOffers = async (): Promise<void> => {
      if (!currentVenue?.id) {
        return;
      }

      try {
        const result = await getSeatUpgrades(currentVenue.id);
        setOffers(result);
      } catch {
        setOffers([]);
      }
    };

    void loadOffers();
  }, [currentVenue?.id]);

  return (
    <AdminLayout title="Seats">
      <Card className="overflow-hidden p-0">
        <div className="table-shell">
          <table className="table-grid">
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Price</th>
                <th>Status</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((offer) => (
                <tr key={offer.id}>
                  <td>{offer.fromSeat}</td>
                  <td>{offer.toSeat}</td>
                  <td>Rs {offer.priceDifference.toFixed(0)}</td>
                  <td>{offer.status}</td>
                  <td>{offer.expiresAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminLayout>
  );
}
