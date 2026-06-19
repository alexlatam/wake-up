import { create } from 'zustand';

interface SessionStore {
  activeAlarmId: string | null;
  setActiveAlarmId: (id: string | null) => void;
  isRinging: boolean;
  setRinging: (value: boolean) => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  activeAlarmId: null,
  setActiveAlarmId: (id) => set({ activeAlarmId: id }),
  isRinging: false,
  setRinging: (value) => set({ isRinging: value }),
}));
