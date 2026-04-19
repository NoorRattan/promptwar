import { create } from 'zustand';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  firebaseUid: string | null;
  idToken: string | null;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  setUser: (user: User | null, isAnonymous?: boolean) => void;
  setAuth: (auth: Partial<User> & { uid?: string; token?: string; role?: User['role']; isAnonymous?: boolean }) => void;
  clearAuth: () => void;
  setFirebaseUid: (uid: string | null) => void;
  setIdToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  firebaseUid: null,
  idToken: null,
  isAuthenticated: false,
  isAnonymous: false,
  isLoading: true,
  error: null,
};

export const useAuthStore = create<AuthStore>()((set) => ({
  ...initialState,
  setUser: (user, isAnonymous = false) =>
    set({
      user: user
        ? {
            ...user,
            uid: user.uid ?? user.id,
            full_name: user.full_name ?? user.fullName,
            preferred_language: user.preferred_language ?? user.preferredLanguage,
            venue_id: user.venue_id ?? user.venueId,
            seat_number: user.seat_number ?? user.seatNumber,
          }
        : null,
      isAuthenticated: user !== null,
      isAnonymous,
      isLoading: false,
      error: null,
    }),
  setAuth: ({
    uid,
    token,
    role = 'attendee',
    isAnonymous = false,
    email = '',
    fullName,
    full_name,
    preferredLanguage,
    preferred_language,
    seatNumber,
    seat_number,
    venueId,
    venue_id,
  }) =>
    set((state) => ({
      firebaseUid: uid ?? state.firebaseUid,
      idToken: token ?? state.idToken,
      user: {
        id: uid ?? state.user?.id ?? 'current-user',
        uid: uid ?? state.firebaseUid ?? undefined,
        email: email || state.user?.email || '',
        fullName: fullName ?? full_name ?? state.user?.fullName ?? null,
        full_name: full_name ?? fullName ?? state.user?.full_name ?? null,
        role,
        preferredLanguage:
          preferredLanguage ?? preferred_language ?? state.user?.preferredLanguage ?? 'en',
        preferred_language:
          preferred_language ?? preferredLanguage ?? state.user?.preferred_language ?? state.user?.preferredLanguage ?? 'en',
        venueId: venueId ?? venue_id ?? state.user?.venueId ?? null,
        venue_id: venue_id ?? venueId ?? state.user?.venue_id ?? null,
        seatNumber: seatNumber ?? seat_number ?? state.user?.seatNumber ?? null,
        seat_number: seat_number ?? seatNumber ?? state.user?.seat_number ?? null,
        createdAt: state.user?.createdAt ?? new Date().toISOString(),
      },
      isAuthenticated: true,
      isAnonymous,
      isLoading: false,
      error: null,
    })),
  clearAuth: () =>
    set({
      user: null,
      firebaseUid: null,
      idToken: null,
      isAuthenticated: false,
      isAnonymous: false,
      isLoading: false,
      error: null,
    }),
  setFirebaseUid: (firebaseUid) => set({ firebaseUid }),
  setIdToken: (idToken) => set({ idToken }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  logout: () => set(initialState),
}));
