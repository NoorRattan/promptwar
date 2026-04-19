import { create } from 'zustand';

import type { Venue } from '@/types';

interface VenueState {
  venue: Venue | null;
  currentVenue: Venue | null;
  activeVenue: Venue | null;
  currentVenueId: string | null;
  zones: Venue['zones'];
  isLoading: boolean;
  error: string | null;
}

interface VenueActions {
  setVenue: (venue: Venue) => void;
  setCurrentVenue: (venue: Venue | null) => void;
  setZones: (zones: Venue['zones']) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearVenue: () => void;
}

type VenueStore = VenueState & VenueActions;

const initialState: VenueState = {
  venue: null,
  currentVenue: null,
  activeVenue: null,
  currentVenueId: null,
  zones: [],
  isLoading: true,
  error: null,
};

export const useVenueStore = create<VenueStore>()((set) => ({
  ...initialState,
  setVenue: (venue) =>
    set({
      venue,
      currentVenue: venue,
      activeVenue: venue,
      currentVenueId: venue.id,
      zones: venue.zones ?? [],
      isLoading: false,
      error: null,
    }),
  setCurrentVenue: (venue) =>
    set((state) => ({
      venue: venue ?? state.venue,
      currentVenue: venue,
      activeVenue: venue ?? state.activeVenue,
      currentVenueId: venue?.id ?? null,
      zones: venue?.zones ?? state.zones,
      isLoading: false,
      error: null,
    })),
  setZones: (zones) =>
    set((state) => ({
      zones,
      venue: state.venue ? { ...state.venue, zones } : null,
      currentVenue: state.currentVenue ? { ...state.currentVenue, zones } : null,
      activeVenue: state.activeVenue ? { ...state.activeVenue, zones } : null,
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  clearVenue: () => set(initialState),
}));
