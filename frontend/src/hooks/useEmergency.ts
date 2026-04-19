import { useEffect, useRef } from 'react';
import { doc, onSnapshot, type FirestoreError } from 'firebase/firestore';

import { db } from '@/lib/firebase/config';
import { useEmergencyStore } from '@/store/emergencyStore';
import type { EmergencyState } from '@/types/emergency';

export function useEmergency(venueId: string | null): { emergencyState: EmergencyState | null } {
  const isMounted = useRef(true);
  const emergencyState = useEmergencyStore((state) => state.emergencyState);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!venueId) {
      useEmergencyStore.getState().clearEmergency();
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'emergency', venueId),
      (snapshot) => {
        if (!isMounted.current) {
          return;
        }
        if (!snapshot.exists()) {
          useEmergencyStore.getState().setEmergencyState(null);
          return;
        }
        useEmergencyStore.getState().setEmergencyState(snapshot.data() as EmergencyState);
      },
      (snapshotError: FirestoreError) => {
        if (!isMounted.current) {
          return;
        }
        console.warn('[useEmergency] Firestore error:', snapshotError);
      }
    );

    return () => {
      isMounted.current = false;
      unsubscribe();
    };
  }, [venueId]);

  return { emergencyState };
}
