import { MushroomDB } from '@/db/database';
import { recordCalibration, getCalibrationSummary } from './calibration';
import type { LLMDirectIdentification, IdentificationResult } from '@/types';

function makeResult(topGenus: string, confidence: string = 'high'): IdentificationResult {
  return {
    candidates: [
      {
        genus: topGenus,
        common_name: topGenus,
        confidence: confidence as 'high',
        score: 0.85,
        matching_evidence: [],
        contradicting_evidence: [],
        missing_evidence: [],
      },
    ],
    reasoning_chain: [],
    safety: {
      toxicity: 'unknown',
      warnings: [],
      dangerous_lookalikes: [],
      confidence_sufficient_for_foraging: false,
    },
    suggested_actions: [],
    follow_up_questions: [],
    ambiguities: [],
    triggered_heuristics: [],
  };
}

describe('Calibration Data Capture', () => {
  let db: MushroomDB;

  beforeEach(() => {
    db = new MushroomDB(`test-calibration-${Date.now()}-${Math.random()}`);
  });

  describe('recordCalibration', () => {
    it('records agreement when LLM genus matches rule engine top candidate', async () => {
      const llmOpinion: LLMDirectIdentification = {
        genus_guess: 'Russula',
        species_guess: 'cyanoxantha',
        confidence: 'high',
        reasoning: 'Brittle flesh suggests Russula',
      };

      const opinion = await recordCalibration(
        db,
        llmOpinion,
        makeResult('Russula'),
        'session-1',
      );

      expect(opinion.agreed_with_rule_engine).toBe(true);
      expect(opinion.genus_guess).toBe('Russula');
    });

    it('records disagreement when LLM genus does not match', async () => {
      const llmOpinion: LLMDirectIdentification = {
        genus_guess: 'Lactarius',
        species_guess: null,
        confidence: 'medium',
        reasoning: 'Could be a milk cap',
      };

      const opinion = await recordCalibration(
        db,
        llmOpinion,
        makeResult('Russula'),
        'session-2',
      );

      expect(opinion.agreed_with_rule_engine).toBe(false);
    });

    it('handles null LLM genus guess', async () => {
      const llmOpinion: LLMDirectIdentification = {
        genus_guess: null,
        species_guess: null,
        confidence: 'low',
        reasoning: 'Cannot determine genus',
      };

      const opinion = await recordCalibration(
        db,
        llmOpinion,
        makeResult('Russula'),
        'session-3',
      );

      expect(opinion.agreed_with_rule_engine).toBe(false);
      expect(opinion.genus_guess).toBeNull();
    });
  });

  describe('getCalibrationSummary', () => {
    it('returns zero counts when no data exists', async () => {
      const summary = await getCalibrationSummary(db);
      expect(summary.total).toBe(0);
      expect(summary.agreements).toBe(0);
      expect(summary.disagreements).toBe(0);
    });

    it('counts agreements and disagreements', async () => {
      // Record 2 agreements and 1 disagreement
      await db.identificationSessions.add({
        session_id: 's1',
        date: new Date().toISOString(),
        observation: {},
        llm_opinion: {
          genus_guess: 'Russula', species_guess: null,
          confidence: 'high', reasoning: '', agreed_with_rule_engine: true,
        },
      });
      await db.identificationSessions.add({
        session_id: 's2',
        date: new Date().toISOString(),
        observation: {},
        llm_opinion: {
          genus_guess: 'Boletus', species_guess: null,
          confidence: 'high', reasoning: '', agreed_with_rule_engine: true,
        },
      });
      await db.identificationSessions.add({
        session_id: 's3',
        date: new Date().toISOString(),
        observation: {},
        llm_opinion: {
          genus_guess: 'Lactarius', species_guess: null,
          confidence: 'medium', reasoning: '', agreed_with_rule_engine: false,
        },
      });

      const summary = await getCalibrationSummary(db);
      expect(summary.total).toBe(3);
      expect(summary.agreements).toBe(2);
      expect(summary.disagreements).toBe(1);
      expect(summary.agreement_rate).toBeCloseTo(2 / 3);
    });
  });
});
