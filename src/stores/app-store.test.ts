import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './app-store';

describe('AppStore', () => {
  beforeEach(() => {
    // Reset the store between tests
    useAppStore.setState(useAppStore.getInitialState());
  });

  describe('initialization', () => {
    it('starts with isInitialized false', () => {
      expect(useAppStore.getState().isInitialized).toBe(false);
    });

    it('starts with isOnline true (default assumption)', () => {
      expect(useAppStore.getState().isOnline).toBe(true);
    });

    it('starts with no active session', () => {
      expect(useAppStore.getState().activeSessionId).toBeNull();
    });
  });

  describe('setInitialized', () => {
    it('marks the app as initialized', () => {
      useAppStore.getState().setInitialized();
      expect(useAppStore.getState().isInitialized).toBe(true);
    });
  });

  describe('setOnline', () => {
    it('sets online status', () => {
      useAppStore.getState().setOnline(false);
      expect(useAppStore.getState().isOnline).toBe(false);

      useAppStore.getState().setOnline(true);
      expect(useAppStore.getState().isOnline).toBe(true);
    });
  });

  describe('session management', () => {
    it('starts a new session with a generated ID', () => {
      useAppStore.getState().startSession();
      const id = useAppStore.getState().activeSessionId;
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
    });

    it('generates unique session IDs', () => {
      useAppStore.getState().startSession();
      const id1 = useAppStore.getState().activeSessionId;

      useAppStore.getState().endSession();
      useAppStore.getState().startSession();
      const id2 = useAppStore.getState().activeSessionId;

      expect(id1).not.toBe(id2);
    });

    it('ends the current session', () => {
      useAppStore.getState().startSession();
      expect(useAppStore.getState().activeSessionId).toBeTruthy();

      useAppStore.getState().endSession();
      expect(useAppStore.getState().activeSessionId).toBeNull();
    });
  });

  describe('backup tracking', () => {
    it('starts with no last backup date', () => {
      expect(useAppStore.getState().lastBackupDate).toBeNull();
    });

    it('starts with zero sessions since backup', () => {
      expect(useAppStore.getState().sessionsSinceBackup).toBe(0);
    });

    it('increments sessions since backup when a session ends', () => {
      useAppStore.getState().startSession();
      useAppStore.getState().endSession();
      expect(useAppStore.getState().sessionsSinceBackup).toBe(1);

      useAppStore.getState().startSession();
      useAppStore.getState().endSession();
      expect(useAppStore.getState().sessionsSinceBackup).toBe(2);
    });

    it('records backup and resets counter', () => {
      useAppStore.getState().startSession();
      useAppStore.getState().endSession();
      useAppStore.getState().startSession();
      useAppStore.getState().endSession();

      useAppStore.getState().recordBackup();
      expect(useAppStore.getState().sessionsSinceBackup).toBe(0);
      expect(useAppStore.getState().lastBackupDate).toBeTruthy();
    });

    it('reports backup needed after 10 sessions', () => {
      for (let i = 0; i < 10; i++) {
        useAppStore.getState().startSession();
        useAppStore.getState().endSession();
      }
      expect(useAppStore.getState().isBackupNeeded()).toBe(true);
    });

    it('does not report backup needed with few sessions', () => {
      for (let i = 0; i < 3; i++) {
        useAppStore.getState().startSession();
        useAppStore.getState().endSession();
      }
      expect(useAppStore.getState().isBackupNeeded()).toBe(false);
    });
  });
});
