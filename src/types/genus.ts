/** How common a genus is in the UK */
export type UKOccurrence =
  | 'very common'
  | 'common'
  | 'occasional'
  | 'uncommon'
  | 'rare';

export interface ConfidenceMarkers {
  high: string[];
  moderate: string[];
  low?: string[];
}

export interface EcologicalContext {
  habitat: string[];
  substrate: string;
  associations: string[];
  season: {
    UK: string[];
  };
}

export interface Lookalike {
  genus: string;
  distinction: string;
  danger_level: 'critical' | 'high' | 'moderate' | 'low' | 'none';
}

export interface SpeciesEntry {
  species: string;
  common_name: string;
  notes: string;
}

export interface GenusProfile {
  genus: string;
  common_names: string[];
  confidence_markers: ConfidenceMarkers;
  ecological_context: EcologicalContext;
  uk_occurrence: UKOccurrence;
  lookalike_genera: Lookalike[];
  key_species_uk: {
    edible: SpeciesEntry[];
    toxic_or_inedible: SpeciesEntry[];
  };
  foraging_heuristics: Array<{
    heuristic_id: string;
    description: string;
  }>;
  notes: string;
}
