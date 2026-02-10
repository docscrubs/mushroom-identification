import { describe, it, expect, beforeEach } from 'vitest';
import { MushroomDB } from './database';
import type { GenusProfile } from '@/types';
import type { Heuristic } from '@/types';
import type { UserModel } from '@/types';
import type { IdentificationSession } from '@/types';
import type { UserContribution } from '@/types';

function makeTestGenus(overrides: Partial<GenusProfile> = {}): GenusProfile {
  return {
    genus: 'Russula',
    common_names: ['Brittlegills'],
    confidence_markers: {
      high: ['Brittle flesh that snaps cleanly'],
      moderate: ['White to cream spore print'],
    },
    ecological_context: {
      habitat: ['woodland'],
      substrate: 'soil near trees',
      associations: ['oak', 'birch'],
      season: { UK: ['July', 'August', 'September', 'October'] },
    },
    uk_occurrence: 'very common',
    lookalike_genera: [
      {
        genus: 'Lactarius',
        distinction: 'Lactarius exudes milk',
        danger_level: 'low',
      },
    ],
    key_species_uk: {
      edible: [
        {
          species: 'cyanoxantha',
          common_name: 'Charcoal Burner',
          notes: 'Choice edible',
        },
      ],
      toxic_or_inedible: [
        {
          species: 'emetica',
          common_name: 'The Sickener',
          notes: 'Causes vomiting',
        },
      ],
    },
    foraging_heuristics: [
      {
        heuristic_id: 'russula_taste_test',
        description: 'The taste test for Russula edibility',
      },
    ],
    notes: 'Good genus for beginners',
    ...overrides,
  };
}

function makeTestHeuristic(overrides: Partial<Heuristic> = {}): Heuristic {
  return {
    heuristic_id: 'russula_taste_test',
    name: 'Russula Taste Test',
    category: 'edibility_determination',
    applies_to: {
      genus: 'Russula',
      confidence_required: 'high',
    },
    procedure: 'Break off cap flesh, taste, spit, wait 30s',
    outcomes: [
      {
        condition: 'Mild taste',
        conclusion: 'EDIBLE',
        confidence: 'high',
        action: 'Safe to eat',
      },
      {
        condition: 'Peppery taste',
        conclusion: 'REJECT',
        confidence: 'high',
        action: 'Do not eat',
      },
    ],
    source: 'Phillips (2006), Wright (2007)',
    ...overrides,
  };
}

describe('MushroomDB', () => {
  let db: MushroomDB;

  beforeEach(async () => {
    // Create a fresh database for each test (unique name prevents collisions)
    db = new MushroomDB(`test-${Date.now()}-${Math.random()}`);
  });

  describe('genus profiles', () => {
    it('stores and retrieves a genus profile by genus name', async () => {
      const russula = makeTestGenus();
      await db.genusProfiles.add(russula);

      const retrieved = await db.genusProfiles.get('Russula');
      expect(retrieved).toEqual(russula);
    });

    it('queries genus profiles by common name', async () => {
      await db.genusProfiles.add(makeTestGenus());
      await db.genusProfiles.add(
        makeTestGenus({
          genus: 'Boletus',
          common_names: ['Boletes', 'Penny Bun family'],
          uk_occurrence: 'common',
        }),
      );

      const results = await db.genusProfiles
        .where('common_names')
        .equals('Brittlegills')
        .toArray();
      expect(results).toHaveLength(1);
      expect(results[0]!.genus).toBe('Russula');
    });

    it('queries genus profiles by UK occurrence', async () => {
      await db.genusProfiles.add(makeTestGenus());
      await db.genusProfiles.add(
        makeTestGenus({
          genus: 'Sparassis',
          common_names: ['Cauliflower Fungus'],
          uk_occurrence: 'occasional',
        }),
      );

      const veryCommon = await db.genusProfiles
        .where('uk_occurrence')
        .equals('very common')
        .toArray();
      expect(veryCommon).toHaveLength(1);
      expect(veryCommon[0]!.genus).toBe('Russula');
    });

    it('updates an existing genus profile', async () => {
      await db.genusProfiles.add(makeTestGenus());
      await db.genusProfiles.update('Russula', {
        notes: 'Updated notes',
      });

      const updated = await db.genusProfiles.get('Russula');
      expect(updated!.notes).toBe('Updated notes');
    });
  });

  describe('heuristics', () => {
    it('stores and retrieves a heuristic by ID', async () => {
      const heuristic = makeTestHeuristic();
      await db.heuristics.add(heuristic);

      const retrieved = await db.heuristics.get('russula_taste_test');
      expect(retrieved).toEqual(heuristic);
    });

    it('queries heuristics by category', async () => {
      await db.heuristics.add(makeTestHeuristic());
      await db.heuristics.add(
        makeTestHeuristic({
          heuristic_id: 'avoid_lbms',
          name: 'Avoid LBMs',
          category: 'safety_rule',
        }),
      );

      const safetyRules = await db.heuristics
        .where('category')
        .equals('safety_rule')
        .toArray();
      expect(safetyRules).toHaveLength(1);
      expect(safetyRules[0]!.heuristic_id).toBe('avoid_lbms');
    });

    it('queries heuristics by genus they apply to', async () => {
      await db.heuristics.add(makeTestHeuristic());
      await db.heuristics.add(
        makeTestHeuristic({
          heuristic_id: 'bolete_blue_staining',
          name: 'Bolete Blue Staining',
          category: 'safety_screening',
          applies_to: { family: 'Boletaceae', confidence_required: 'moderate' },
        }),
      );

      const russulRules = await db.heuristics
        .where('applies_to.genus')
        .equals('Russula')
        .toArray();
      expect(russulRules).toHaveLength(1);
      expect(russulRules[0]!.heuristic_id).toBe('russula_taste_test');
    });
  });

  describe('user model', () => {
    it('stores and retrieves a user model', async () => {
      const user: UserModel = {
        user_id: 'user-1',
        created: '2025-01-15',
        last_active: '2025-10-15',
        region: 'UK_South',
        competencies: [],
        calibration: {
          false_positives: 0,
          false_negatives: 0,
          appropriate_uncertainty: 0,
          overconfidence_incidents: 0,
          notes: '',
        },
        total_sessions: 0,
        genera_encountered: [],
        seasons_active: [],
        habitats: [],
        regions: [],
      };

      await db.userModels.add(user);
      const retrieved = await db.userModels.get('user-1');
      expect(retrieved).toEqual(user);
    });
  });

  describe('identification sessions', () => {
    it('stores and retrieves a session', async () => {
      const session: IdentificationSession = {
        session_id: 'session-1',
        date: '2025-10-15',
        observation: {
          cap_color: 'red',
          gill_type: 'gills',
          flesh_texture: 'brittle',
        },
      };

      await db.identificationSessions.add(session);
      const retrieved = await db.identificationSessions.get('session-1');
      expect(retrieved!.observation.cap_color).toBe('red');
    });

    it('queries sessions by date', async () => {
      await db.identificationSessions.add({
        session_id: 'session-1',
        date: '2025-10-15',
        observation: {},
      });
      await db.identificationSessions.add({
        session_id: 'session-2',
        date: '2025-11-01',
        observation: {},
      });

      const october = await db.identificationSessions
        .where('date')
        .between('2025-10-01', '2025-10-31')
        .toArray();
      expect(october).toHaveLength(1);
      expect(october[0]!.session_id).toBe('session-1');
    });
  });

  describe('user contributions', () => {
    it('stores and retrieves a user contribution', async () => {
      const contrib: UserContribution = {
        id: 'contrib-1',
        type: 'personal_note',
        heuristic_id: 'russula_taste_test',
        content: 'In Hampshire, always under beech',
        date: '2025-09-15',
        status: 'draft',
      };

      await db.userContributions.add(contrib);
      const retrieved = await db.userContributions.get('contrib-1');
      expect(retrieved).toEqual(contrib);
    });

    it('queries contributions by heuristic', async () => {
      await db.userContributions.add({
        id: 'contrib-1',
        type: 'personal_note',
        heuristic_id: 'russula_taste_test',
        content: 'Note about Russula',
        date: '2025-09-15',
        status: 'draft',
      });
      await db.userContributions.add({
        id: 'contrib-2',
        type: 'personal_note',
        heuristic_id: 'bolete_blue_staining',
        content: 'Note about Boletes',
        date: '2025-09-16',
        status: 'draft',
      });

      const russulaContribs = await db.userContributions
        .where('heuristic_id')
        .equals('russula_taste_test')
        .toArray();
      expect(russulaContribs).toHaveLength(1);
      expect(russulaContribs[0]!.id).toBe('contrib-1');
    });
  });

  describe('LLM cache', () => {
    it('stores and retrieves cached LLM responses', async () => {
      await db.llmCache.add({
        cache_key: 'hash-abc123',
        response: 'This is a cached response',
        created_at: '2025-10-15T10:00:00Z',
      });

      const cached = await db.llmCache.get('hash-abc123');
      expect(cached!.response).toBe('This is a cached response');
    });
  });
});
