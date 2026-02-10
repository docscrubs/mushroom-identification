import { seedHeuristics } from './seed-heuristics';

describe('Seed Heuristics', () => {
  it('contains all expected heuristics', () => {
    expect(seedHeuristics.length).toBe(27);
  });

  it('has unique heuristic IDs', () => {
    const ids = seedHeuristics.map((h) => h.heuristic_id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('every heuristic has required fields', () => {
    for (const h of seedHeuristics) {
      expect(h.heuristic_id).toBeTruthy();
      expect(h.name).toBeTruthy();
      expect(h.category).toBeTruthy();
      expect(h.applies_to).toBeDefined();
      expect(h.applies_to.confidence_required).toBeTruthy();
      expect(h.procedure).toBeTruthy();
      expect(h.outcomes.length).toBeGreaterThan(0);
      expect(h.source).toBeTruthy();
    }
  });

  it('every outcome has required fields', () => {
    for (const h of seedHeuristics) {
      for (const outcome of h.outcomes) {
        expect(outcome.condition).toBeTruthy();
        expect(outcome.conclusion).toBeTruthy();
        expect(outcome.confidence).toBeTruthy();
        expect(outcome.action).toBeTruthy();
      }
    }
  });

  describe('Safety Rules', () => {
    const safetyRules = seedHeuristics.filter(
      (h) => h.category === 'safety_rule',
    );

    it('contains all expected safety rules', () => {
      const ids = safetyRules.map((h) => h.heuristic_id);
      expect(ids).toContain('avoid_lbms');
      expect(ids).toContain('amanita_recognition_warning');
      expect(ids).toContain('puffball_slice_safety_check');
      expect(ids).toContain('avoid_small_lepiota');
      expect(ids).toContain('clitocybe_rivulosa_warning');
      expect(ids).toContain('galerina_marginata_warning');
      expect(ids).toContain('cortinarius_avoidance');
      expect(ids).toContain('coprinopsis_alcohol_warning');
    });

    it('all safety rules are critical priority', () => {
      for (const rule of safetyRules) {
        expect(rule.priority).toBe('critical');
      }
    });

    it('safety rules have safety metadata', () => {
      for (const rule of safetyRules) {
        const hasSafetyInfo =
          rule.safety !== undefined ||
          rule.rationale !== undefined ||
          (rule.safety_notes !== undefined && rule.safety_notes.length > 0);
        expect(hasSafetyInfo).toBe(true);
      }
    });

    it('amanita warning has low false_negative_risk', () => {
      const amanita = safetyRules.find(
        (h) => h.heuristic_id === 'amanita_recognition_warning',
      );
      expect(amanita).toBeDefined();
      expect(amanita!.safety!.false_negative_risk).toBe('low');
    });
  });

  describe('Discrimination Heuristics', () => {
    const discriminations = seedHeuristics.filter(
      (h) => h.category === 'discrimination',
    );

    it('contains all expected discrimination heuristics', () => {
      const ids = discriminations.map((h) => h.heuristic_id);
      expect(ids).toContain('agaricus_vs_amanita_discrimination');
      expect(ids).toContain('macrolepiota_vs_lepiota_vs_amanita');
      expect(ids).toContain('chanterelle_vs_false_chanterelle');
      expect(ids).toContain('marasmius_vs_clitocybe_rivulosa');
      expect(ids).toContain('armillaria_vs_galerina');
      expect(ids).toContain('lepista_vs_cortinarius');
      expect(ids).toContain('puffball_vs_amanita_egg');
    });

    it('critical discriminations are marked critical priority', () => {
      const criticalPairs = [
        'agaricus_vs_amanita_discrimination',
        'macrolepiota_vs_lepiota_vs_amanita',
        'marasmius_vs_clitocybe_rivulosa',
        'armillaria_vs_galerina',
        'lepista_vs_cortinarius',
        'puffball_vs_amanita_egg',
      ];
      for (const id of criticalPairs) {
        const h = discriminations.find((d) => d.heuristic_id === id);
        expect(h).toBeDefined();
        expect(h!.priority).toBe('critical');
      }
    });

    it('discrimination heuristics have at least 2 outcomes', () => {
      for (const h of discriminations) {
        expect(h.outcomes.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('Agaricus vs Amanita has AVOID outcome for amanita', () => {
      const h = discriminations.find(
        (d) => d.heuristic_id === 'agaricus_vs_amanita_discrimination',
      );
      expect(h).toBeDefined();
      const avoidOutcome = h!.outcomes.find((o) => o.conclusion === 'AVOID');
      expect(avoidOutcome).toBeDefined();
      expect(avoidOutcome!.condition.toLowerCase()).toContain('volva');
    });
  });

  describe('Edibility Determination Heuristics', () => {
    const edibilityTests = seedHeuristics.filter(
      (h) => h.category === 'edibility_determination',
    );

    it('contains all expected edibility tests', () => {
      const ids = edibilityTests.map((h) => h.heuristic_id);
      expect(ids).toContain('russula_taste_test');
      expect(ids).toContain('lactarius_milk_color');
      expect(ids).toContain('agaricus_yellow_stain_test');
      expect(ids).toContain('puffball_interior_check');
      expect(ids).toContain('coprinopsis_freshness_check');
      expect(ids).toContain('laetiporus_host_tree_check');
      expect(ids).toContain('bolete_red_pore_test');
    });

    it('edibility tests require at least moderate confidence', () => {
      for (const h of edibilityTests) {
        const level = h.applies_to.confidence_required;
        expect(['moderate', 'high', 'definitive']).toContain(level);
      }
    });

    it('russula taste test has 3 outcomes (mild, peppery, uncertain)', () => {
      const h = edibilityTests.find(
        (d) => d.heuristic_id === 'russula_taste_test',
      );
      expect(h).toBeDefined();
      expect(h!.outcomes.length).toBe(3);
      expect(h!.outcomes.map((o) => o.id)).toEqual([
        'mild',
        'peppery',
        'uncertain',
      ]);
    });

    it('yellow stain test detects A. xanthodermus', () => {
      const h = edibilityTests.find(
        (d) => d.heuristic_id === 'agaricus_yellow_stain_test',
      );
      expect(h).toBeDefined();
      const rejectOutcome = h!.outcomes.find((o) => o.conclusion === 'REJECT');
      expect(rejectOutcome).toBeDefined();
      expect(rejectOutcome!.condition.toLowerCase()).toContain('chrome yellow');
    });
  });

  describe('Ecological Context Heuristics', () => {
    const ecological = seedHeuristics.filter(
      (h) => h.category === 'ecological_context',
    );

    it('contains all expected ecological heuristics', () => {
      const ids = ecological.map((h) => h.heuristic_id);
      expect(ids).toContain('death_cap_habitat_alert');
      expect(ids).toContain('grassland_vs_woodland_context');
      expect(ids).toContain('mycorrhizal_tree_association');
      expect(ids).toContain('uk_seasonal_fruiting_guide');
    });

    it('seasonal guide covers all UK seasons', () => {
      const seasonal = ecological.find(
        (h) => h.heuristic_id === 'uk_seasonal_fruiting_guide',
      );
      expect(seasonal).toBeDefined();
      const outcomeIds = seasonal!.outcomes.map((o) => o.id);
      expect(outcomeIds).toContain('spring');
      expect(outcomeIds).toContain('early_summer');
      expect(outcomeIds).toContain('peak_season');
      expect(outcomeIds).toContain('late_season');
    });

    it('tree association covers major UK tree types', () => {
      const trees = ecological.find(
        (h) => h.heuristic_id === 'mycorrhizal_tree_association',
      );
      expect(trees).toBeDefined();
      const outcomeIds = trees!.outcomes.map((o) => o.id);
      expect(outcomeIds).toContain('birch');
      expect(outcomeIds).toContain('oak');
      expect(outcomeIds).toContain('beech');
      expect(outcomeIds).toContain('pine');
    });
  });

  describe('Category Distribution', () => {
    it('has heuristics in all categories', () => {
      const categories = new Set(seedHeuristics.map((h) => h.category));
      expect(categories).toContain('safety_rule');
      expect(categories).toContain('safety_screening');
      expect(categories).toContain('edibility_determination');
      expect(categories).toContain('discrimination');
      expect(categories).toContain('ecological_context');
    });

    it('has the expected count per category', () => {
      const counts: Record<string, number> = {};
      for (const h of seedHeuristics) {
        counts[h.category] = (counts[h.category] || 0) + 1;
      }
      expect(counts['safety_rule']).toBe(8);
      expect(counts['safety_screening']).toBe(1);
      expect(counts['edibility_determination']).toBe(7);
      expect(counts['discrimination']).toBe(7);
      expect(counts['ecological_context']).toBe(4);
    });
  });

  describe('LLM Context', () => {
    it('all critical heuristics have llm_context', () => {
      const critical = seedHeuristics.filter(
        (h) => h.priority === 'critical',
      );
      for (const h of critical) {
        expect(h.llm_context).toBeTruthy();
      }
    });
  });

  describe('Safety-critical heuristics are not user-forkable', () => {
    it('no safety rule allows forking', () => {
      const safetyRules = seedHeuristics.filter(
        (h) => h.category === 'safety_rule',
      );
      for (const rule of safetyRules) {
        if (rule.user_editable) {
          expect(rule.user_editable.allow_fork).toBe(false);
        }
      }
    });
  });
});
