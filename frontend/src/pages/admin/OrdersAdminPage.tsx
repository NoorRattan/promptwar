import { useEffect, useMemo, useState } from 'react';

import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button, Card } from '@/components/ui';
import { updateOrderStatus } from '@/lib/api/orders';
import apiClient from '@/lib/api/client';
import { useVenueStore } from '@/store/venueStore';
import type { Order } from '@/types/order';

const STATUSES = ['confirmed', 'preparing', 'ready', 'collected'] as const;

export default function OrdersAdminPage(): JSX.Element {
  const currentVenue = useVenueStore((state) => state.currentVenue);
  const [orders, setOrders] = useState<Order[]>([]);

  const loadOrders = async (): Promise<void> => {
    if (!currentVenue?.id) {
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

  useEffect(() => {
    void loadOrders();
  }, [currentVenue?.id]);

  const totalRevenue = useMemo(
    () => orders.reduce((sum, order) => sum + order.totalPrice, 0),
    [orders]
  );

  return (
    <AdminLayout title="Orders">
      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-label">Total orders</p>
          <p className="mt-3 text-display">{orders.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-label">Total revenue</p>
          <p className="mt-3 text-display">Rs {totalRevenue.toFixed(0)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-label">Avg prep time</p>
          <p className="mt-3 text-display">0 min</p>
        </Card>
      </div>

      <div className="space-y-3">
        {orders.length === 0 ? (
          <Card className="p-5">
            <p className="text-meta">No active orders for this venue.</p>
          </Card>
        ) : (
          orders.map((order) => (
            <Card key={order.id} className="p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-label">Order</p>
                  <p className="text-title">{order.orderCode}</p>
                  <p className="text-meta">Status: {order.status}</p>
                </div>
                <p className="text-heading">Rs {order.totalPrice.toFixed(0)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((status) => (
                  <Button
                    key={status}
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      void updateOrderStatus(order.id, status).then(() => loadOrders());
                    }}
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </Card>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
