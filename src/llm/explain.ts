import type { Observation, IdentificationResult, LLMExplanation } from '@/types';
import type { MushroomDB } from '@/db/database';
import type { GuidanceContext } from '@/learning/adaptive-guidance';
import { getApiKey, getSettings } from './api-key';
import { callLLM } from './api-client';
import { getCachedResponse, setCachedResponse, buildCacheKey } from './cache';
import { recordUsage, estimateCost } from './cost-tracker';
import { buildExplanationMessages } from './prompts';
import { extractJsonString } from './extract-features';

/**
 * Generate a natural language explanation of the rule engine result using the LLM.
 * Returns null if the LLM is unavailable (no key, offline, error).
 * The caller should fall back to the offline explanation templates.
 */
export async function generateExplanation(
  db: MushroomDB,
  result: IdentificationResult,
  observation: Observation,
  guidance?: GuidanceContext,
): Promise<LLMExplanation | null> {
  const apiKey = await getApiKey(db);
  if (!apiKey) return null;

  const settings = await getSettings(db);
  const messages = buildExplanationMessages(result, observation, guidance);

  // Check cache
  const cacheKey = buildCacheKey(messages);
  const cached = await getCachedResponse(db, cacheKey);
  if (cached) {
    try {
      return parseExplanation(cached);
    } catch {
      // Corrupt cache — fall through
    }
  }

  try {
    const response = await callLLM(
      {
        model: settings.model,
        messages,
        max_tokens: 500,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        thinking: { type: 'disabled' },
      },
      apiKey,
      settings.endpoint,
    );

    const msg = response.choices[0]?.message;
    const content = msg?.content ?? msg?.reasoning_content ?? null;
    if (!content) return null;

    let explanation: LLMExplanation;
    try {
      explanation = parseExplanation(content);
    } catch {
      return null;
    }

    // Record usage
    const cost = estimateCost(response.usage.prompt_tokens, response.usage.completion_tokens);
    await recordUsage(db, {
      timestamp: new Date().toISOString(),
      prompt_tokens: response.usage.prompt_tokens,
      completion_tokens: response.usage.completion_tokens,
      estimated_cost_usd: cost,
      cache_hit: false,
    });

    // Cache result
    await setCachedResponse(db, cacheKey, content);

    return explanation;
  } catch {
    return null;
  }
}

function parseExplanation(json: string): LLMExplanation {
  const parsed = JSON.parse(extractJsonString(json));
  if (!parsed || typeof parsed !== 'object' || !parsed.summary) {
    throw new Error('Invalid explanation format');
  }
  return {
    summary: parsed.summary ?? '',
    detailed_explanation: parsed.detailed_explanation ?? '',
    safety_emphasis: parsed.safety_emphasis ?? '',
    suggested_questions: Array.isArray(parsed.suggested_questions) ? parsed.suggested_questions : [],
  };
}
