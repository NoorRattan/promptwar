/**
 * Subscribes to a single order's real-time status from Firestore.
 * Returns local state (not global store) — specific to one order view.
 * @param orderId - Order UUID string or null if no active order
 */
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { OrderStatusState } from '@/types/order';

export function useOrderStatus(orderId: string | null): {
  order: OrderStatusState | null;
  status: string | null;
  orderStatus: OrderStatusState | null;
  isLoading: boolean;
  error: string | null;
} {
  const [orderStatus, setOrderStatus] = useState<OrderStatusState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setIsLoading(false);
      setOrderStatus(null);
      return;
    }
    
    setIsLoading(true);
    const orderRef = doc(db, 'order_states', orderId);
    
    const unsubscribe = onSnapshot(
      orderRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setError('Order not found.');
          setIsLoading(false);
          return;
        }
        setOrderStatus(snapshot.data() as OrderStatusState);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [orderId]);

  return {
    order: orderStatus,
    status: orderStatus?.status ?? null,
    orderStatus,
    isLoading,
    error,
  };
}
