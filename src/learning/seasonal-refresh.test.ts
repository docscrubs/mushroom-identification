import { describe, it, expect } from 'vitest';
import type { GenusProfile } from '@/types/genus';
import {
  getCurrentSeasonMonth,
  getSeasonalGenera,
  getSeasonalRefreshPrompt,
} from './seasonal-refresh';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function makeProfile(genus: string, months: string[]): GenusProfile {
  return {
    genus,
    common_names: [genus.toLowerCase()],
    confidence_markers: { high: [], moderate: [] },
    ecological_context: {
      habitat: ['woodland'],
      substrate: 'soil',
      associations: ['oak'],
      season: { UK: months },
    },
    uk_occurrence: 'common',
    lookalike_genera: [],
    key_species_uk: { edible: [], toxic_or_inedible: [] },
    foraging_heuristics: [],
    notes: '',
  };
}

describe('Seasonal Refresh', () => {
  describe('getCurrentSeasonMonth', () => {
    it('returns the current month name', () => {
      const month = getCurrentSeasonMonth();
      expect(MONTH_NAMES).toContain(month);
    });

    it('accepts a custom date', () => {
      const jan = new Date(2025, 0, 15); // January
      expect(getCurrentSeasonMonth(jan)).toBe('January');

      const oct = new Date(2025, 9, 1); // October
      expect(getCurrentSeasonMonth(oct)).toBe('October');
    });
  });

  describe('getSeasonalGenera', () => {
    const profiles = [
      makeProfile('Russula', ['July', 'August', 'September', 'October']),
      makeProfile('Cantharellus', ['June', 'July', 'August', 'September']),
      makeProfile('Agaricus', ['September', 'October', 'November']),
      makeProfile('Pleurotus', ['November', 'December', 'January', 'February']),
    ];

    it('returns genera in season for a given month', () => {
      const july = getSeasonalGenera(profiles, 'July');
      expect(july.map((p) => p.genus)).toEqual(['Russula', 'Cantharellus']);
    });

    it('returns genera for winter months', () => {
      const jan = getSeasonalGenera(profiles, 'January');
      expect(jan.map((p) => p.genus)).toEqual(['Pleurotus']);
    });

    it('returns empty array when no genera in season', () => {
      const march = getSeasonalGenera(profiles, 'March');
      expect(march).toEqual([]);
    });

    it('returns all overlapping genera', () => {
      const sept = getSeasonalGenera(profiles, 'September');
      expect(sept.map((p) => p.genus)).toEqual(['Russula', 'Cantharellus', 'Agaricus']);
    });
  });

  describe('getSeasonalRefreshPrompt', () => {
    const profiles = [
      makeProfile('Russula', ['July', 'August', 'September', 'October']),
      makeProfile('Cantharellus', ['June', 'July', 'August', 'September']),
    ];

    it('returns null when no genera are in season', () => {
      const result = getSeasonalRefreshPrompt([], 'March');
      expect(result).toBeNull();
    });

    it('returns a prompt with in-season genera names', () => {
      const result = getSeasonalRefreshPrompt(profiles, 'July');
      expect(result).not.toBeNull();
      expect(result!.genera).toEqual(['Russula', 'Cantharellus']);
      expect(result!.month).toBe('July');
    });

    it('returns a message string', () => {
      const result = getSeasonalRefreshPrompt(profiles, 'July');
      expect(result!.message).toContain('July');
      expect(result!.message).toContain('Russula');
    });

    it('includes approaching genera for the next month', () => {
      const result = getSeasonalRefreshPrompt(
        [
          makeProfile('Russula', ['August', 'September']),
          makeProfile('Cantharellus', ['July']),
        ],
        'July',
      );
      expect(result).not.toBeNull();
      expect(result!.approaching).toEqual(['Russula']);
    });

    it('does not include already in-season genera in approaching', () => {
      const result = getSeasonalRefreshPrompt(
        [
          makeProfile('Russula', ['July', 'August']),
          makeProfile('Agaricus', ['August', 'September']),
        ],
        'July',
      );
      expect(result!.genera).toEqual(['Russula']);
      expect(result!.approaching).toEqual(['Agaricus']);
    });
  });
});
