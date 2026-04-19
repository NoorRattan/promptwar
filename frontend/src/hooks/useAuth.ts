import { useEffect } from 'react';
import axios from 'axios';

import { registerUser, updateFCMToken } from '@/lib/api/auth';
import { onAuthChange } from '@/lib/firebase/auth';
import { requestFCMPermission } from '@/lib/firebase/messaging';
import { useAuthStore } from '@/store/authStore';

export function useAuth(): void {
  const { clearAuth, setAuth, setLoading } = useAuthStore();

  useEffect(() => {
    setLoading(true);

    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (!firebaseUser) {
        clearAuth();
        setLoading(false);
        return;
      }

      if (firebaseUser.isAnonymous) {
        setAuth({
          uid: firebaseUser.uid,
          token: await firebaseUser.getIdToken().catch(() => ''),
          email: 'guest',
          fullName: 'Guest',
          full_name: 'Guest',
          role: 'attendee',
          preferredLanguage: 'en',
          preferred_language: 'en',
          venueId: null,
          venue_id: null,
          seatNumber: null,
          seat_number: null,
          isAnonymous: true,
        });
        setLoading(false);
        return;
      }

      try {
        const token = await firebaseUser.getIdToken(true);
        const registeredUser = await registerUser({
          email: firebaseUser.email ?? '',
          fullName: firebaseUser.displayName ?? firebaseUser.email?.split('@')[0] ?? 'CrowdIQ User',
          preferredLanguage: 'en',
        });

        setAuth({
          uid: firebaseUser.uid,
          token,
          email: registeredUser.email,
          fullName: registeredUser.full_name ?? registeredUser.fullName ?? null,
          full_name: registeredUser.full_name ?? registeredUser.fullName ?? null,
          role: registeredUser.role,
          preferredLanguage:
            registeredUser.preferred_language ?? registeredUser.preferredLanguage ?? 'en',
          preferred_language:
            registeredUser.preferred_language ?? registeredUser.preferredLanguage ?? 'en',
          venueId: registeredUser.venue_id ?? registeredUser.venueId ?? null,
          venue_id: registeredUser.venue_id ?? registeredUser.venueId ?? null,
          seatNumber: registeredUser.seat_number ?? registeredUser.seatNumber ?? null,
          seat_number: registeredUser.seat_number ?? registeredUser.seatNumber ?? null,
          isAnonymous: false,
        });

        const fcmToken = await requestFCMPermission();
        if (fcmToken) {
          await updateFCMToken(fcmToken);
        }
      } catch (error) {
        if (!axios.isAxiosError(error)) {
          console.warn('[useAuth] Unexpected auth sync error', error);
        }

        setAuth({
          uid: firebaseUser.uid,
          token: await firebaseUser.getIdToken().catch(() => ''),
          email: firebaseUser.email ?? '',
          fullName: firebaseUser.displayName ?? null,
          full_name: firebaseUser.displayName ?? null,
          role: 'attendee',
          preferredLanguage: 'en',
          preferred_language: 'en',
          venueId: null,
          venue_id: null,
          seatNumber: null,
          seat_number: null,
          isAnonymous: false,
        });
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [clearAuth, setAuth, setLoading]);
}
