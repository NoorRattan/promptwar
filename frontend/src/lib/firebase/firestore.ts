import { collection, doc, onSnapshot, query } from 'firebase/firestore';

import { db } from './config';
import type { FirestoreEmergencyDoc } from '@/types/emergency';
import type { ZoneDensity } from '@/types/crowd';

export interface FirestoreZoneDensity extends ZoneDensity {}

export function subscribeToVenueDensity(
  venueId: string,
  onData: (zones: Map<string, FirestoreZoneDensity>) => void,
  onError: (error: Error) => void
): () => void {
  const densityQuery = query(collection(db, `crowd_density/${venueId}/zones`));
  return onSnapshot(
    densityQuery,
    (snapshot) => {
      const zones = new Map<string, FirestoreZoneDensity>();
      snapshot.forEach((docSnapshot) => {
        zones.set(docSnapshot.id, docSnapshot.data() as FirestoreZoneDensity);
      });
      onData(zones);
    },
    onError
  );
}

export function subscribeToEmergency(
  venueId: string,
  onData: (state: FirestoreEmergencyDoc | null) => void,
  onError: (error: Error) => void
): () => void {
  return onSnapshot(
    doc(db, `emergency/${venueId}`),
    (snapshot) => {
      onData(snapshot.exists() ? (snapshot.data() as FirestoreEmergencyDoc) : null);
    },
    onError
  );
}

export function subscribeToQueueStates(
  venueId: string,
  onData: (queues: Map<string, Record<string, unknown>>) => void,
  onError: (error: Error) => void
): () => void {
  const queueQuery = query(collection(db, `queue_states/${venueId}/queues`));
  return onSnapshot(
    queueQuery,
    (snapshot) => {
      const queues = new Map<string, Record<string, unknown>>();
      snapshot.forEach((docSnapshot) => {
        queues.set(docSnapshot.id, docSnapshot.data() as Record<string, unknown>);
      });
      onData(queues);
    },
    onError
  );
}

export function subscribeToOrderState(
  orderId: string,
  onData: (state: Record<string, unknown> | null) => void,
  onError: (error: Error) => void
): () => void {
  return onSnapshot(
    doc(db, `order_states/${orderId}`),
    (snapshot) => {
      onData(snapshot.exists() ? (snapshot.data() as Record<string, unknown>) : null);
    },
    onError
  );
}
