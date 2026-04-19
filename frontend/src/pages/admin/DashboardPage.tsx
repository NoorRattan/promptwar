import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { DEMO_VENUE } from '@/data/demoData';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card } from '@/components/ui';
import { useCrowdDensity } from '@/hooks/useCrowdDensity';
import { useQueueState } from '@/hooks/useQueueState';
import apiClient from '@/lib/api/client';
import { useVenueStore } from '@/store/venueStore';
import type { Order } from '@/types/order';

export default function DashboardPage(): JSX.Element {
  const currentVenue = useVenueStore((state) => state.currentVenue);
  const { zones } = useCrowdDensity(currentVenue?.id ?? null);
  const { queues } = useQueueState(currentVenue?.id ?? null);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const loadOrders = async (): Promise<void> => {
      if (!currentVenue?.id || currentVenue.id === DEMO_VENUE.id) {
        setOrders([]);
        return;
      }

      try {
        const response = await apiClient.get<Order[]>('/orders', {
          params: { venue_id: currentVenue.id },
        });
        setOrders(response.data);
      } catch {
        setOrders([]);
      }
    };

    void loadOrders();
  }, [currentVenue?.id]);

  const totalAttendees = useMemo(
    () => zones.reduce((sum, zone) => sum + zone.count, 0),
    [zones]
  );
  const openQueues = useMemo(
    () => queues.filter((queue) => queue.is_open ?? queue.isOpen).length,
    [queues]
  );
  const crowdAlerts = useMemo(
    () => zones.filter((zone) => zone.level === 'HIGH' || zone.level === 'CRITICAL').length,
    [zones]
  );
  const todayOrders = orders.length;

  return (
    <AdminLayout title="Dashboard">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total attendees', value: totalAttendees.toString() },
          { label: 'Open queues', value: openQueues.toString() },
          { label: 'Crowd alerts', value: crowdAlerts.toString() },
          { label: "Today's orders", value: todayOrders.toString() },
        ].map((item) => (
          <Card key={item.label} className="p-5">
            <p className="text-label">{item.label}</p>
            <p className="mt-3 text-display">{item.value}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-5 p-5">
        <div className="page-copy mb-4">
          <h2 className="text-title">Quick Links</h2>
          <p className="text-meta">Jump to the live control surfaces for this venue.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            { to: '/admin/heatmap', label: 'Crowd Heatmap' },
            { to: '/admin/queues', label: 'Queue Controls' },
            { to: '/admin/orders', label: 'Order Operations' },
            { to: '/admin/emergency', label: 'Emergency Controls' },
          ].map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="surface-card interactive rounded-[16px] px-4 py-4 text-heading"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </Card>
    </AdminLayout>
  );
}
