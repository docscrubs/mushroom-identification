/**
 * Types for the 268-species enriched dataset from Wild Food UK.
 * Named `DatasetSpecies` to avoid collision with the existing
 * `SpeciesEntry` type in genus.ts (which is for genus-level species lists).
 */

export interface EdibilityDetail {
  status: 'edible' | 'edible_with_caution' | 'inedible' | 'toxic' | 'deadly';
  danger_level: 'safe' | 'caution' | 'dangerous' | 'deadly';
  requires_cooking: boolean;
  beginner_safe: boolean;
  notes: string | null;
}

export interface DatasetSpecies {
  name: string;
  scientific_name: string;
  common_names: string | null;
  synonyms: string | null;
  edibility: string;
  about: string | null;
  season_start: string;
  season_end: string;
  average_mushroom_height_cm: string | null;
  average_cap_width_cm: string | null;
  cap: string | null;
  under_cap_description: string | null;
  stem: string | null;
  skirt: string | null;
  flesh: string | null;
  habitat: string | null;
  possible_confusion: string | null;
  spore_print: string | null;
  taste: string | null;
  smell: string | null;
  frequency: string | null;
  other_facts: string | null;
  extra_features: Record<string, unknown> | null;
  source_url: string;

  // Enriched structured fields
  cap_width_min_cm: number | null;
  cap_width_max_cm: number | null;
  height_min_cm: number | null;
  height_max_cm: number | null;
  season_start_month: number;
  season_end_month: number;
  edibility_detail: EdibilityDetail;
  diagnostic_features: string[] | null;
  safety_checks: string[] | null;
}
