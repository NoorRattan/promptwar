import { create } from 'zustand';
import { ZoneDensity, VenueDensitySummary } from '@/types';

interface CrowdState {
  zoneDensities: Record<string, ZoneDensity>;
  venueSummary: VenueDensitySummary | null;
  lastUpdated: Date | null;
  isStale: boolean;
  isLoading: boolean;
  error: string | null;
}

interface CrowdActions {
  setZoneDensities: (zones: ZoneDensity[]) => void;
  updateZoneDensity: (zoneId: string, density: Partial<ZoneDensity>) => void;
  setVenueSummary: (summary: VenueDensitySummary | null) => void;
  markStale: () => void;
  markFresh: () => void;
  clearDensities: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastUpdated: (date: Date | null) => void;
}

type CrowdStore = CrowdState & CrowdActions;

export const useCrowdStore = create<CrowdStore>()((set) => ({
  zoneDensities: {},
  venueSummary: null,
  lastUpdated: null,
  isStale: false,
  isLoading: false,
  error: null,

  setZoneDensities: (zones) => {
    const next: Record<string, ZoneDensity> = {};
    zones.forEach((z) => {
      next[z.zoneId] = z;
    });
    set({ zoneDensities: next, lastUpdated: new Date(), isLoading: false, error: null });
  },

  updateZoneDensity: (zoneId, density) =>
    set((state) => {
      const existing = state.zoneDensities[zoneId];
      if (!existing) return state;

      return {
        zoneDensities: { ...state.zoneDensities, [zoneId]: { ...existing, ...density } },
        lastUpdated: new Date(),
      };
    }),

  setVenueSummary: (summary) => set({ venueSummary: summary, lastUpdated: new Date() }),
  markStale: () => set({ isStale: true }),
  markFresh: () => set({ isStale: false }),
  clearDensities: () =>
    set({ zoneDensities: {}, lastUpdated: null, error: null, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setLastUpdated: (lastUpdated) => set({ lastUpdated }),
}));
