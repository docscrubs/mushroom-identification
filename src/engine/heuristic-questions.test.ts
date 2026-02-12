import { describe, it, expect } from 'vitest';
import {
  findApplicableHeuristics,
  generateHeuristicActions,
  type TriggeredHeuristic,
} from './heuristic-questions';
import { seedHeuristics } from '@/data/seed-heuristics';
import type { CandidateScore } from './scorer';

function makeCandidateScore(genus: string, score: number): CandidateScore {
  return {
    genus,
    score,
    eliminated: false,
    matching: [],
    contradicting: [],
    missing: [],
  };
}

describe('findApplicableHeuristics', () => {
  it('finds Russula taste test when Russula is a high-confidence candidate', () => {
    const candidates = [makeCandidateScore('Russula', 0.7)];
    const result = findApplicableHeuristics(candidates, seedHeuristics);
    expect(result.some((h) => h.heuristic_id === 'russula_taste_test')).toBe(true);
  });

  it('finds Agaricus vs Amanita discrimination when Agaricus is a candidate', () => {
    const candidates = [
      makeCandidateScore('Agaricus', 0.4),
      makeCandidateScore('Amanita', 0.3),
    ];
    const result = findApplicableHeuristics(candidates, seedHeuristics);
    expect(result.some((h) => h.heuristic_id === 'agaricus_vs_amanita_discrimination')).toBe(true);
  });

  it('finds Marasmius vs Clitocybe discrimination when Marasmius is a candidate', () => {
    const candidates = [makeCandidateScore('Marasmius', 0.5)];
    const result = findApplicableHeuristics(candidates, seedHeuristics);
    expect(result.some((h) => h.heuristic_id === 'marasmius_vs_clitocybe_rivulosa')).toBe(true);
  });

  it('finds Armillaria vs Galerina discrimination when Armillaria is a candidate', () => {
    const candidates = [makeCandidateScore('Armillaria', 0.4)];
    const result = findApplicableHeuristics(candidates, seedHeuristics);
    expect(result.some((h) => h.heuristic_id === 'armillaria_vs_galerina')).toBe(true);
  });

  it('finds Lactarius milk color test when Lactarius is a high-confidence candidate', () => {
    const candidates = [makeCandidateScore('Lactarius', 0.7)];
    const result = findApplicableHeuristics(candidates, seedHeuristics);
    expect(result.some((h) => h.heuristic_id === 'lactarius_milk_color')).toBe(true);
  });

  it('does not return heuristics for genera that are not candidates', () => {
    const candidates = [makeCandidateScore('Boletus', 0.5)];
    const result = findApplicableHeuristics(candidates, seedHeuristics);
    expect(result.some((h) => h.heuristic_id === 'russula_taste_test')).toBe(false);
  });

  it('respects confidence_required — does not return high-confidence heuristics for low-scoring candidates', () => {
    // Russula taste test requires 'high' confidence
    const candidates = [makeCandidateScore('Russula', 0.2)];
    const result = findApplicableHeuristics(candidates, seedHeuristics);
    expect(result.some((h) => h.heuristic_id === 'russula_taste_test')).toBe(false);
  });

  it('returns discrimination heuristics even at low confidence (they help distinguish)', () => {
    // Agaricus vs Amanita requires 'low' confidence
    const candidates = [makeCandidateScore('Agaricus', 0.2)];
    const result = findApplicableHeuristics(candidates, seedHeuristics);
    expect(result.some((h) => h.heuristic_id === 'agaricus_vs_amanita_discrimination')).toBe(true);
  });

  it('returns empty array when no candidates match', () => {
    const candidates: CandidateScore[] = [];
    const result = findApplicableHeuristics(candidates, seedHeuristics);
    expect(result).toEqual([]);
  });
});

describe('generateHeuristicActions', () => {
  it('generates suggested actions from heuristic procedures', () => {
    const candidates = [
      makeCandidateScore('Agaricus', 0.4),
      makeCandidateScore('Amanita', 0.3),
    ];
    const triggered = findApplicableHeuristics(candidates, seedHeuristics);
    const actions = generateHeuristicActions(triggered);

    expect(actions.length).toBeGreaterThan(0);
    // Critical safety heuristics should produce critical-priority actions
    expect(actions.some((a) => a.priority === 'critical')).toBe(true);
  });

  it('includes the heuristic name in the action reason', () => {
    const candidates = [makeCandidateScore('Marasmius', 0.5)];
    const triggered = findApplicableHeuristics(candidates, seedHeuristics);
    const actions = generateHeuristicActions(triggered);

    const marasmiusActions = actions.filter((a) => a.reason.includes('Fairy Ring'));
    expect(marasmiusActions.length).toBeGreaterThan(0);
  });

  it('marks safety-relevant heuristic actions appropriately', () => {
    const candidates = [
      makeCandidateScore('Agaricus', 0.4),
      makeCandidateScore('Amanita', 0.3),
    ];
    const triggered = findApplicableHeuristics(candidates, seedHeuristics);
    const actions = generateHeuristicActions(triggered);

    // Agaricus vs Amanita is safety-critical
    expect(actions.some((a) => a.safety_relevant)).toBe(true);
  });

  it('extracts concrete procedure steps as actions', () => {
    const candidates = [
      makeCandidateScore('Agaricus', 0.4),
    ];
    const triggered = findApplicableHeuristics(candidates, seedHeuristics);
    const actions = generateHeuristicActions(triggered);

    // Should contain the volva check step from Agaricus vs Amanita
    expect(actions.some((a) => a.action.toLowerCase().includes('volva'))).toBe(true);
  });

  it('returns empty array when no heuristics apply', () => {
    const actions = generateHeuristicActions([]);
    expect(actions).toEqual([]);
  });
});

describe('TriggeredHeuristic shape', () => {
  it('includes heuristic_id, name, genus, and category', () => {
    const candidates = [makeCandidateScore('Russula', 0.7)];
    const triggered = findApplicableHeuristics(candidates, seedHeuristics);
    const russulaH = triggered.find((h) => h.heuristic_id === 'russula_taste_test');

    expect(russulaH).toBeDefined();
    expect(russulaH!.name).toBe('Russula Taste Test');
    expect(russulaH!.genus).toBe('Russula');
    expect(russulaH!.category).toBe('edibility_determination');
  });
});
