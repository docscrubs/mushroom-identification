import type { Observation } from '@/types';

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const BOOLEAN_SUMMARIES: Record<string, { yes: string; no: string }> = {
  ring_present: { yes: 'ring present', no: 'no ring' },
  volva_present: { yes: 'volva present', no: 'no volva' },
  stem_present: { yes: 'stem present', no: 'no stem' },
  photo_available: { yes: 'photo available', no: 'no photo' },
};

const GILL_TYPE_SUMMARIES: Record<string, string> = {
  gills: 'gills',
  pores: 'pores',
  teeth: 'teeth/spines',
  smooth: 'smooth underside',
  ridges: 'ridges (false gills)',
};

const FLESH_TEXTURE_SUMMARIES: Record<string, string> = {
  brittle: 'brittle flesh',
  fibrous: 'fibrous flesh',
  soft: 'soft flesh',
  tough: 'tough flesh',
};

const CAP_SHAPE_SUMMARIES: Record<string, string> = {
  convex: 'convex cap',
  flat: 'flat cap',
  funnel: 'funnel-shaped cap',
  depressed: 'depressed cap',
  concave: 'concave cap',
  conical: 'conical cap',
  round: 'round cap',
};

const GROWTH_PATTERN_SUMMARIES: Record<string, string> = {
  solitary: 'solitary growth',
  scattered: 'scattered growth',
  clustered: 'clustered growth',
  tufted: 'tufted growth',
  ring: 'ring/arc growth',
  'fairy ring': 'fairy ring growth',
  arc: 'arc growth',
  tiered: 'tiered/shelf growth',
  overlapping: 'overlapping growth',
};

/**
 * Generate a human-readable summary for a single observation field + value.
 */
export function summarizeObservation(field: string, value: unknown): string {
  // Boolean fields
  if (field in BOOLEAN_SUMMARIES) {
    const entry = BOOLEAN_SUMMARIES[field]!;
    return value ? entry.yes : entry.no;
  }

  // Select fields with fixed mappings
  if (field === 'gill_type' && typeof value === 'string') {
    return GILL_TYPE_SUMMARIES[value] ?? value;
  }

  if (field === 'flesh_texture' && typeof value === 'string') {
    return FLESH_TEXTURE_SUMMARIES[value] ?? `${value} flesh`;
  }

  if (field === 'cap_shape' && typeof value === 'string') {
    return CAP_SHAPE_SUMMARIES[value] ?? `${value} cap`;
  }

  if (field === 'growth_pattern' && typeof value === 'string') {
    return GROWTH_PATTERN_SUMMARIES[value] ?? `${value} growth`;
  }

  if (field === 'habitat' && typeof value === 'string') {
    return `${value} habitat`;
  }

  if (field === 'substrate' && typeof value === 'string') {
    return `growing on ${value}`;
  }

  // Text input fields with descriptive patterns
  if (field === 'gill_color' && typeof value === 'string') {
    return `${value} gills`;
  }

  if (field === 'cap_color' && typeof value === 'string') {
    return `${value} cap`;
  }

  if (field === 'stem_color' && typeof value === 'string') {
    return `${value} stem`;
  }

  if (field === 'flesh_color' && typeof value === 'string') {
    return `${value} flesh`;
  }

  if (field === 'spore_print_color' && typeof value === 'string') {
    return `${value} spore print`;
  }

  if (field === 'smell' && typeof value === 'string') {
    return `smells of ${value}`;
  }

  if (field === 'bruising_color' && typeof value === 'string') {
    return `bruises ${value}`;
  }

  // Numeric fields
  if (field === 'cap_size_cm' && typeof value === 'number') {
    return `cap ~${value}cm`;
  }

  if (field === 'season_month' && typeof value === 'number') {
    return MONTH_NAMES[value] ?? `month ${value}`;
  }

  // Fallback: just format the field name + value
  if (typeof value === 'string') {
    return `${field.replace(/_/g, ' ')}: ${value}`;
  }

  return field.replace(/_/g, ' ');
}

/**
 * Summarize all observed fields in an Observation.
 */
export function summarizeAllObservations(observation: Observation): string[] {
  const summaries: string[] = [];
  for (const [key, value] of Object.entries(observation)) {
    if (value !== null && value !== undefined && value !== '') {
      summaries.push(summarizeObservation(key, value));
    }
  }
  return summaries;
}
