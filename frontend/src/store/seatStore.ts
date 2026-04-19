import { create } from 'zustand';
import { SeatUpgrade } from '@/types';

interface SeatState {
  upgrades: SeatUpgrade[];
  upgradeOffers: SeatUpgrade[];
  isLoading: boolean;
}

interface SeatActions {
  setUpgrades: (upgrades: SeatUpgrade[]) => void;
  setOffers: (upgrades: SeatUpgrade[]) => void;
  removeUpgrade: (upgradeId: string) => void;
  removeOffer: (upgradeId: string) => void;
  setLoading: (loading: boolean) => void;
}

type SeatStore = SeatState & SeatActions;

export const useSeatStore = create<SeatStore>()((set) => ({
  upgrades: [],
  upgradeOffers: [],
  isLoading: false,

  setUpgrades: (upgrades) => set({ upgrades, upgradeOffers: upgrades }),
  setOffers: (upgrades) => set({ upgrades, upgradeOffers: upgrades }),
  removeUpgrade: (upgradeId) =>
    set((state) => {
      const next = state.upgrades.filter((u) => u.id !== upgradeId);
      return { upgrades: next, upgradeOffers: next };
    }),
  removeOffer: (upgradeId) =>
    set((state) => {
      const next = state.upgradeOffers.filter((u) => u.id !== upgradeId);
      return { upgrades: next, upgradeOffers: next };
    }),
  setLoading: (isLoading) => set({ isLoading }),
}));
