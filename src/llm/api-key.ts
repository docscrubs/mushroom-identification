import type { LLMSettings } from '@/types';
import { DEFAULT_LLM_SETTINGS } from '@/types';
import type { MushroomDB } from '@/db/database';

const SETTINGS_ID = 'default';

/** Save an API key, preserving other settings. */
export async function saveApiKey(db: MushroomDB, apiKey: string): Promise<void> {
  const existing = await db.llmSettings.get(SETTINGS_ID);
  if (existing) {
    await db.llmSettings.update(SETTINGS_ID, { api_key: apiKey });
  } else {
    await db.llmSettings.put({ ...DEFAULT_LLM_SETTINGS, api_key: apiKey });
  }
}

/** Retrieve the user-provided API key from IndexedDB, or null if none stored. */
export async function getApiKey(db: MushroomDB): Promise<string | null> {
  const settings = await db.llmSettings.get(SETTINGS_ID);
  return settings?.api_key || null;
}

/** Remove the stored API key. */
export async function clearApiKey(db: MushroomDB): Promise<void> {
  const existing = await db.llmSettings.get(SETTINGS_ID);
  if (existing) {
    await db.llmSettings.update(SETTINGS_ID, { api_key: '' });
  }
}

/** Always true — even without a user key, the server-side proxy provides a default. */
export async function hasApiKey(_db: MushroomDB): Promise<boolean> {
  return true;
}

/** Retrieve full LLM settings, with defaults for missing fields. */
export async function getSettings(db: MushroomDB): Promise<LLMSettings> {
  const stored = await db.llmSettings.get(SETTINGS_ID);
  if (!stored) {
    return { ...DEFAULT_LLM_SETTINGS, api_key: '' };
  }
  // Merge defaults for any newly added fields (e.g. vision_model for existing installs).
  // Always use the current default endpoint — stored endpoint may be stale after
  // migrating from direct z.ai calls to the serverless proxy.
  return { ...DEFAULT_LLM_SETTINGS, ...stored, endpoint: DEFAULT_LLM_SETTINGS.endpoint };
}

/** Update specific LLM settings, preserving unspecified fields. */
export async function saveSettings(
  db: MushroomDB,
  updates: Partial<Omit<LLMSettings, 'id'>>,
): Promise<void> {
  const existing = await db.llmSettings.get(SETTINGS_ID);
  if (existing) {
    await db.llmSettings.update(SETTINGS_ID, updates);
  } else {
    await db.llmSettings.put({
      ...DEFAULT_LLM_SETTINGS,
      api_key: '',
      ...updates,
    });
  }
}
