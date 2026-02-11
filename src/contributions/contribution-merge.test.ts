import { describe, it, expect } from 'vitest';
import type { UserContribution } from '@/types/user';
import type { GenusProfile } from '@/types/genus';
import {
  getNotesForGenus,
  getRegionalOverrides,
  getExceptionReports,
  mergeSeasonOverride,
} from './contribution-merge';

function makeContribution(overrides: Partial<UserContribution> = {}): UserContribution {
  return {
    id: 'c1',
    type: 'personal_note',
    content: 'Always found under beech in Hampshire',
    date: new Date().toISOString(),
    status: 'draft',
    ...overrides,
  };
}

function makeProfile(overrides: Partial<GenusProfile> = {}): GenusProfile {
  return {
    genus: 'Russula',
    common_names: ['Brittlegills'],
    confidence_markers: { high: [], moderate: [] },
    ecological_context: {
      habitat: ['woodland'],
      substrate: 'soil',
      associations: ['oak'],
      season: { UK: ['July', 'August', 'September', 'October'] },
    },
    uk_occurrence: 'common',
    lookalike_genera: [],
    key_species_uk: { edible: [], toxic_or_inedible: [] },
    foraging_heuristics: [],
    notes: '',
    ...overrides,
  };
}

describe('Contribution Merge', () => {
  describe('getNotesForGenus', () => {
    it('returns personal notes matching a genus heuristic', () => {
      const contributions: UserContribution[] = [
        makeContribution({ id: 'c1', type: 'personal_note', heuristic_id: 'russula_taste_test' }),
        makeContribution({ id: 'c2', type: 'personal_note', heuristic_id: 'agaricus_yellow_stain' }),
      ];
      const notes = getNotesForGenus(contributions, 'Russula');
      expect(notes).toHaveLength(1);
      expect(notes[0]!.id).toBe('c1');
    });

    it('returns empty array when no notes match', () => {
      const contributions: UserContribution[] = [
        makeContribution({ id: 'c1', heuristic_id: 'agaricus_yellow_stain' }),
      ];
      expect(getNotesForGenus(contributions, 'Russula')).toEqual([]);
    });

    it('matches genus name case-insensitively in heuristic_id', () => {
      const contributions: UserContribution[] = [
        makeContribution({ id: 'c1', heuristic_id: 'Russula_taste_test' }),
      ];
      const notes = getNotesForGenus(contributions, 'Russula');
      expect(notes).toHaveLength(1);
    });
  });

  describe('getRegionalOverrides', () => {
    it('returns regional_override contributions', () => {
      const contributions: UserContribution[] = [
        makeContribution({ id: 'c1', type: 'regional_override', content: 'Earlier season in Devon' }),
        makeContribution({ id: 'c2', type: 'personal_note', content: 'Irrelevant' }),
      ];
      const overrides = getRegionalOverrides(contributions);
      expect(overrides).toHaveLength(1);
      expect(overrides[0]!.type).toBe('regional_override');
    });
  });

  describe('getExceptionReports', () => {
    it('returns exception_report contributions', () => {
      const contributions: UserContribution[] = [
        makeContribution({ id: 'c1', type: 'exception_report', content: 'R. olivacea tasted mild' }),
        makeContribution({ id: 'c2', type: 'personal_note', content: 'Irrelevant' }),
      ];
      const reports = getExceptionReports(contributions);
      expect(reports).toHaveLength(1);
    });
  });

  describe('mergeSeasonOverride', () => {
    it('returns original profile when no override applies', () => {
      const profile = makeProfile();
      const contributions: UserContribution[] = [];
      const merged = mergeSeasonOverride(profile, contributions);
      expect(merged.ecological_context.season.UK).toEqual(['July', 'August', 'September', 'October']);
    });

    it('merges season override from regional_override contribution', () => {
      const profile = makeProfile();
      const contributions: UserContribution[] = [
        makeContribution({
          id: 'c1',
          type: 'regional_override',
          heuristic_id: 'russula_season',
          content: JSON.stringify({
            field: 'season.UK',
            genus: 'Russula',
            value: ['June', 'July', 'August', 'September', 'October'],
          }),
        }),
      ];
      const merged = mergeSeasonOverride(profile, contributions);
      expect(merged.ecological_context.season.UK).toContain('June');
      expect(merged.ecological_context.season.UK).toHaveLength(5);
    });

    it('does not mutate the original profile', () => {
      const profile = makeProfile();
      const original = [...profile.ecological_context.season.UK];
      const contributions: UserContribution[] = [
        makeContribution({
          id: 'c1',
          type: 'regional_override',
          heuristic_id: 'russula_season',
          content: JSON.stringify({
            field: 'season.UK',
            genus: 'Russula',
            value: ['June', 'July', 'August', 'September', 'October', 'November'],
          }),
        }),
      ];
      mergeSeasonOverride(profile, contributions);
      expect(profile.ecological_context.season.UK).toEqual(original);
    });

    it('ignores overrides for a different genus', () => {
      const profile = makeProfile({ genus: 'Russula' });
      const contributions: UserContribution[] = [
        makeContribution({
          id: 'c1',
          type: 'regional_override',
          heuristic_id: 'agaricus_season',
          content: JSON.stringify({
            field: 'season.UK',
            genus: 'Agaricus',
            value: ['June'],
          }),
        }),
      ];
      const merged = mergeSeasonOverride(profile, contributions);
      expect(merged.ecological_context.season.UK).toEqual(['July', 'August', 'September', 'October']);
    });

    it('silently ignores malformed override content', () => {
      const profile = makeProfile();
      const contributions: UserContribution[] = [
        makeContribution({
          id: 'c1',
          type: 'regional_override',
          content: 'not valid json',
        }),
      ];
      const merged = mergeSeasonOverride(profile, contributions);
      expect(merged.ecological_context.season.UK).toEqual(['July', 'August', 'September', 'October']);
    });
  });
});
