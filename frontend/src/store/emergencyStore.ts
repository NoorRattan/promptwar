import { create } from 'zustand';
import { EmergencyState, EvacuationRoute } from '@/types';

interface EmergencyStoreState {
  emergencyState: EmergencyState | null;
  evacuationRoutes: Record<string, EvacuationRoute>;
  isEmergencyActive: boolean;
  isSpeaking: boolean;
}

interface EmergencyStoreActions {
  setEmergencyState: (state: EmergencyState | null) => void;
  setEvacuationRoutes: (routes: Record<string, EvacuationRoute>) => void;
  setSpeaking: (speaking: boolean) => void;
  clearEmergency: () => void;
}

type EmergencyStore = EmergencyStoreState & EmergencyStoreActions;

const initialState: EmergencyStoreState = {
  emergencyState: null,
  evacuationRoutes: {},
  isEmergencyActive: false,
  isSpeaking: false,
};

export const useEmergencyStore = create<EmergencyStore>()((set) => ({
  ...initialState,
  setEmergencyState: (state) =>
    set({
      emergencyState: state,
      isEmergencyActive: state?.is_active ?? false,
    }),
  setEvacuationRoutes: (routes) => set({ evacuationRoutes: routes }),
  setSpeaking: (isSpeaking) => set({ isSpeaking }),
  clearEmergency: () => set(initialState),
}));
