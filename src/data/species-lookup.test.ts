import { speciesDataset } from './species-dataset';
import {
  findSpeciesByName,
  lookupCandidateSpecies,
  extractConfusionSpeciesNames,
  serializeForVerification,
} from './species-lookup';

describe('findSpeciesByName', () => {
  it('finds a species by exact common name', () => {
    const result = findSpeciesByName('Death Cap', speciesDataset);
    expect(result).toBeDefined();
    expect(result!.scientific_name).toBe('Amanita phalloides');
  });

  it('finds a species by exact scientific name', () => {
    const result = findSpeciesByName('Amanita phalloides', speciesDataset);
    expect(result).toBeDefined();
    expect(result!.name).toBe('Deathcap');
  });

  it('matches case-insensitively on common name', () => {
    const result = findSpeciesByName('death cap', speciesDataset);
    expect(result).toBeDefined();
    expect(result!.scientific_name).toBe('Amanita phalloides');
  });

  it('matches case-insensitively on scientific name', () => {
    const result = findSpeciesByName('amanita phalloides', speciesDataset);
    expect(result).toBeDefined();
    expect(result!.name).toBe('Deathcap');
  });

  it('handles spacing/hyphenation variants (Death Cap → Deathcap)', () => {
    const result = findSpeciesByName('Death Cap', speciesDataset);
    expect(result).toBeDefined();
    expect(result!.name).toBe('Deathcap');
  });

  it('handles spacing/hyphenation variants (Deathcap → Deathcap)', () => {
    const result = findSpeciesByName('Deathcap', speciesDataset);
    expect(result).toBeDefined();
    expect(result!.scientific_name).toBe('Amanita phalloides');
  });

  it('handles "The" prefix variants (Blusher → The Blusher)', () => {
    const result = findSpeciesByName('Blusher', speciesDataset);
    expect(result).toBeDefined();
    expect(result!.scientific_name).toBe('Amanita rubescens');
  });

  it('returns undefined for unknown species', () => {
    const result = findSpeciesByName('Unicorn Mushroom', speciesDataset);
    expect(result).toBeUndefined();
  });

  it('finds Field Mushroom by name', () => {
    const result = findSpeciesByName('Field Mushroom', speciesDataset);
    expect(result).toBeDefined();
    expect(result!.scientific_name).toBe('Agaricus campestris');
  });

  it('finds species with slash in scientific name', () => {
    const result = findSpeciesByName(
      'Rubroboletus satanas',
      speciesDataset,
    );
    expect(result).toBeDefined();
    expect(result!.name).toBe("Devil's Bolete");
  });
});

describe('extractConfusionSpeciesNames', () => {
  it('extracts species names from possible_confusion text', () => {
    const fieldMushroom = speciesDataset.find(
      (s) => s.scientific_name === 'Agaricus campestris',
    )!;
    const names = extractConfusionSpeciesNames(fieldMushroom);
    expect(names.length).toBeGreaterThan(0);
  });

  it('extracts scientific names in parentheses', () => {
    const fieldMushroom = speciesDataset.find(
      (s) => s.scientific_name === 'Agaricus campestris',
    )!;
    const names = extractConfusionSpeciesNames(fieldMushroom);
    // Field Mushroom's possible_confusion mentions Yellow Stainer
    expect(names).toContain('Agaricus xanthodermus');
  });

  it('returns empty array when possible_confusion is null', () => {
    const species = speciesDataset.find(
      (s) => s.possible_confusion === null,
    )!;
    const names = extractConfusionSpeciesNames(species);
    expect(names).toEqual([]);
  });

  it('does not return duplicate names', () => {
    // Test with any species that mentions the same confusion species more than once
    for (const species of speciesDataset) {
      const names = extractConfusionSpeciesNames(species);
      const unique = new Set(names);
      expect(names.length).toBe(unique.size);
    }
  });
});

describe('lookupCandidateSpecies', () => {
  it('returns matched species for known candidate names', () => {
    const result = lookupCandidateSpecies(
      ['Field Mushroom', 'Death Cap'],
      speciesDataset,
    );
    const names = result.map((s) => s.scientific_name);
    expect(names).toContain('Agaricus campestris');
    expect(names).toContain('Amanita phalloides');
  });

  it('includes confusion species from matched candidates', () => {
    const result = lookupCandidateSpecies(
      ['Field Mushroom'],
      speciesDataset,
    );
    const scientificNames = result.map((s) => s.scientific_name);
    // Field Mushroom's possible_confusion mentions Yellow Stainer
    expect(scientificNames).toContain('Agaricus xanthodermus');
  });

  it('auto-includes Death Cap when any Agaricus candidate is present', () => {
    const result = lookupCandidateSpecies(
      ['Field Mushroom'],
      speciesDataset,
    );
    const scientificNames = result.map((s) => s.scientific_name);
    // Field Mushroom is Agaricus → Death Cap (Amanita phalloides) should auto-include
    expect(scientificNames).toContain('Amanita phalloides');
  });

  it('auto-includes Destroying Angel when any Amanita candidate is present', () => {
    const result = lookupCandidateSpecies(
      ['The Blusher'],
      speciesDataset,
    );
    const scientificNames = result.map((s) => s.scientific_name);
    expect(scientificNames).toContain('Amanita virosa');
  });

  it('deduplicates species across candidates and confusion species', () => {
    const result = lookupCandidateSpecies(
      ['Field Mushroom', 'Horse Mushroom'],
      speciesDataset,
    );
    const scientificNames = result.map((s) => s.scientific_name);
    const unique = new Set(scientificNames);
    expect(scientificNames.length).toBe(unique.size);
  });

  it('skips candidate names that do not match any species', () => {
    const result = lookupCandidateSpecies(
      ['Unicorn Mushroom', 'Field Mushroom'],
      speciesDataset,
    );
    const scientificNames = result.map((s) => s.scientific_name);
    expect(scientificNames).toContain('Agaricus campestris');
    // Should not crash or include garbage
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns empty array when no candidates match', () => {
    const result = lookupCandidateSpecies(
      ['Unicorn Mushroom', 'Dragon Truffle'],
      speciesDataset,
    );
    expect(result).toEqual([]);
  });

  it('caps results at maxResults', () => {
    // Give it many candidates to inflate results
    const manyCandidates = [
      'Field Mushroom',
      'Horse Mushroom',
      'Death Cap',
      'Destroying Angel',
      'Panthercap',
      'The Blusher',
      "Fool's Funnel",
      "Devil's Bolete",
    ];
    const result = lookupCandidateSpecies(
      manyCandidates,
      speciesDataset,
      { maxResults: 5 },
    );
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it('prioritises directly matched candidates over confusion species when capping', () => {
    const result = lookupCandidateSpecies(
      ['Field Mushroom', 'Death Cap'],
      speciesDataset,
      { maxResults: 3 },
    );
    const scientificNames = result.map((s) => s.scientific_name);
    // The two direct candidates should always be included
    expect(scientificNames).toContain('Agaricus campestris');
    expect(scientificNames).toContain('Amanita phalloides');
  });
});

describe('serializeForVerification', () => {
  it('returns valid JSON parseable back to an array', () => {
    const species = lookupCandidateSpecies(
      ['Field Mushroom'],
      speciesDataset,
    );
    const json = serializeForVerification(species);
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it('preserves name and scientific_name on all entries', () => {
    const species = lookupCandidateSpecies(
      ['Field Mushroom'],
      speciesDataset,
    );
    const json = serializeForVerification(species);
    const parsed = JSON.parse(json) as Record<string, unknown>[];
    for (const entry of parsed) {
      expect(entry).toHaveProperty('name');
      expect(entry).toHaveProperty('scientific_name');
    }
  });

  it('preserves safety-critical fields when present', () => {
    const species = lookupCandidateSpecies(
      ['Field Mushroom'],
      speciesDataset,
    );
    const json = serializeForVerification(species);
    const parsed = JSON.parse(json) as Record<string, unknown>[];
    const fieldMushroom = parsed.find(
      (e) => e.scientific_name === 'Agaricus campestris',
    );
    expect(fieldMushroom).toBeDefined();
    expect(fieldMushroom).toHaveProperty('diagnostic_features');
    expect(fieldMushroom).toHaveProperty('safety_checks');
    expect(fieldMushroom).toHaveProperty('edibility_detail');
  });

  it('strips unnecessary fields like source_url and other_facts', () => {
    const species = lookupCandidateSpecies(
      ['Field Mushroom'],
      speciesDataset,
    );
    const json = serializeForVerification(species);
    expect(json).not.toContain('source_url');
    expect(json).not.toContain('other_facts');
  });

  it('does not include null values', () => {
    const species = lookupCandidateSpecies(
      ['Field Mushroom'],
      speciesDataset,
    );
    const json = serializeForVerification(species);
    const parsed = JSON.parse(json) as Record<string, unknown>[];
    for (const entry of parsed) {
      for (const value of Object.values(entry)) {
        expect(value).not.toBeNull();
      }
    }
  });

  it('produces significantly less tokens than full dataset', () => {
    const species = lookupCandidateSpecies(
      ['Field Mushroom', 'Death Cap'],
      speciesDataset,
    );
    const json = serializeForVerification(species);
    const fullJson = JSON.stringify(speciesDataset);
    // Should be a fraction of the full dataset
    expect(json.length).toBeLessThan(fullJson.length / 10);
  });
});
