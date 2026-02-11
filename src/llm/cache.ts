import type { LLMMessage } from '@/types';
import type { MushroomDB } from '@/db/database';

const DEFAULT_TTL_DAYS = 7;

/**
 * Build a deterministic cache key from a messages array.
 * Uses a simple string hash of the serialized messages.
 */
export function buildCacheKey(messages: LLMMessage[]): string {
  const serialized = JSON.stringify(messages);
  return 'llm-' + simpleHash(serialized);
}

/**
 * Retrieve a cached response, or null if not found or expired.
 */
export async function getCachedResponse(
  db: MushroomDB,
  cacheKey: string,
  ttlDays: number = DEFAULT_TTL_DAYS,
): Promise<string | null> {
  const entry = await db.llmCache.get(cacheKey);
  if (!entry) return null;

  const age = Date.now() - new Date(entry.created_at).getTime();
  const maxAge = ttlDays * 24 * 60 * 60 * 1000;
  if (age > maxAge) return null;

  return entry.response;
}

/**
 * Store a response in the cache.
 */
export async function setCachedResponse(
  db: MushroomDB,
  cacheKey: string,
  response: string,
): Promise<void> {
  await db.llmCache.put({
    cache_key: cacheKey,
    response,
    created_at: new Date().toISOString(),
  });
}

/**
 * Remove all expired cache entries.
 */
export async function clearExpiredCache(
  db: MushroomDB,
  ttlDays: number = DEFAULT_TTL_DAYS,
): Promise<void> {
  const cutoff = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000).toISOString();
  await db.llmCache.where('created_at').below(cutoff).delete();
}

/** Simple non-cryptographic string hash (djb2 variant). */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}
