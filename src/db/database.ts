import Dexie, { type Table } from 'dexie';
import type { GenusProfile } from '@/types';
import type { Heuristic } from '@/types';
import type { UserModel } from '@/types';
import type { IdentificationSession } from '@/types';
import type { UserContribution } from '@/types';
import type { LLMSettings, LLMUsageRecord } from '@/types';

export interface CachedLLMResponse {
  cache_key: string;
  response: string;
  created_at: string;
}

export class MushroomDB extends Dexie {
  genusProfiles!: Table<GenusProfile, string>;
  heuristics!: Table<Heuristic, string>;
  userModels!: Table<UserModel, string>;
  identificationSessions!: Table<IdentificationSession, string>;
  userContributions!: Table<UserContribution, string>;
  llmCache!: Table<CachedLLMResponse, string>;
  llmSettings!: Table<LLMSettings, string>;
  llmUsage!: Table<LLMUsageRecord, number>;

  constructor(name = 'MushroomID') {
    super(name);
    this.version(1).stores({
      genusProfiles: 'genus, *common_names, uk_occurrence',
      heuristics: 'heuristic_id, category, applies_to.genus, priority',
      userModels: 'user_id',
      identificationSessions: 'session_id, date',
      userContributions: 'id, type, heuristic_id, status',
      llmCache: 'cache_key, created_at',
    });
    this.version(2).stores({
      genusProfiles: 'genus, *common_names, uk_occurrence',
      heuristics: 'heuristic_id, category, applies_to.genus, priority',
      userModels: 'user_id',
      identificationSessions: 'session_id, date',
      userContributions: 'id, type, heuristic_id, status',
      llmCache: 'cache_key, created_at',
      llmSettings: 'id',
      llmUsage: '++id, timestamp',
    });
  }
}

/** Singleton database instance for the app */
export const db = new MushroomDB();
