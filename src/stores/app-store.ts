import { create } from 'zustand';

const BACKUP_SESSION_THRESHOLD = 10;

interface AppState {
  isInitialized: boolean;
  isOnline: boolean;
  activeSessionId: string | null;
  lastBackupDate: string | null;
  sessionsSinceBackup: number;

  setInitialized: () => void;
  setOnline: (online: boolean) => void;
  startSession: () => void;
  endSession: () => void;
  recordBackup: () => void;
  isBackupNeeded: () => boolean;
}

export const useAppStore = create<AppState>()((set, get) => ({
  isInitialized: false,
  isOnline: true,
  activeSessionId: null,
  lastBackupDate: null,
  sessionsSinceBackup: 0,

  setInitialized: () => set({ isInitialized: true }),

  setOnline: (online) => set({ isOnline: online }),

  startSession: () =>
    set({ activeSessionId: `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` }),

  endSession: () =>
    set((state) => ({
      activeSessionId: null,
      sessionsSinceBackup: state.sessionsSinceBackup + 1,
    })),

  recordBackup: () =>
    set({
      lastBackupDate: new Date().toISOString(),
      sessionsSinceBackup: 0,
    }),

  isBackupNeeded: () => get().sessionsSinceBackup >= BACKUP_SESSION_THRESHOLD,
}));
