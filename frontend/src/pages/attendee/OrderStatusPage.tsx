import { MapPin, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { OrderStatusTracker } from '@/components/order/OrderStatusTracker';
import { AttendeeLayout } from '@/components/layout/AttendeeLayout';
import { BackButton, Button, Card, Skeleton, useToast } from '@/components/ui';
import { useOrderStatus } from '@/hooks/useOrderStatus';
import { cancelOrder, getOrder } from '@/lib/api/orders';
import { buildDemoPath } from '@/lib/routing/demo';
import { useAuthStore } from '@/store/authStore';
import { useVenueStore } from '@/store/venueStore';
import type { Order, OrderStatus } from '@/types/order';

export default function OrderStatusPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId = '' } = useParams<{ orderId: string }>();
  const { showToast } = useToast();
  const isAnonymous = useAuthStore((state) => state.isAnonymous);
  const currentVenue = useVenueStore((state) => state.currentVenue);
  const { orderStatus } = useOrderStatus(orderId);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const loadOrder = async (): Promise<void> => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const result = await getOrder(orderId);
        setOrder(result);
      } catch {
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    void loadOrder();
  }, [orderId]);

  const currentStatus = (orderStatus?.status?.toLowerCase() ??
    order?.status ??
    'received') as OrderStatus;
  const pickupZoneName =
    orderStatus?.pickup_zone_name ??
    currentVenue?.zones.find((zone) => zone.id === order?.pickupZoneId)?.name ??
    'Pickup counter';
  const orderCode =
    orderStatus?.order_code ?? order?.orderCode ?? order?.id.slice(0, 6).toUpperCase() ?? '';

  const canCancel = currentStatus === 'received';
  const etaText = useMemo(() => {
    if (!order?.pickupSlot) {
      return 'Next available pickup window';
    }

    return new Date(order.pickupSlot).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  }, [order?.pickupSlot]);

  if (loading) {
    return (
      <AttendeeLayout title="Order Status">
        <div className="page-content-shell">
          <div className="space-y-3">
            <Skeleton variant="card" />
            <Skeleton variant="card" className="h-48" />
          </div>
        </div>
      </AttendeeLayout>
    );
  }

  if (!order) {
    return (
      <AttendeeLayout title="Order Status">
        <div className="page-content-shell">
          <div className="empty-state">
            <XCircle size={28} />
            <p className="text-heading">Order not found</p>
            <p className="text-meta">The requested order could not be loaded.</p>
            <Button
              onClick={() => navigate(buildDemoPath('/order', location.search, isAnonymous))}
            >
              Back to Food
            </Button>
          </div>
        </div>
      </AttendeeLayout>
    );
  }

  return (
    <AttendeeLayout title="Order Status">
      <div className="page-content-shell">
        <div className="page-stack animate-page-enter">
          <BackButton
            to={buildDemoPath('/order', location.search, isAnonymous)}
            label="Back to Food"
          />

          <Card className="p-5 text-center">
            <p className="text-label">Order Code</p>
            <p className="text-display text-mono mt-3">{orderCode}</p>
            <p className="mt-3 text-meta">Show this code at pickup.</p>
          </Card>

          <Card className="p-5">
            <OrderStatusTracker currentStatus={currentStatus} />
          </Card>

          <Card className="p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="page-copy">
                <p className="text-label">Pickup Location</p>
                <p className="text-heading flex items-center gap-2">
                  <MapPin size={14} />
                  {pickupZoneName}
                </p>
              </div>
              <div className="page-copy">
                <p className="text-label">ETA</p>
                <p className="text-heading">{etaText}</p>
              </div>
            </div>
          </Card>

          {canCancel ? (
            <Button
              variant="danger"
              onClick={() => {
                void (async () => {
                  setCancelling(true);
                  try {
                    await cancelOrder(order.id);
                    showToast('success', 'Order cancelled.');
                    navigate(buildDemoPath('/order', location.search, isAnonymous));
                  } catch {
                    showToast('error', 'Order could not be cancelled.');
                  } finally {
                    setCancelling(false);
                  }
                })();
              }}
              isLoading={cancelling}
              loadingLabel="Cancelling..."
            >
              Cancel Order
            </Button>
          ) : null}
        </div>
      </div>
    </AttendeeLayout>
  );
}
