import type { Observation } from '@/types';
import { featureRules, matchesRule, type FeatureRule } from './feature-rules';

/** Helper: find all rules that match a given observation for a specific genus. */
function matchingRulesForGenus(
  obs: Observation,
  genus: string,
): FeatureRule[] {
  return featureRules.filter(
    (r) => r.genus === genus && matchesRule(obs, r),
  );
}

/** Helper: check if any description_notes rule matches for a genus. */
function notesMatchesGenus(notes: string, genus: string): boolean {
  const obs: Observation = { description_notes: notes };
  return matchingRulesForGenus(obs, genus).some(
    (r) => r.field === 'description_notes',
  );
}

describe('Description notes rules', () => {
  it('rules exist that target description_notes', () => {
    const notesRules = featureRules.filter(
      (r) => r.field === 'description_notes',
    );
    expect(notesRules.length).toBeGreaterThanOrEqual(30);
  });

  it('rules do not match when description_notes is absent', () => {
    const obs: Observation = {};
    const notesRules = featureRules.filter(
      (r) => r.field === 'description_notes',
    );
    for (const rule of notesRules) {
      expect(matchesRule(obs, rule)).toBe(false);
    }
  });

  describe('Russula', () => {
    it('"distant gills" matches Russula', () => {
      expect(notesMatchesGenus('distant gills', 'Russula')).toBe(true);
    });

    it('"depressed" matches Russula', () => {
      expect(notesMatchesGenus('cap is depressed in the centre', 'Russula')).toBe(true);
    });

    it('"dipped" matches Russula', () => {
      expect(notesMatchesGenus('cap is dipped in the middle', 'Russula')).toBe(true);
    });

    it('"brittle gills" matches Russula', () => {
      expect(notesMatchesGenus('brittle gills that flake', 'Russula')).toBe(true);
    });

    it('"taste test" matches Russula', () => {
      expect(notesMatchesGenus('did the taste test, mild flavour', 'Russula')).toBe(true);
    });
  });

  describe('Lactarius', () => {
    it('"milk" matches Lactarius (strong tier)', () => {
      const obs: Observation = { description_notes: 'exudes milk when cut' };
      const matches = matchingRulesForGenus(obs, 'Lactarius').filter(
        (r) => r.field === 'description_notes',
      );
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some((r) => r.tier === 'strong')).toBe(true);
    });

    it('"latex" matches Lactarius', () => {
      expect(notesMatchesGenus('produces latex from gills', 'Lactarius')).toBe(true);
    });

    it('"concentric" matches Lactarius', () => {
      expect(notesMatchesGenus('concentric bands on cap', 'Lactarius')).toBe(true);
    });

    it('"rings of colour" matches Lactarius', () => {
      expect(notesMatchesGenus('rings of colour around the cap', 'Lactarius')).toBe(true);
    });

    it('"bands" matches Lactarius', () => {
      expect(notesMatchesGenus('colour bands radiating from centre', 'Lactarius')).toBe(true);
    });

    it('"depressed" also matches Lactarius', () => {
      expect(notesMatchesGenus('depressed cap centre', 'Lactarius')).toBe(true);
    });

    it('"orange milk" matches Lactarius', () => {
      expect(notesMatchesGenus('orange milk coming from the gills', 'Lactarius')).toBe(true);
    });
  });

  describe('Macrolepiota', () => {
    it('"snakeskin" matches Macrolepiota', () => {
      expect(notesMatchesGenus('snakeskin pattern on stem', 'Macrolepiota')).toBe(true);
    });

    it('"ball and socket" matches Macrolepiota', () => {
      expect(notesMatchesGenus('ball and socket joint where cap meets stem', 'Macrolepiota')).toBe(true);
    });

    it('"loose skirt" matches Macrolepiota', () => {
      expect(notesMatchesGenus('loose skirt that moves up and down', 'Macrolepiota')).toBe(true);
    });
  });

  describe('Marasmius', () => {
    it('"tough stem" matches Marasmius', () => {
      expect(notesMatchesGenus('tough stem that bends', 'Marasmius')).toBe(true);
    });

    it('"tie it in a knot" matches Marasmius', () => {
      expect(notesMatchesGenus('can tie it in a knot', 'Marasmius')).toBe(true);
    });

    it('"umbo" matches Marasmius', () => {
      expect(notesMatchesGenus('nipple-like umbo on cap', 'Marasmius')).toBe(true);
    });

    it('"fairy ring" matches Marasmius', () => {
      expect(notesMatchesGenus('growing in a fairy ring on the lawn', 'Marasmius')).toBe(true);
    });

    it('"distant gills" also matches Marasmius', () => {
      expect(notesMatchesGenus('distant gills, widely spaced', 'Marasmius')).toBe(true);
    });
  });

  describe('Cantharellus', () => {
    it('"false gills" matches Cantharellus', () => {
      expect(notesMatchesGenus('has false gills, just folds', 'Cantharellus')).toBe(true);
    });

    it('"forked ridges" matches Cantharellus', () => {
      expect(notesMatchesGenus('forked ridges underneath', 'Cantharellus')).toBe(true);
    });

    it('"apricot smell" matches Cantharellus', () => {
      expect(notesMatchesGenus('apricot smell when fresh', 'Cantharellus')).toBe(true);
    });
  });

  describe('Coprinopsis', () => {
    it('"deliquesce" matches Coprinopsis (strong tier)', () => {
      const obs: Observation = { description_notes: 'gills deliquesce into liquid' };
      const matches = matchingRulesForGenus(obs, 'Coprinopsis').filter(
        (r) => r.field === 'description_notes',
      );
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some((r) => r.tier === 'strong')).toBe(true);
    });

    it('"inky" matches Coprinopsis', () => {
      expect(notesMatchesGenus('gills turning inky black', 'Coprinopsis')).toBe(true);
    });

    it('"dissolving" matches Coprinopsis', () => {
      expect(notesMatchesGenus('gills dissolving into liquid', 'Coprinopsis')).toBe(true);
    });
  });

  describe('Agaricus', () => {
    it('"yellow stain" matches Agaricus as exclusion', () => {
      const obs: Observation = { description_notes: 'yellow stain at base of stem' };
      const matches = matchingRulesForGenus(obs, 'Agaricus').filter(
        (r) => r.field === 'description_notes',
      );
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some((r) => r.supporting === false)).toBe(true);
    });

    it('"phenol" matches Agaricus as exclusion', () => {
      const obs: Observation = { description_notes: 'smells of phenol' };
      const matches = matchingRulesForGenus(obs, 'Agaricus').filter(
        (r) => r.field === 'description_notes',
      );
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some((r) => r.supporting === false)).toBe(true);
    });

    it('"anise" matches Agaricus as supporting', () => {
      const obs: Observation = { description_notes: 'anise smell from flesh' };
      const matches = matchingRulesForGenus(obs, 'Agaricus').filter(
        (r) => r.field === 'description_notes',
      );
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some((r) => r.supporting === true)).toBe(true);
    });
  });

  describe('Amanita', () => {
    it('"volva" matches Amanita (strong tier)', () => {
      const obs: Observation = { description_notes: 'volva at the base' };
      const matches = matchingRulesForGenus(obs, 'Amanita').filter(
        (r) => r.field === 'description_notes',
      );
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some((r) => r.tier === 'strong')).toBe(true);
    });

    it('"cup at base" matches Amanita', () => {
      expect(notesMatchesGenus('cup at base of stem', 'Amanita')).toBe(true);
    });

    it('"warts on cap" matches Amanita', () => {
      expect(notesMatchesGenus('white warts on the cap surface', 'Amanita')).toBe(true);
    });
  });

  describe('Other genera', () => {
    it('"reticulated" matches Boletus', () => {
      expect(notesMatchesGenus('reticulated pattern on stem', 'Boletus')).toBe(true);
    });

    it('"scabers" matches Leccinum', () => {
      expect(notesMatchesGenus('rough scabers on stem', 'Leccinum')).toBe(true);
    });

    it('"spines underneath" matches Hydnum', () => {
      expect(notesMatchesGenus('spines underneath the cap', 'Hydnum')).toBe(true);
    });

    it('"bracket" matches Laetiporus', () => {
      expect(notesMatchesGenus('growing as a bracket on oak', 'Laetiporus')).toBe(true);
    });

    it('"marbled flesh" matches Fistulina', () => {
      expect(notesMatchesGenus('marbled flesh like steak', 'Fistulina')).toBe(true);
    });

    it('"violet" matches Lepista', () => {
      expect(notesMatchesGenus('violet stem and gills', 'Lepista')).toBe(true);
    });

    it('"bootlace" matches Armillaria', () => {
      expect(notesMatchesGenus('bootlace rhizomorphs under bark', 'Armillaria')).toBe(true);
    });

    it('"dark funnel" matches Craterellus', () => {
      expect(notesMatchesGenus('dark funnel shaped mushroom', 'Craterellus')).toBe(true);
    });

    it('"cauliflower" matches Sparassis', () => {
      expect(notesMatchesGenus('looks like a cauliflower at base of pine', 'Sparassis')).toBe(true);
    });

    it('"puffball" matches Calvatia', () => {
      expect(notesMatchesGenus('round puffball on the lawn', 'Calvatia')).toBe(true);
    });

    it('"lateral stem" matches Pleurotus', () => {
      expect(notesMatchesGenus('short lateral stem on wood', 'Pleurotus')).toBe(true);
    });
  });

  describe('User example description', () => {
    const userDescription =
      'gills are distant, cap does not roll over, stem is almost striped, the cap is almost dipped in the middle on mature specimens and the centre of the cap is darker with rings of colour around it';

    it('matches Russula rules', () => {
      const obs: Observation = { description_notes: userDescription };
      const matches = matchingRulesForGenus(obs, 'Russula').filter(
        (r) => r.field === 'description_notes',
      );
      expect(matches.length).toBeGreaterThan(0);
    });

    it('matches Lactarius rules', () => {
      const obs: Observation = { description_notes: userDescription };
      const matches = matchingRulesForGenus(obs, 'Lactarius').filter(
        (r) => r.field === 'description_notes',
      );
      expect(matches.length).toBeGreaterThan(0);
    });
  });
});
