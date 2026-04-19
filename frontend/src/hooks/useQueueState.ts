import { useEffect, useRef } from 'react';
import { getAuth } from 'firebase/auth';
import { collection, onSnapshot, type FirestoreError } from 'firebase/firestore';

import { useToast } from '@/components/ui';
import { DEMO_VENUE, getDemoQueues } from '@/data/demoData';
import { cachedGet } from '@/lib/api/client';
import { db } from '@/lib/firebase/config';
import { isDemoSearch } from '@/lib/routing/demo';
import { useAuthStore } from '@/store/authStore';
import { useQueueStore } from '@/store/queueStore';
import type { QueueState } from '@/types/queue';

interface QueueAlertPreference {
  threshold: number;
  queueName: string;
}

type QueueAlertMap = Record<string, QueueAlertPreference>;

function readQueueAlerts(): QueueAlertMap {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const rawAlerts = window.localStorage.getItem('crowdiq_alerts');
    if (!rawAlerts) {
      return {};
    }

    const parsedAlerts = JSON.parse(rawAlerts) as unknown;
    if (typeof parsedAlerts !== 'object' || parsedAlerts === null) {
      return {};
    }

    return parsedAlerts as QueueAlertMap;
  } catch {
    return {};
  }
}

function writeQueueAlerts(alerts: QueueAlertMap): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem('crowdiq_alerts', JSON.stringify(alerts));
}

function mapApiQueue(queue: Record<string, unknown>): QueueState {
  const wait = Number(queue.estimated_wait_minutes ?? queue.wait_minutes ?? 0);
  const queueType = String(queue.queue_type ?? queue.queueType ?? 'food').toLowerCase();

  return {
    id: String(queue.id),
    venueId: String(queue.venue_id ?? queue.venueId ?? ''),
    venue_id: String(queue.venue_id ?? queue.venueId ?? ''),
    zoneId: queue.zone_id ? String(queue.zone_id) : null,
    zone_id: queue.zone_id ? String(queue.zone_id) : null,
    name: String(queue.name ?? 'Queue'),
    queueType: queueType as QueueState['queueType'],
    queue_type: queueType as QueueState['queueType'],
    isOpen: Boolean(queue.is_open ?? queue.isOpen ?? true),
    is_open: Boolean(queue.is_open ?? queue.isOpen ?? true),
    estimatedWaitMinutes: wait,
    estimated_wait_minutes: wait,
    wait_minutes: wait,
    currentLength: Number(queue.current_length ?? queue.currentLength ?? 0),
    current_length: Number(queue.current_length ?? queue.currentLength ?? 0),
    throughputPerMinute:
      queue.throughput_per_minute === null || queue.throughput_per_minute === undefined
        ? null
        : Number(queue.throughput_per_minute),
    annotation: typeof queue.annotation === 'string' ? queue.annotation : null,
    lastUpdated: typeof queue.last_updated === 'string' ? queue.last_updated : null,
    last_updated: typeof queue.last_updated === 'string' ? queue.last_updated : null,
  };
}

function mapFirestoreQueue(venueId: string, docId: string, data: Record<string, unknown>): QueueState {
  const wait = Number(data.estimated_wait_minutes ?? data.wait_minutes ?? 0);
  const timestamp =
    data.updated_at && typeof data.updated_at === 'object' && 'toDate' in data.updated_at
      ? (data.updated_at as { toDate: () => Date }).toDate().toISOString()
      : null;
  const queueType = String(data.queue_type ?? 'food').toLowerCase();

  return {
    id: docId,
    venueId,
    venue_id: venueId,
    zoneId: data.zone_id ? String(data.zone_id) : null,
    zone_id: data.zone_id ? String(data.zone_id) : null,
    name: String(data.name ?? 'Queue'),
    queueType: queueType as QueueState['queueType'],
    queue_type: queueType as QueueState['queueType'],
    isOpen: Boolean(data.is_open ?? true),
    is_open: Boolean(data.is_open ?? true),
    estimatedWaitMinutes: wait,
    estimated_wait_minutes: wait,
    wait_minutes: wait,
    currentLength: Number(data.current_length ?? 0),
    current_length: Number(data.current_length ?? 0),
    throughputPerMinute:
      data.throughput_per_minute === null || data.throughput_per_minute === undefined
        ? null
        : Number(data.throughput_per_minute),
    annotation: typeof data.annotation === 'string' ? data.annotation : null,
    lastUpdated: timestamp,
    last_updated: timestamp,
  };
}

async function fetchQueuesFallback(venueId: string): Promise<QueueState[]> {
  const payload = await cachedGet<{ items?: unknown[]; queues?: unknown[] } | unknown[]>(
    '/queues',
    { venue_id: venueId },
    10_000
  );

  const queueItems = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.queues)
      ? payload.queues
      : Array.isArray(payload.items)
        ? payload.items
        : [];

  return queueItems.map((queue) => mapApiQueue(queue as Record<string, unknown>));
}

export function useQueueState(venueId: string | null): {
  queues: QueueState[];
  isLoading: boolean;
  error: string | null;
} {
  const isMounted = useRef(true);
  const isAnonymous = useAuthStore((state) => state.isAnonymous);
  const isDemoMode = isDemoSearch(window.location.search);
  const { queues, isLoading, error } = useQueueStore();
  const { showToast } = useToast();

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const queueState = useQueueStore.getState();

    if (!venueId) {
      queueState.setQueues([]);
      queueState.setLoading(false);
      return;
    }

    const auth = getAuth();
    const isAnonymousSession = auth.currentUser?.isAnonymous ?? isAnonymous;
    const useBundledDemoData =
      isAnonymousSession || isDemoMode || venueId === DEMO_VENUE.id;

    if (useBundledDemoData) {
      queueState.setQueues(getDemoQueues(venueId));
      queueState.setLoading(false);
      return;
    }

    queueState.setLoading(true);
    queueState.setError(null);

    const queueRef = collection(db, 'queue_states', venueId, 'queues');
    const unsubscribe = onSnapshot(
      queueRef,
      async (snapshot) => {
        if (!isMounted.current) {
          return;
        }

        try {
          if (snapshot.empty) {
            const fallbackQueues = await fetchQueuesFallback(venueId);
            if (isMounted.current) {
              useQueueStore.getState().setQueues(fallbackQueues);
            }
            return;
          }

          const mappedQueues = snapshot.docs.map((docSnapshot) =>
            mapFirestoreQueue(venueId, docSnapshot.id, docSnapshot.data())
          );
          useQueueStore.getState().setQueues(mappedQueues);
        } catch (fallbackError) {
          console.warn('[useQueueState] Queue fallback failed', fallbackError);
          useQueueStore.getState().setQueues([]);
          useQueueStore.getState().setError('Queue data unavailable');
          useQueueStore.getState().setLoading(false);
        }
      },
      async (snapshotError: FirestoreError) => {
        if (!isMounted.current) {
          return;
        }

        console.warn('[useQueueState] Firestore queue read failed; using REST fallback', snapshotError);
        try {
          const fallbackQueues = await fetchQueuesFallback(venueId);
          if (isMounted.current) {
            useQueueStore.getState().setQueues(fallbackQueues);
          }
        } catch (fallbackError) {
          console.warn('[useQueueState] Queue REST fallback failed', fallbackError);
          useQueueStore.getState().setQueues([]);
          useQueueStore.getState().setError('Queue data unavailable');
          useQueueStore.getState().setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [isAnonymous, isDemoMode, venueId]);

  useEffect(() => {
    if (!queues.length) {
      return;
    }

    const alerts = readQueueAlerts();
    let alertsChanged = false;

    queues.forEach((queue) => {
      const alertPreference = alerts[queue.id];
      const waitMinutes =
        queue.wait_minutes ?? queue.estimated_wait_minutes ?? queue.estimatedWaitMinutes ?? 0;

      if (!alertPreference || waitMinutes > alertPreference.threshold) {
        return;
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`Queue Alert: ${queue.name}`, {
          body: `Wait time is now ${waitMinutes} min - head over now!`,
          icon: '/favicon.svg',
        });
      } else {
        showToast(
          'info',
          `Queue alert: ${queue.name} is now ${waitMinutes} min. Time to head over.`
        );
      }

      delete alerts[queue.id];
      alertsChanged = true;
    });

    if (alertsChanged) {
      writeQueueAlerts(alerts);
    }
  }, [queues, showToast]);

  return { queues, isLoading, error };
}
