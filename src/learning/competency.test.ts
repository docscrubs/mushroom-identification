import { describe, it, expect } from 'vitest';
import type { EvidenceEntry } from '@/types/user';
import {
  createCompetencyRecord,
  addEvidence,
  checkUpgrade,
  checkDecay,
  getCompetencyLevel,
} from './competency';

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function makeEvidence(overrides: Partial<EvidenceEntry> = {}): EvidenceEntry {
  return {
    date: new Date().toISOString(),
    type: 'correct_identification',
    details: 'Correctly identified Russula',
    session_id: 'session-1',
    ...overrides,
  };
}

describe('Competency Tracker', () => {
  describe('createCompetencyRecord', () => {
    it('creates a record with not_started status', () => {
      const record = createCompetencyRecord('genus_recognition.Russula');
      expect(record.skill_id).toBe('genus_recognition.Russula');
      expect(record.status).toBe('not_started');
      expect(record.evidence).toEqual([]);
      expect(record.gaps).toEqual([]);
      expect(record.fsrs_card_ids).toEqual([]);
    });

    it('accepts optional unlocks list', () => {
      const record = createCompetencyRecord('genus_recognition.Russula', {
        unlocks: ['heuristic_recall.russula_taste_test'],
      });
      expect(record.unlocks).toEqual(['heuristic_recall.russula_taste_test']);
    });
  });

  describe('addEvidence', () => {
    it('adds evidence to a record', () => {
      const record = createCompetencyRecord('genus_recognition.Russula');
      const evidence = makeEvidence();
      const updated = addEvidence(record, evidence);

      expect(updated.evidence).toHaveLength(1);
      expect(updated.evidence[0]).toEqual(evidence);
    });

    it('updates last_demonstrated date', () => {
      const record = createCompetencyRecord('genus_recognition.Russula');
      const evidence = makeEvidence();
      const updated = addEvidence(record, evidence);

      expect(updated.last_demonstrated).toBeTruthy();
    });

    it('upgrades from not_started to aware on first evidence', () => {
      const record = createCompetencyRecord('genus_recognition.Russula');
      const evidence = makeEvidence({ type: 'training_completed' });
      const updated = addEvidence(record, evidence);

      expect(updated.status).toBe('aware');
    });

    it('sets first_exposure on first evidence', () => {
      const record = createCompetencyRecord('genus_recognition.Russula');
      const evidence = makeEvidence();
      const updated = addEvidence(record, evidence);

      expect(updated.first_exposure).toBeTruthy();
    });

    it('does not overwrite first_exposure on subsequent evidence', () => {
      let record = createCompetencyRecord('genus_recognition.Russula');
      record = addEvidence(record, makeEvidence({ date: daysAgo(10) }));
      const firstExposure = record.first_exposure;

      record = addEvidence(record, makeEvidence({ date: new Date().toISOString() }));
      expect(record.first_exposure).toBe(firstExposure);
    });
  });

  describe('checkUpgrade', () => {
    it('upgrades from aware to learning after assisted identification', () => {
      let record = createCompetencyRecord('genus_recognition.Russula');
      record = addEvidence(record, makeEvidence({ type: 'training_completed' }));
      expect(record.status).toBe('aware');

      record = addEvidence(record, makeEvidence({ type: 'assisted_identification' }));
      const upgraded = checkUpgrade(record);
      expect(upgraded.status).toBe('learning');
    });

    it('upgrades from learning to confident after 3 correct IDs and 1 correct rejection with no false positives in 30 days', () => {
      let record = createCompetencyRecord('genus_recognition.Russula');
      record.status = 'learning';

      // Add 3 correct identifications
      for (let i = 0; i < 3; i++) {
        record = addEvidence(record, makeEvidence({
          type: 'correct_identification',
          date: daysAgo(i * 5),
        }));
      }

      // Add 1 correct rejection
      record = addEvidence(record, makeEvidence({
        type: 'correct_rejection',
        date: daysAgo(2),
      }));

      const upgraded = checkUpgrade(record);
      expect(upgraded.status).toBe('confident');
    });

    it('does not upgrade from learning if there is a false positive in the last 30 days', () => {
      let record = createCompetencyRecord('genus_recognition.Russula');
      record.status = 'learning';

      for (let i = 0; i < 3; i++) {
        record = addEvidence(record, makeEvidence({ type: 'correct_identification', date: daysAgo(i * 5) }));
      }
      record = addEvidence(record, makeEvidence({ type: 'correct_rejection', date: daysAgo(2) }));
      record = addEvidence(record, makeEvidence({ type: 'false_positive', date: daysAgo(1) }));

      const result = checkUpgrade(record);
      expect(result.status).toBe('learning');
    });

    it('does not upgrade from learning without a correct rejection', () => {
      let record = createCompetencyRecord('genus_recognition.Russula');
      record.status = 'learning';

      for (let i = 0; i < 5; i++) {
        record = addEvidence(record, makeEvidence({ type: 'correct_identification', date: daysAgo(i) }));
      }

      const result = checkUpgrade(record);
      expect(result.status).toBe('learning');
    });

    it('upgrades from confident to expert after sustained performance', () => {
      let record = createCompetencyRecord('genus_recognition.Russula');
      record.status = 'confident';

      // 10 correct identifications over 90 days
      for (let i = 0; i < 10; i++) {
        record = addEvidence(record, makeEvidence({
          type: 'correct_identification',
          date: daysAgo(i * 9),
        }));
      }

      // 3 correct rejections
      for (let i = 0; i < 3; i++) {
        record = addEvidence(record, makeEvidence({
          type: 'correct_rejection',
          date: daysAgo(i * 20),
        }));
      }

      const upgraded = checkUpgrade(record);
      expect(upgraded.status).toBe('expert');
    });

    it('does not change status when already expert', () => {
      let record = createCompetencyRecord('genus_recognition.Russula');
      record.status = 'expert';

      const result = checkUpgrade(record);
      expect(result.status).toBe('expert');
    });
  });

  describe('checkDecay', () => {
    it('decays confident to learning after 180 days of inactivity', () => {
      let record = createCompetencyRecord('genus_recognition.Russula');
      record.status = 'confident';
      record.last_demonstrated = daysAgo(181);

      const decayed = checkDecay(record);
      expect(decayed.status).toBe('learning');
    });

    it('does not decay if last demonstrated recently', () => {
      let record = createCompetencyRecord('genus_recognition.Russula');
      record.status = 'confident';
      record.last_demonstrated = daysAgo(30);

      const decayed = checkDecay(record);
      expect(decayed.status).toBe('confident');
    });

    it('decays expert to confident after 365 days of inactivity', () => {
      let record = createCompetencyRecord('genus_recognition.Russula');
      record.status = 'expert';
      record.last_demonstrated = daysAgo(366);

      const decayed = checkDecay(record);
      expect(decayed.status).toBe('confident');
    });

    it('does not decay below learning', () => {
      let record = createCompetencyRecord('genus_recognition.Russula');
      record.status = 'learning';
      record.last_demonstrated = daysAgo(200);

      const decayed = checkDecay(record);
      expect(decayed.status).toBe('learning');
    });

    it('does not decay not_started or aware', () => {
      const notStarted = createCompetencyRecord('genus_recognition.Russula');
      expect(checkDecay(notStarted).status).toBe('not_started');

      const aware = { ...notStarted, status: 'aware' as const, last_demonstrated: daysAgo(200) };
      expect(checkDecay(aware).status).toBe('aware');
    });
  });

  describe('getCompetencyLevel', () => {
    it('returns a numeric level for each status', () => {
      expect(getCompetencyLevel('not_started')).toBe(0);
      expect(getCompetencyLevel('aware')).toBe(1);
      expect(getCompetencyLevel('aware_not_confident')).toBe(1);
      expect(getCompetencyLevel('learning')).toBe(2);
      expect(getCompetencyLevel('confident')).toBe(3);
      expect(getCompetencyLevel('expert')).toBe(4);
    });
  });
});
