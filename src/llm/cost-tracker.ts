import type { LLMUsageRecord } from '@/types';
import type { MushroomDB } from '@/db/database';

// Approximate pricing per 1M tokens (configurable if z.ai changes pricing)
const PROMPT_COST_PER_M = 3.0; // $3 per 1M input tokens
const COMPLETION_COST_PER_M = 15.0; // $15 per 1M output tokens

/** Estimate cost in USD from token counts. */
export function estimateCost(promptTokens: number, completionTokens: number): number {
  return (
    (promptTokens / 1_000_000) * PROMPT_COST_PER_M +
    (completionTokens / 1_000_000) * COMPLETION_COST_PER_M
  );
}

/** Record a usage entry. */
export async function recordUsage(
  db: MushroomDB,
  record: Omit<LLMUsageRecord, 'id'>,
): Promise<void> {
  await db.llmUsage.add(record as LLMUsageRecord);
}

/** Get total estimated spend for the current calendar month. */
export async function getMonthlySpend(db: MushroomDB): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const records = await db.llmUsage
    .where('timestamp')
    .aboveOrEqual(monthStart)
    .toArray();

  return records.reduce((sum, r) => sum + r.estimated_cost_usd, 0);
}

/** Check if spending is within the budget limit. */
export async function isWithinBudget(
  db: MushroomDB,
  budgetLimitUsd: number,
): Promise<boolean> {
  const spent = await getMonthlySpend(db);
  return spent < budgetLimitUsd;
}
