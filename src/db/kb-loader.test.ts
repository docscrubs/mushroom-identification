import { describe, it, expect, beforeEach } from 'vitest';
import { MushroomDB } from './database';
import { loadKnowledgeBase, isKBLoaded } from './kb-loader';
import { seedGenera } from '@/data/seed-genera';
import { seedHeuristics } from '@/data/seed-heuristics';

describe('Knowledge Base Loader', () => {
  let db: MushroomDB;

  beforeEach(() => {
    db = new MushroomDB(`test-kb-${Date.now()}-${Math.random()}`);
  });

  it('reports KB as not loaded on a fresh database', async () => {
    const loaded = await isKBLoaded(db);
    expect(loaded).toBe(false);
  });

  it('loads seed genera into the database', async () => {
    await loadKnowledgeBase(db);

    const genera = await db.genusProfiles.toArray();
    expect(genera.length).toBe(seedGenera.length);
    expect(genera.map((g) => g.genus)).toContain('Russula');
  });

  it('loads seed heuristics into the database', async () => {
    await loadKnowledgeBase(db);

    const heuristics = await db.heuristics.toArray();
    expect(heuristics.length).toBe(seedHeuristics.length);
    expect(heuristics.map((h) => h.heuristic_id)).toContain(
      'russula_taste_test',
    );
    expect(heuristics.map((h) => h.heuristic_id)).toContain('avoid_lbms');
  });

  it('reports KB as loaded after loading', async () => {
    await loadKnowledgeBase(db);
    const loaded = await isKBLoaded(db);
    expect(loaded).toBe(true);
  });

  it('does not duplicate data if called twice', async () => {
    await loadKnowledgeBase(db);
    await loadKnowledgeBase(db);

    const genera = await db.genusProfiles.toArray();
    expect(genera.length).toBe(seedGenera.length);

    const heuristics = await db.heuristics.toArray();
    expect(heuristics.length).toBe(seedHeuristics.length);
  });

  it('preserves all fields on loaded genus profiles', async () => {
    await loadKnowledgeBase(db);

    const russula = await db.genusProfiles.get('Russula');
    expect(russula).toBeDefined();
    expect(russula!.common_names).toContain('Brittlegills');
    expect(russula!.confidence_markers.high.length).toBeGreaterThan(0);
    expect(russula!.ecological_context.season.UK).toContain('September');
    expect(russula!.lookalike_genera.length).toBeGreaterThan(0);
    expect(russula!.key_species_uk.edible.length).toBeGreaterThan(0);
  });

  it('preserves all fields on loaded heuristics', async () => {
    await loadKnowledgeBase(db);

    const tasteTest = await db.heuristics.get('russula_taste_test');
    expect(tasteTest).toBeDefined();
    expect(tasteTest!.category).toBe('edibility_determination');
    expect(tasteTest!.outcomes.length).toBe(3);
    expect(tasteTest!.exceptions).toBeDefined();
    expect(tasteTest!.exceptions!.length).toBeGreaterThan(0);
  });
});
