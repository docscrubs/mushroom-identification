import { describe, it, expect, beforeEach } from 'vitest';
import { MushroomDB } from './database';
import { loadKnowledgeBase } from './kb-loader';
import { exportUserData, importUserData } from './backup';

describe('Backup & Restore', () => {
  let db: MushroomDB;

  beforeEach(async () => {
    db = new MushroomDB(`test-backup-${Date.now()}-${Math.random()}`);
    await loadKnowledgeBase(db);
  });

  it('exports user data as a JSON string', async () => {
    await db.userModels.add({
      user_id: 'user-1',
      created: '2025-01-15',
      last_active: '2025-10-15',
      competencies: [],
      calibration: {
        false_positives: 0,
        false_negatives: 0,
        appropriate_uncertainty: 0,
        overconfidence_incidents: 0,
        notes: '',
      },
      total_sessions: 5,
      genera_encountered: ['Russula'],
      seasons_active: ['Autumn_2025'],
      habitats: ['woodland'],
      regions: ['Hampshire'],
    });

    await db.identificationSessions.add({
      session_id: 'session-1',
      date: '2025-10-15',
      observation: { cap_color: 'red' },
    });

    const json = await exportUserData(db);
    const data = JSON.parse(json);
    expect(data.userModels).toHaveLength(1);
    expect(data.identificationSessions).toHaveLength(1);
    expect(data.userContributions).toHaveLength(0);
  });

  it('does NOT export core KB data (genera, heuristics)', async () => {
    const json = await exportUserData(db);
    const data = JSON.parse(json);

    expect(data.genusProfiles).toBeUndefined();
    expect(data.heuristics).toBeUndefined();
  });

  it('does NOT export LLM cache', async () => {
    await db.llmCache.add({
      cache_key: 'test-key',
      response: 'cached response',
      created_at: '2025-10-15T10:00:00Z',
    });

    const json = await exportUserData(db);
    const data = JSON.parse(json);

    expect(data.llmCache).toBeUndefined();
  });

  it('imports user data into a fresh database', async () => {
    await db.userModels.add({
      user_id: 'user-1',
      created: '2025-01-15',
      last_active: '2025-10-15',
      competencies: [],
      calibration: {
        false_positives: 0,
        false_negatives: 0,
        appropriate_uncertainty: 0,
        overconfidence_incidents: 0,
        notes: '',
      },
      total_sessions: 5,
      genera_encountered: ['Russula'],
      seasons_active: ['Autumn_2025'],
      habitats: ['woodland'],
      regions: ['Hampshire'],
    });

    await db.userContributions.add({
      id: 'contrib-1',
      type: 'personal_note',
      heuristic_id: 'russula_taste_test',
      content: 'Works great in Hampshire',
      date: '2025-09-15',
      status: 'draft',
    });

    const json = await exportUserData(db);

    // Import into a fresh database
    const db2 = new MushroomDB(`test-import-${Date.now()}-${Math.random()}`);
    await loadKnowledgeBase(db2);
    await importUserData(db2, json);

    const users = await db2.userModels.toArray();
    expect(users).toHaveLength(1);
    expect(users[0]!.user_id).toBe('user-1');

    const contribs = await db2.userContributions.toArray();
    expect(contribs).toHaveLength(1);
    expect(contribs[0]!.content).toBe('Works great in Hampshire');
  });

  it('overwrites existing user data on import', async () => {
    await db.userModels.add({
      user_id: 'user-1',
      created: '2025-01-15',
      last_active: '2025-10-15',
      competencies: [],
      calibration: {
        false_positives: 0,
        false_negatives: 0,
        appropriate_uncertainty: 0,
        overconfidence_incidents: 0,
        notes: '',
      },
      total_sessions: 5,
      genera_encountered: ['Russula'],
      seasons_active: [],
      habitats: [],
      regions: [],
    });

    const json = await exportUserData(db);

    // Modify user data
    await db.userModels.update('user-1', { total_sessions: 99 });

    // Import the old export — should overwrite
    await importUserData(db, json);

    const user = await db.userModels.get('user-1');
    expect(user!.total_sessions).toBe(5);
  });

  it('includes export metadata with version and timestamp', async () => {
    const json = await exportUserData(db);
    const data = JSON.parse(json);

    expect(data.exportVersion).toBe(1);
    expect(data.exportedAt).toBeDefined();
    expect(typeof data.exportedAt).toBe('string');
  });
});
