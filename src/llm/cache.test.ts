import { MushroomDB } from '@/db/database';
import { getCachedResponse, setCachedResponse, buildCacheKey, clearExpiredCache } from './cache';

describe('LLM Response Cache', () => {
  let db: MushroomDB;

  beforeEach(() => {
    db = new MushroomDB(`test-cache-${Date.now()}-${Math.random()}`);
  });

  describe('buildCacheKey', () => {
    it('produces a deterministic key for the same input', () => {
      const messages = [{ role: 'user' as const, content: 'test message' }];
      const key1 = buildCacheKey(messages);
      const key2 = buildCacheKey(messages);
      expect(key1).toBe(key2);
    });

    it('produces different keys for different inputs', () => {
      const key1 = buildCacheKey([{ role: 'user' as const, content: 'message A' }]);
      const key2 = buildCacheKey([{ role: 'user' as const, content: 'message B' }]);
      expect(key1).not.toBe(key2);
    });

    it('produces different keys when message order differs', () => {
      const key1 = buildCacheKey([
        { role: 'system' as const, content: 'sys' },
        { role: 'user' as const, content: 'usr' },
      ]);
      const key2 = buildCacheKey([
        { role: 'user' as const, content: 'usr' },
        { role: 'system' as const, content: 'sys' },
      ]);
      expect(key1).not.toBe(key2);
    });
  });

  describe('setCachedResponse / getCachedResponse', () => {
    it('stores and retrieves a cached response', async () => {
      await setCachedResponse(db, 'test-key', '{"result": "cached"}');
      const cached = await getCachedResponse(db, 'test-key');
      expect(cached).toBe('{"result": "cached"}');
    });

    it('returns null for a cache miss', async () => {
      const cached = await getCachedResponse(db, 'nonexistent-key');
      expect(cached).toBeNull();
    });

    it('overwrites an existing cache entry', async () => {
      await setCachedResponse(db, 'test-key', 'old-response');
      await setCachedResponse(db, 'test-key', 'new-response');
      const cached = await getCachedResponse(db, 'test-key');
      expect(cached).toBe('new-response');
    });
  });

  describe('cache expiry', () => {
    it('returns null for expired entries', async () => {
      // Store entry with a date 8 days ago
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      await db.llmCache.put({
        cache_key: 'old-key',
        response: 'old response',
        created_at: eightDaysAgo,
      });

      const cached = await getCachedResponse(db, 'old-key');
      expect(cached).toBeNull();
    });

    it('returns valid non-expired entries', async () => {
      // Store entry with a date 1 day ago
      const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
      await db.llmCache.put({
        cache_key: 'recent-key',
        response: 'recent response',
        created_at: oneDayAgo,
      });

      const cached = await getCachedResponse(db, 'recent-key');
      expect(cached).toBe('recent response');
    });
  });

  describe('clearExpiredCache', () => {
    it('removes expired entries', async () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();

      await db.llmCache.bulkPut([
        { cache_key: 'old', response: 'old', created_at: eightDaysAgo },
        { cache_key: 'recent', response: 'recent', created_at: oneDayAgo },
      ]);

      await clearExpiredCache(db);

      const remaining = await db.llmCache.count();
      expect(remaining).toBe(1);
      const kept = await db.llmCache.get('recent');
      expect(kept).toBeDefined();
    });

    it('does nothing when no entries are expired', async () => {
      await db.llmCache.put({
        cache_key: 'fresh',
        response: 'data',
        created_at: new Date().toISOString(),
      });

      await clearExpiredCache(db);
      expect(await db.llmCache.count()).toBe(1);
    });
  });
});
