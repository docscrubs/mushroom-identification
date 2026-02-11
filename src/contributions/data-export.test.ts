import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';
import { MushroomDB } from '@/db/database';
import {
  exportUserData,
  importUserData,
  type ExportedData,
} from './data-export';

let db: MushroomDB;

beforeEach(async () => {
  await Dexie.delete('TestExportDB');
  db = new MushroomDB('TestExportDB');
});

describe('Data Export/Import', () => {
  describe('exportUserData', () => {
    it('exports an object with the expected keys', async () => {
      const data = await exportUserData(db);
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('exported_at');
      expect(data).toHaveProperty('competencies');
      expect(data).toHaveProperty('reviewCards');
      expect(data).toHaveProperty('reviewSessions');
      expect(data).toHaveProperty('contributions');
      expect(data).toHaveProperty('sessions');
    });

    it('exports version number 1', async () => {
      const data = await exportUserData(db);
      expect(data.version).toBe(1);
    });

    it('exports competency records', async () => {
      await db.competencies.put({
        skill_id: 'genus_recognition.Russula',
        status: 'confident',
        evidence: [],
        gaps: [],
        unlocks: [],
        fsrs_card_ids: [],
      });
      const data = await exportUserData(db);
      expect(data.competencies).toHaveLength(1);
      expect(data.competencies[0]!.skill_id).toBe('genus_recognition.Russula');
    });

    it('exports user contributions', async () => {
      await db.userContributions.put({
        id: 'c1',
        type: 'personal_note',
        content: 'Test note',
        date: new Date().toISOString(),
        status: 'draft',
      });
      const data = await exportUserData(db);
      expect(data.contributions).toHaveLength(1);
    });

    it('does not export genus profiles or LLM cache', async () => {
      const data = await exportUserData(db);
      expect(data).not.toHaveProperty('genusProfiles');
      expect(data).not.toHaveProperty('llmCache');
    });
  });

  describe('importUserData', () => {
    it('imports competency records', async () => {
      const data: ExportedData = {
        version: 1,
        exported_at: new Date().toISOString(),
        competencies: [{
          skill_id: 'genus_recognition.Russula',
          status: 'confident',
          evidence: [],
          gaps: [],
          unlocks: [],
          fsrs_card_ids: [],
        }],
        reviewCards: [],
        reviewSessions: [],
        contributions: [],
        sessions: [],
      };

      const result = await importUserData(db, data);
      expect(result.competencies_imported).toBe(1);

      const comps = await db.competencies.toArray();
      expect(comps).toHaveLength(1);
    });

    it('imports contributions', async () => {
      const data: ExportedData = {
        version: 1,
        exported_at: new Date().toISOString(),
        competencies: [],
        reviewCards: [],
        reviewSessions: [],
        contributions: [{
          id: 'c1',
          type: 'personal_note',
          content: 'Test note',
          date: new Date().toISOString(),
          status: 'draft',
        }],
        sessions: [],
      };

      const result = await importUserData(db, data);
      expect(result.contributions_imported).toBe(1);
    });

    it('returns an import summary', async () => {
      const data: ExportedData = {
        version: 1,
        exported_at: new Date().toISOString(),
        competencies: [],
        reviewCards: [],
        reviewSessions: [],
        contributions: [],
        sessions: [],
      };

      const result = await importUserData(db, data);
      expect(result).toHaveProperty('competencies_imported');
      expect(result).toHaveProperty('review_cards_imported');
      expect(result).toHaveProperty('contributions_imported');
      expect(result).toHaveProperty('sessions_imported');
    });

    it('overwrites existing data with same keys', async () => {
      await db.competencies.put({
        skill_id: 'genus_recognition.Russula',
        status: 'learning',
        evidence: [],
        gaps: [],
        unlocks: [],
        fsrs_card_ids: [],
      });

      const data: ExportedData = {
        version: 1,
        exported_at: new Date().toISOString(),
        competencies: [{
          skill_id: 'genus_recognition.Russula',
          status: 'expert',
          evidence: [],
          gaps: [],
          unlocks: [],
          fsrs_card_ids: [],
        }],
        reviewCards: [],
        reviewSessions: [],
        contributions: [],
        sessions: [],
      };

      await importUserData(db, data);
      const comp = await db.competencies.get('genus_recognition.Russula');
      expect(comp!.status).toBe('expert');
    });
  });
});
