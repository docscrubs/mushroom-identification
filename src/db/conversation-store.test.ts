import 'fake-indexeddb/auto';
import { MushroomDB } from './database';
import {
  createSession,
  getSession,
  updateSession,
  listSessions,
  deleteSession,
} from './conversation-store';

describe('conversation-store', () => {
  let db: MushroomDB;

  beforeEach(() => {
    db = new MushroomDB(`test-conv-${Date.now()}-${Math.random()}`);
  });

  afterEach(async () => {
    await db.delete();
  });

  describe('createSession', () => {
    it('creates a session with active status and empty messages', async () => {
      const session = await createSession(db);
      expect(session.session_id).toBeTruthy();
      expect(session.status).toBe('active');
      expect(session.messages).toEqual([]);
      expect(session.created_at).toBeTruthy();
      expect(session.updated_at).toBeTruthy();
    });

    it('generates unique session IDs', async () => {
      const s1 = await createSession(db);
      const s2 = await createSession(db);
      expect(s1.session_id).not.toBe(s2.session_id);
    });
  });

  describe('getSession', () => {
    it('retrieves a session by ID', async () => {
      const created = await createSession(db);
      const retrieved = await getSession(db, created.session_id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.session_id).toBe(created.session_id);
      expect(retrieved!.status).toBe('active');
    });

    it('returns undefined for nonexistent session', async () => {
      const result = await getSession(db, 'nonexistent');
      expect(result).toBeUndefined();
    });
  });

  describe('updateSession', () => {
    it('updates a session messages array', async () => {
      const session = await createSession(db);
      session.messages.push({
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date().toISOString(),
      });
      await updateSession(db, session);

      const retrieved = await getSession(db, session.session_id);
      expect(retrieved!.messages).toHaveLength(1);
      expect(retrieved!.messages[0]!.content).toBe('Hello');
    });

    it('updates the updated_at timestamp', async () => {
      const session = await createSession(db);
      const originalUpdatedAt = session.updated_at;

      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 10));
      await updateSession(db, session);

      const retrieved = await getSession(db, session.session_id);
      expect(retrieved!.updated_at).not.toBe(originalUpdatedAt);
    });
  });

  describe('listSessions', () => {
    it('returns sessions ordered by updated_at descending', async () => {
      const s1 = await createSession(db);
      await new Promise((r) => setTimeout(r, 10));
      const s2 = await createSession(db);

      const sessions = await listSessions(db);
      expect(sessions).toHaveLength(2);
      // Most recent first
      expect(sessions[0]!.session_id).toBe(s2.session_id);
      expect(sessions[1]!.session_id).toBe(s1.session_id);
    });

    it('filters by status when provided', async () => {
      const s1 = await createSession(db);
      const s2 = await createSession(db);
      s2.status = 'completed';
      await updateSession(db, s2);

      const active = await listSessions(db, 'active');
      expect(active).toHaveLength(1);
      expect(active[0]!.session_id).toBe(s1.session_id);

      const completed = await listSessions(db, 'completed');
      expect(completed).toHaveLength(1);
      expect(completed[0]!.session_id).toBe(s2.session_id);
    });

    it('returns empty array when no sessions', async () => {
      const sessions = await listSessions(db);
      expect(sessions).toEqual([]);
    });
  });

  describe('deleteSession', () => {
    it('removes a session', async () => {
      const session = await createSession(db);
      await deleteSession(db, session.session_id);
      const retrieved = await getSession(db, session.session_id);
      expect(retrieved).toBeUndefined();
    });

    it('does not throw for nonexistent session', async () => {
      await expect(deleteSession(db, 'nonexistent')).resolves.not.toThrow();
    });
  });
});
