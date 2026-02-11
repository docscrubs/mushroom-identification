import { MushroomDB } from '@/db/database';
import { recordUsage, getMonthlySpend, isWithinBudget, estimateCost } from './cost-tracker';

describe('Cost Tracker', () => {
  let db: MushroomDB;

  beforeEach(() => {
    db = new MushroomDB(`test-cost-${Date.now()}-${Math.random()}`);
  });

  describe('estimateCost', () => {
    it('calculates cost based on token counts', () => {
      const cost = estimateCost(1000, 500);
      expect(cost).toBeGreaterThan(0);
    });

    it('charges more for completion tokens than prompt tokens', () => {
      const promptHeavy = estimateCost(1000, 100);
      const completionHeavy = estimateCost(100, 1000);
      expect(completionHeavy).toBeGreaterThan(promptHeavy);
    });

    it('returns 0 for 0 tokens', () => {
      expect(estimateCost(0, 0)).toBe(0);
    });
  });

  describe('recordUsage', () => {
    it('stores a usage record', async () => {
      await recordUsage(db, {
        timestamp: new Date().toISOString(),
        prompt_tokens: 500,
        completion_tokens: 200,
        estimated_cost_usd: 0.005,
        cache_hit: false,
      });

      const count = await db.llmUsage.count();
      expect(count).toBe(1);
    });

    it('stores multiple usage records', async () => {
      await recordUsage(db, {
        timestamp: new Date().toISOString(),
        prompt_tokens: 500,
        completion_tokens: 200,
        estimated_cost_usd: 0.005,
        cache_hit: false,
      });
      await recordUsage(db, {
        timestamp: new Date().toISOString(),
        prompt_tokens: 300,
        completion_tokens: 100,
        estimated_cost_usd: 0.003,
        cache_hit: false,
      });

      const count = await db.llmUsage.count();
      expect(count).toBe(2);
    });
  });

  describe('getMonthlySpend', () => {
    it('returns 0 when no usage recorded', async () => {
      const spend = await getMonthlySpend(db);
      expect(spend).toBe(0);
    });

    it('sums costs for current month only', async () => {
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15).toISOString();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString();

      await recordUsage(db, {
        timestamp: thisMonth,
        prompt_tokens: 500,
        completion_tokens: 200,
        estimated_cost_usd: 0.01,
        cache_hit: false,
      });
      await recordUsage(db, {
        timestamp: lastMonth,
        prompt_tokens: 1000,
        completion_tokens: 500,
        estimated_cost_usd: 0.05,
        cache_hit: false,
      });

      const spend = await getMonthlySpend(db);
      expect(spend).toBeCloseTo(0.01);
    });
  });

  describe('isWithinBudget', () => {
    it('returns true when no usage recorded', async () => {
      expect(await isWithinBudget(db, 5.0)).toBe(true);
    });

    it('returns false when budget is exceeded', async () => {
      await recordUsage(db, {
        timestamp: new Date().toISOString(),
        prompt_tokens: 100000,
        completion_tokens: 50000,
        estimated_cost_usd: 6.0,
        cache_hit: false,
      });

      expect(await isWithinBudget(db, 5.0)).toBe(false);
    });

    it('returns true when usage is under budget', async () => {
      await recordUsage(db, {
        timestamp: new Date().toISOString(),
        prompt_tokens: 500,
        completion_tokens: 200,
        estimated_cost_usd: 0.01,
        cache_hit: false,
      });

      expect(await isWithinBudget(db, 5.0)).toBe(true);
    });
  });
});
