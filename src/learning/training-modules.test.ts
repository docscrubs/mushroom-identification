import { describe, it, expect } from 'vitest';
import type { GenusProfile } from '@/types/genus';
import {
  generateTrainingModules,
  getModuleForGenus,
} from './training-modules';

function makeProfile(overrides: Partial<GenusProfile> = {}): GenusProfile {
  return {
    genus: 'Russula',
    common_names: ['Brittlegills'],
    confidence_markers: {
      high: ['Brittle gills that snap like chalk'],
      moderate: ['Colourful caps, white stems'],
    },
    ecological_context: {
      habitat: ['woodland'],
      substrate: 'soil',
      associations: ['oak', 'birch'],
      season: { UK: ['July', 'August', 'September', 'October'] },
    },
    uk_occurrence: 'very common',
    lookalike_genera: [
      {
        genus: 'Lactarius',
        distinction: 'Lactarius exudes milk when gills are broken, Russula does not',
        danger_level: 'low' as const,
      },
    ],
    key_species_uk: {
      edible: [
        {
          species: 'Russula cyanoxantha',
          common_name: 'Charcoal Burner',
          notes: 'Excellent edible with greasy, non-brittle gills',
        },
      ],
      toxic_or_inedible: [
        {
          species: 'Russula emetica',
          common_name: 'The Sickener',
          notes: 'Peppery taste, causes nausea',
        },
      ],
    },
    foraging_heuristics: [
      {
        heuristic_id: 'russula_taste_test',
        description: 'Break cap flesh, taste and spit. Mild = potentially edible, peppery = reject.',
      },
    ],
    identification_narrative: 'Russulas are the brittlegills — snap a piece of the flesh and it should break cleanly like chalk.',
    notes: 'Large genus, 100+ UK species',
    ...overrides,
  };
}

describe('Training Modules', () => {
  describe('generateTrainingModules', () => {
    it('generates modules from a genus profile', () => {
      const profile = makeProfile();
      const modules = generateTrainingModules(profile);
      expect(modules.length).toBeGreaterThan(0);
    });

    it('always includes a genus overview module', () => {
      const profile = makeProfile();
      const modules = generateTrainingModules(profile);
      const overview = modules.find((m) => m.module_id.includes('overview'));
      expect(overview).toBeDefined();
      expect(overview!.title).toContain('Russula');
    });

    it('includes identification narrative in overview content', () => {
      const profile = makeProfile();
      const modules = generateTrainingModules(profile);
      const overview = modules.find((m) => m.module_id.includes('overview'));
      const textContent = overview!.content.filter((c) => c.type === 'text');
      const hasNarrative = textContent.some((c) =>
        c.content.includes('brittlegills'),
      );
      expect(hasNarrative).toBe(true);
    });

    it('generates a lookalike comparison module when lookalikes exist', () => {
      const profile = makeProfile();
      const modules = generateTrainingModules(profile);
      const lookalike = modules.find((m) => m.module_id.includes('lookalike'));
      expect(lookalike).toBeDefined();
      expect(lookalike!.content.some((c) => c.content.includes('Lactarius'))).toBe(true);
    });

    it('does not generate a lookalike module when no lookalikes', () => {
      const profile = makeProfile({ lookalike_genera: [] });
      const modules = generateTrainingModules(profile);
      const lookalike = modules.find((m) => m.module_id.includes('lookalike'));
      expect(lookalike).toBeUndefined();
    });

    it('generates a heuristics module when heuristics exist', () => {
      const profile = makeProfile();
      const modules = generateTrainingModules(profile);
      const heuristic = modules.find((m) => m.module_id.includes('heuristic'));
      expect(heuristic).toBeDefined();
      expect(heuristic!.content.some((c) => c.content.includes('taste'))).toBe(true);
    });

    it('generates quiz content for key features', () => {
      const profile = makeProfile();
      const modules = generateTrainingModules(profile);
      const withQuiz = modules.find((m) =>
        m.content.some((c) => c.type === 'quiz'),
      );
      expect(withQuiz).toBeDefined();
    });

    it('includes species examples in overview', () => {
      const profile = makeProfile();
      const modules = generateTrainingModules(profile);
      const overview = modules.find((m) => m.module_id.includes('overview'));
      const hasSpecies = overview!.content.some((c) =>
        c.content.includes('Charcoal Burner') || c.content.includes('cyanoxantha'),
      );
      expect(hasSpecies).toBe(true);
    });

    it('includes season and habitat info', () => {
      const profile = makeProfile();
      const modules = generateTrainingModules(profile);
      const overview = modules.find((m) => m.module_id.includes('overview'));
      const hasEcology = overview!.content.some((c) =>
        c.content.includes('July') || c.content.includes('woodland'),
      );
      expect(hasEcology).toBe(true);
    });
  });

  describe('getModuleForGenus', () => {
    it('returns modules for a specific genus from a list of profiles', () => {
      const profiles = [
        makeProfile({ genus: 'Russula' }),
        makeProfile({ genus: 'Agaricus', common_names: ['Field mushrooms'] }),
      ];
      const russulaModules = getModuleForGenus(profiles, 'Russula');
      expect(russulaModules.length).toBeGreaterThan(0);
      expect(russulaModules.every((m) => m.genus === 'Russula')).toBe(true);
    });

    it('returns empty array for unknown genus', () => {
      const profiles = [makeProfile({ genus: 'Russula' })];
      const result = getModuleForGenus(profiles, 'Unknown');
      expect(result).toEqual([]);
    });
  });
});
