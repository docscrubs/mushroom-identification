import { seedGenera } from './seed-genera';
import { seedHeuristics } from './seed-heuristics';

describe('Seed Genera', () => {
  it('contains 20 priority UK foraging genera', () => {
    expect(seedGenera.length).toBe(20);
  });

  it('has unique genus names', () => {
    const genera = seedGenera.map((g) => g.genus);
    const unique = new Set(genera);
    expect(unique.size).toBe(genera.length);
  });

  it('every genus profile has required fields', () => {
    for (const g of seedGenera) {
      expect(g.genus).toBeTruthy();
      expect(g.common_names.length).toBeGreaterThan(0);
      expect(g.confidence_markers.high.length).toBeGreaterThan(0);
      expect(g.ecological_context.habitat.length).toBeGreaterThan(0);
      expect(g.ecological_context.season.UK.length).toBeGreaterThan(0);
      expect(g.uk_occurrence).toBeTruthy();
      expect(g.notes).toBeTruthy();
    }
  });

  it('all priority genera from the plan are present', () => {
    const genera = seedGenera.map((g) => g.genus);
    const expected = [
      'Amanita',
      'Agaricus',
      'Russula',
      'Boletus',
      'Cantharellus',
      'Lactarius',
      'Pleurotus',
      'Macrolepiota',
      'Coprinopsis',
      'Hydnum',
      'Laetiporus',
      'Fistulina',
      'Marasmius',
      'Craterellus',
      'Sparassis',
      'Calvatia',
      'Leccinum',
      'Armillaria',
      'Clitocybe',
      'Lepista',
    ];
    for (const g of expected) {
      expect(genera).toContain(g);
    }
  });

  describe('Heuristic References', () => {
    it('every genus references at least one heuristic', () => {
      for (const g of seedGenera) {
        expect(
          g.foraging_heuristics.length,
        ).toBeGreaterThan(0);
      }
    });

    it('all referenced heuristics exist in seed heuristics', () => {
      const heuristicIds = new Set(
        seedHeuristics.map((h) => h.heuristic_id),
      );
      for (const g of seedGenera) {
        for (const ref of g.foraging_heuristics) {
          expect(heuristicIds.has(ref.heuristic_id)).toBe(true);
        }
      }
    });
  });

  describe('Safety-critical genera', () => {
    it('Amanita has lookalike warnings', () => {
      const amanita = seedGenera.find((g) => g.genus === 'Amanita');
      expect(amanita).toBeDefined();
      expect(amanita!.lookalike_genera.length).toBeGreaterThan(0);
      expect(
        amanita!.lookalike_genera.some((l) => l.danger_level === 'critical'),
      ).toBe(true);
    });

    it('Agaricus warns about Amanita confusion', () => {
      const agaricus = seedGenera.find((g) => g.genus === 'Agaricus');
      expect(agaricus).toBeDefined();
      expect(
        agaricus!.lookalike_genera.some((l) => l.genus === 'Amanita'),
      ).toBe(true);
    });

    it('Macrolepiota warns about both Amanita and Lepiota', () => {
      const macro = seedGenera.find((g) => g.genus === 'Macrolepiota');
      expect(macro).toBeDefined();
      const lookalikeGenera = macro!.lookalike_genera.map((l) => l.genus);
      expect(lookalikeGenera).toContain('Amanita');
      expect(lookalikeGenera).toContain('Lepiota');
    });

    it('Calvatia warns about Amanita egg confusion', () => {
      const calvatia = seedGenera.find((g) => g.genus === 'Calvatia');
      expect(calvatia).toBeDefined();
      expect(
        calvatia!.lookalike_genera.some((l) => l.genus === 'Amanita'),
      ).toBe(true);
    });

    it('Armillaria warns about Galerina', () => {
      const armillaria = seedGenera.find((g) => g.genus === 'Armillaria');
      expect(armillaria).toBeDefined();
      expect(
        armillaria!.lookalike_genera.some((l) => l.genus === 'Galerina'),
      ).toBe(true);
    });

    it('Lepista warns about Cortinarius', () => {
      const lepista = seedGenera.find((g) => g.genus === 'Lepista');
      expect(lepista).toBeDefined();
      expect(
        lepista!.lookalike_genera.some((l) => l.genus === 'Cortinarius'),
      ).toBe(true);
    });

    it('Marasmius warns about Clitocybe', () => {
      const marasmius = seedGenera.find((g) => g.genus === 'Marasmius');
      expect(marasmius).toBeDefined();
      expect(
        marasmius!.lookalike_genera.some((l) => l.genus === 'Clitocybe'),
      ).toBe(true);
    });
  });

  describe('Toxic species coverage', () => {
    it('Amanita lists Death Cap and Destroying Angel', () => {
      const amanita = seedGenera.find((g) => g.genus === 'Amanita');
      expect(amanita).toBeDefined();
      const toxicSpecies = amanita!.key_species_uk.toxic_or_inedible.map(
        (s) => s.species,
      );
      expect(toxicSpecies).toContain('phalloides');
      expect(toxicSpecies).toContain('virosa');
    });

    it('Clitocybe lists deadly species', () => {
      const clitocybe = seedGenera.find((g) => g.genus === 'Clitocybe');
      expect(clitocybe).toBeDefined();
      const toxicSpecies = clitocybe!.key_species_uk.toxic_or_inedible.map(
        (s) => s.species,
      );
      expect(toxicSpecies).toContain('rivulosa');
      expect(toxicSpecies).toContain('dealbata');
    });
  });
});
