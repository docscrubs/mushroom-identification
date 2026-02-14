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

  // LLM state
  hasApiKey: boolean;
  llmLoading: boolean;
  llmError: string | null;

  // Conversation state
  activeConversationId: string | null;

  setInitialized: () => void;
  setOnline: (online: boolean) => void;
  startSession: () => void;
  endSession: () => void;
  recordBackup: () => void;
  isBackupNeeded: () => boolean;
  dismissBackupReminder: () => void;

  // LLM actions
  setHasApiKey: (has: boolean) => void;
  setLlmLoading: (loading: boolean) => void;
  setLlmError: (error: string | null) => void;

  // Conversation actions
  setActiveConversationId: (id: string | null) => void;
  startConversation: (id: string) => void;
  endConversation: () => void;
}

export const useAppStore = create<AppState>()((set, get) => ({
  isInitialized: false,
  isOnline: true,
  activeSessionId: null,
  lastBackupDate: null,
  sessionsSinceBackup: 0,
  backupReminderDismissedAt: null,

  // LLM state defaults
  hasApiKey: true,
  llmLoading: false,
  llmError: null,

  // Conversation state defaults
  activeConversationId: null,

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

  // LLM actions
  setHasApiKey: (has) => set({ hasApiKey: has }),
  setLlmLoading: (loading) => set({ llmLoading: loading }),
  setLlmError: (error) => set({ llmError: error }),

  // Conversation actions
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  startConversation: (id) => set({ activeConversationId: id }),
  endConversation: () =>
    set((state) => ({
      activeConversationId: null,
      sessionsSinceBackup: state.sessionsSinceBackup + 1,
      backupReminderDismissedAt: null,
    })),
}));
