import { MushroomDB } from '@/db/database';
import { saveApiKey, getApiKey, clearApiKey, hasApiKey, getSettings, saveSettings } from './api-key';
import { DEFAULT_LLM_SETTINGS } from '@/types';

describe('API Key Management', () => {
  let db: MushroomDB;

  beforeEach(() => {
    db = new MushroomDB(`test-apikey-${Date.now()}-${Math.random()}`);
  });

  describe('saveApiKey / getApiKey', () => {
    it('saves and retrieves an API key', async () => {
      await saveApiKey(db, 'sk-test-key-123');
      const key = await getApiKey(db);
      expect(key).toBe('sk-test-key-123');
    });

    it('returns null when no key is stored', async () => {
      const key = await getApiKey(db);
      expect(key).toBeNull();
    });

    it('overwrites an existing key', async () => {
      await saveApiKey(db, 'sk-old-key');
      await saveApiKey(db, 'sk-new-key');
      const key = await getApiKey(db);
      expect(key).toBe('sk-new-key');
    });
  });

  describe('clearApiKey', () => {
    it('removes a stored key', async () => {
      await saveApiKey(db, 'sk-test-key');
      await clearApiKey(db);
      const key = await getApiKey(db);
      expect(key).toBeNull();
    });

    it('does nothing when no key exists', async () => {
      await clearApiKey(db);
      const key = await getApiKey(db);
      expect(key).toBeNull();
    });
  });

  describe('hasApiKey', () => {
    it('returns true even when no key is stored (server provides default)', async () => {
      expect(await hasApiKey(db)).toBe(true);
    });

    it('returns true when a key is stored', async () => {
      await saveApiKey(db, 'sk-test-key');
      expect(await hasApiKey(db)).toBe(true);
    });

    it('returns true after clearing the key (server provides default)', async () => {
      await saveApiKey(db, 'sk-test-key');
      await clearApiKey(db);
      expect(await hasApiKey(db)).toBe(true);
    });
  });

  describe('getSettings / saveSettings', () => {
    it('returns default settings when none are stored', async () => {
      const settings = await getSettings(db);
      expect(settings.endpoint).toBe(DEFAULT_LLM_SETTINGS.endpoint);
      expect(settings.model).toBe(DEFAULT_LLM_SETTINGS.model);
      expect(settings.budget_limit_usd).toBe(DEFAULT_LLM_SETTINGS.budget_limit_usd);
      expect(settings.api_key).toBe('');
    });

    it('saves and retrieves custom settings', async () => {
      await saveSettings(db, {
        budget_limit_usd: 10,
        model: 'custom-model',
      });
      const settings = await getSettings(db);
      expect(settings.budget_limit_usd).toBe(10);
      expect(settings.model).toBe('custom-model');
      // Other fields retain defaults
      expect(settings.endpoint).toBe(DEFAULT_LLM_SETTINGS.endpoint);
    });

    it('saveApiKey preserves existing settings', async () => {
      await saveSettings(db, { budget_limit_usd: 20 });
      await saveApiKey(db, 'sk-new-key');
      const settings = await getSettings(db);
      expect(settings.api_key).toBe('sk-new-key');
      expect(settings.budget_limit_usd).toBe(20);
    });
  });
});
