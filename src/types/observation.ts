/** Confidence in a user-provided observation */
export type ObservationConfidence = 'certain' | 'likely' | 'unsure';

/**
 * A field observation. Every field is optional.
 * null = not observed (not "absent").
 */
export interface Observation {
  // Morphological features
  cap_color?: string | null;
  cap_size_cm?: number | null;
  cap_shape?: string | null;
  cap_texture?: string | null;
  gill_type?: 'gills' | 'pores' | 'teeth' | 'smooth' | 'ridges' | null;
  gill_color?: string | null;
  gill_attachment?: string | null;
  stem_present?: boolean | null;
  stem_color?: string | null;
  ring_present?: boolean | null;
  volva_present?: boolean | null;
  spore_print_color?: string | null;
  flesh_color?: string | null;
  flesh_texture?: string | null;
  bruising_color?: string | null;
  smell?: string | null;
  taste?: string | null;

  // Ecological context
  habitat?: string | null;
  substrate?: string | null;
  substrate_confidence?: ObservationConfidence;
  nearby_trees?: string[] | null;
  tree_confidence?: ObservationConfidence;
  season_month?: number;
  region?: string | null;
  growth_pattern?: string | null;

  // Meta
  photo_available?: boolean;
  observation_conditions?: string;
}
