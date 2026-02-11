import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';
import { MushroomDB } from '@/db/database';
import type { UserContribution } from '@/types/user';
import {
  addContribution,
  getContributions,
  getContributionsByType,
  getContributionsForHeuristic,
  updateContributionStatus,
  deleteContribution,
} from './contribution-store';

let db: MushroomDB;

beforeEach(async () => {
  await Dexie.delete('TestContribDB');
  db = new MushroomDB('TestContribDB');
});

function makeContribution(overrides: Partial<UserContribution> = {}): UserContribution {
  return {
    id: `contrib-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'personal_note',
    heuristic_id: 'russula_taste_test',
    content: 'R. cyanoxantha in Hampshire always grows under beech',
    date: new Date().toISOString(),
    status: 'draft',
    ...overrides,
  };
}

describe('Contribution Store', () => {
  describe('addContribution', () => {
    it('adds a contribution to the database', async () => {
      const contrib = makeContribution();
      await addContribution(db, contrib);

      const stored = await db.userContributions.get(contrib.id);
      expect(stored).toBeDefined();
      expect(stored!.content).toBe(contrib.content);
    });

    it('returns the contribution id', async () => {
      const contrib = makeContribution();
      const id = await addContribution(db, contrib);
      expect(id).toBe(contrib.id);
    });
  });

  describe('getContributions', () => {
    it('returns all contributions', async () => {
      await addContribution(db, makeContribution({ id: 'c1' }));
      await addContribution(db, makeContribution({ id: 'c2' }));

      const all = await getContributions(db);
      expect(all).toHaveLength(2);
    });

    it('returns empty array when no contributions', async () => {
      const all = await getContributions(db);
      expect(all).toEqual([]);
    });
  });

  describe('getContributionsByType', () => {
    it('filters by contribution type', async () => {
      await addContribution(db, makeContribution({ id: 'c1', type: 'personal_note' }));
      await addContribution(db, makeContribution({ id: 'c2', type: 'exception_report' }));
      await addContribution(db, makeContribution({ id: 'c3', type: 'personal_note' }));

      const notes = await getContributionsByType(db, 'personal_note');
      expect(notes).toHaveLength(2);
      expect(notes.every((c) => c.type === 'personal_note')).toBe(true);
    });
  });

  describe('getContributionsForHeuristic', () => {
    it('filters by heuristic_id', async () => {
      await addContribution(db, makeContribution({ id: 'c1', heuristic_id: 'russula_taste_test' }));
      await addContribution(db, makeContribution({ id: 'c2', heuristic_id: 'other_heuristic' }));

      const notes = await getContributionsForHeuristic(db, 'russula_taste_test');
      expect(notes).toHaveLength(1);
      expect(notes[0]!.heuristic_id).toBe('russula_taste_test');
    });
  });

  describe('updateContributionStatus', () => {
    it('updates the status field', async () => {
      const contrib = makeContribution({ id: 'c1', status: 'draft' });
      await addContribution(db, contrib);

      await updateContributionStatus(db, 'c1', 'submitted');
      const updated = await db.userContributions.get('c1');
      expect(updated!.status).toBe('submitted');
    });
  });

  describe('deleteContribution', () => {
    it('removes a contribution from the database', async () => {
      await addContribution(db, makeContribution({ id: 'c1' }));
      await deleteContribution(db, 'c1');

      const result = await db.userContributions.get('c1');
      expect(result).toBeUndefined();
    });

    it('does not throw for non-existent id', async () => {
      await expect(deleteContribution(db, 'nonexistent')).resolves.not.toThrow();
    });
  });
});
