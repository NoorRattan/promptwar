import { create } from 'zustand';
import { Queue } from '@/types';

interface QueueState {
  queues: Queue[];
  isLoading: boolean;
  lastUpdated: Date | null;
  error: string | null;
}

interface QueueActions {
  setQueues: (queues: Queue[]) => void;
  updateQueue: (queueId: string, updates: Partial<Queue>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastUpdated: (date: Date | null) => void;
}

type QueueStore = QueueState & QueueActions;

export const useQueueStore = create<QueueStore>()((set) => ({
  queues: [],
  isLoading: false,
  lastUpdated: null,
  error: null,

  setQueues: (queues) =>
    set({ queues, lastUpdated: new Date(), isLoading: false, error: null }),
  updateQueue: (queueId, updates) =>
    set((state) => ({
      queues: state.queues.map((q) => (q.id === queueId ? { ...q, ...updates } : q)),
      lastUpdated: new Date(),
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setLastUpdated: (lastUpdated) => set({ lastUpdated }),
}));
