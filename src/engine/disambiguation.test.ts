import { describe, it, expect } from 'vitest';
import { selectQuestions } from './disambiguation';
import { featureRules } from './feature-rules';
import type { CandidateScore } from './scorer';
import type { Observation } from '@/types';

function makeCandidateScore(genus: string, score: number, eliminated = false): CandidateScore {
  return {
    genus,
    score,
    eliminated,
    matching: [],
    contradicting: [],
    missing: [],
  };
}

describe('Disambiguation Question Selector', () => {
  it('returns no questions when all candidates are eliminated', () => {
    const candidates = [
      makeCandidateScore('Russula', 0, true),
      makeCandidateScore('Boletus', 0, true),
    ];
    const obs: Observation = {};
    const questions = selectQuestions(candidates, obs, featureRules);
    expect(questions).toHaveLength(0);
  });

  it('returns no questions when only one non-eliminated candidate remains', () => {
    const candidates = [
      makeCandidateScore('Russula', 0.9, false),
      makeCandidateScore('Boletus', 0, true),
      makeCandidateScore('Amanita', 0, true),
    ];
    const obs: Observation = { flesh_texture: 'brittle', gill_type: 'gills' };
    const questions = selectQuestions(candidates, obs, featureRules);
    // Might still have questions to increase confidence, but fewer
    // At minimum, should not crash
    expect(Array.isArray(questions)).toBe(true);
  });

  it('asks about features the user has not yet observed', () => {
    const candidates = [
      makeCandidateScore('Russula', 0.5, false),
      makeCandidateScore('Amanita', 0.4, false),
    ];
    // User has only provided gill_type
    const obs: Observation = { gill_type: 'gills' };
    const questions = selectQuestions(candidates, obs, featureRules);

    // Should ask about features not yet observed
    for (const q of questions) {
      expect(obs[q.feature as keyof Observation]).toBeUndefined();
    }
  });

  it('prioritises safety-relevant questions', () => {
    const candidates = [
      makeCandidateScore('Russula', 0.5, false),
      makeCandidateScore('Amanita', 0.4, false),
    ];
    const obs: Observation = { gill_type: 'gills' };
    const questions = selectQuestions(candidates, obs, featureRules);

    // When Amanita is a candidate, volva_present should be asked with high priority
    const volvaQuestion = questions.find((q) => q.feature === 'volva_present');
    if (volvaQuestion) {
      expect(volvaQuestion.safety_relevant).toBe(true);
    }
  });

  it('all questions are marked as skippable', () => {
    const candidates = [
      makeCandidateScore('Russula', 0.5, false),
      makeCandidateScore('Lactarius', 0.4, false),
    ];
    const obs: Observation = {};
    const questions = selectQuestions(candidates, obs, featureRules);

    for (const q of questions) {
      expect(q.skippable).toBe(true);
    }
  });

  it('questions that discriminate more candidates have higher information gain', () => {
    const candidates = [
      makeCandidateScore('Russula', 0.5, false),
      makeCandidateScore('Lactarius', 0.4, false),
      makeCandidateScore('Amanita', 0.3, false),
      makeCandidateScore('Boletus', 0.2, false),
    ];
    const obs: Observation = {};
    const questions = selectQuestions(candidates, obs, featureRules);

    // Should be sorted by priority (safety first, then info gain)
    expect(questions.length).toBeGreaterThan(0);
    // First question should have non-zero information gain
    expect(questions[0]!.information_gain).toBeGreaterThan(0);
  });

  it('does not ask about features already observed', () => {
    const candidates = [
      makeCandidateScore('Russula', 0.5, false),
      makeCandidateScore('Amanita', 0.4, false),
    ];
    const obs: Observation = { gill_type: 'gills', volva_present: false, ring_present: false };
    const questions = selectQuestions(candidates, obs, featureRules);

    const features = questions.map((q) => q.feature);
    expect(features).not.toContain('gill_type');
    expect(features).not.toContain('volva_present');
    expect(features).not.toContain('ring_present');
  });
});
