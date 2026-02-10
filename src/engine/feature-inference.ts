import type { Observation } from '@/types';

export interface InferredFeature {
  field: keyof Observation;
  value: unknown;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface InferenceResult {
  observation: Observation;
  inferences: InferredFeature[];
}

/**
 * Infer implicit features from context.
 * Never overrides explicitly set fields. Returns a new object.
 *
 * @param observation The user's raw observation
 * @param now Injectable date for testability (defaults to current date)
 */
export function inferFeatures(observation: Observation, now: Date = new Date()): InferenceResult {
  const obs = { ...observation };
  const inferences: InferredFeature[] = [];

  const hasOtherObservations = Object.keys(observation).some(
    (k) => k !== 'season_month' && observation[k as keyof Observation] !== null && observation[k as keyof Observation] !== undefined,
  );

  // Growth pattern → substrate
  if (obs.growth_pattern === 'tiered' && obs.substrate == null) {
    obs.substrate = 'wood';
    inferences.push({
      field: 'substrate',
      value: 'wood',
      reason: 'Tiered/shelf growth almost always occurs on wood',
      confidence: 'high',
    });
  }

  // Habitat → substrate
  if (obs.substrate == null && (obs.habitat === 'parkland' || obs.habitat === 'grassland' || obs.habitat === 'garden')) {
    obs.substrate = 'soil';
    inferences.push({
      field: 'substrate',
      value: 'soil',
      reason: `${obs.habitat} habitat implies soil substrate`,
      confidence: 'medium',
    });
  }

  // Substrate → habitat
  if (obs.substrate === 'dung' && obs.habitat == null) {
    obs.habitat = 'grassland';
    inferences.push({
      field: 'habitat',
      value: 'grassland',
      reason: 'Dung substrate implies grassland habitat',
      confidence: 'medium',
    });
  }

  // Wood + tiered → no stem (bracket fungi)
  if (obs.substrate === 'wood' && obs.growth_pattern === 'tiered' && obs.stem_present == null) {
    obs.stem_present = false;
    inferences.push({
      field: 'stem_present',
      value: false,
      reason: 'Tiered growth on wood suggests bracket fungi (no stem)',
      confidence: 'medium',
    });
  }

  // Auto-populate season_month (only if other observations exist)
  if (obs.season_month == null && hasOtherObservations) {
    const month = now.getMonth() + 1; // 1-indexed
    obs.season_month = month;
    inferences.push({
      field: 'season_month',
      value: month,
      reason: 'Season inferred from current date',
      confidence: 'high',
    });
  }

  return { observation: obs, inferences };
}
