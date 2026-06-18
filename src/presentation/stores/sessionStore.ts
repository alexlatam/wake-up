import { create } from 'zustand';

interface SessionStore {
  activeAlarmId: string | null;
  setActiveAlarmId: (id: string | null) => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  activeAlarmId: null,
  setActiveAlarmId: (id) => set({ activeAlarmId: id }),
}));
