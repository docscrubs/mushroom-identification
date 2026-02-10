import { create } from 'zustand';

const BACKUP_SESSION_THRESHOLD = 10;
const BACKUP_DAYS_THRESHOLD = 30;

interface AppState {
  isInitialized: boolean;
  isOnline: boolean;
  activeSessionId: string | null;
  lastBackupDate: string | null;
  sessionsSinceBackup: number;
  backupReminderDismissedAt: string | null;

  setInitialized: () => void;
  setOnline: (online: boolean) => void;
  startSession: () => void;
  endSession: () => void;
  recordBackup: () => void;
  isBackupNeeded: () => boolean;
  dismissBackupReminder: () => void;
}

export const useAppStore = create<AppState>()((set, get) => ({
  isInitialized: false,
  isOnline: true,
  activeSessionId: null,
  lastBackupDate: null,
  sessionsSinceBackup: 0,
  backupReminderDismissedAt: null,

  setInitialized: () => set({ isInitialized: true }),

  setOnline: (online) => set({ isOnline: online }),

  startSession: () =>
    set({ activeSessionId: `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` }),

  endSession: () =>
    set((state) => ({
      activeSessionId: null,
      sessionsSinceBackup: state.sessionsSinceBackup + 1,
      backupReminderDismissedAt: null,
    })),

  recordBackup: () =>
    set({
      lastBackupDate: new Date().toISOString(),
      sessionsSinceBackup: 0,
    }),

  isBackupNeeded: () => {
    const { sessionsSinceBackup, lastBackupDate } = get();

    // Session count threshold
    if (sessionsSinceBackup >= BACKUP_SESSION_THRESHOLD) return true;

    // 30-day threshold (only if a backup has been made before)
    if (lastBackupDate) {
      const daysSinceBackup = (Date.now() - new Date(lastBackupDate).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceBackup >= BACKUP_DAYS_THRESHOLD) return true;
    }

    return false;
  },

  dismissBackupReminder: () =>
    set({ backupReminderDismissedAt: new Date().toISOString() }),
}));
