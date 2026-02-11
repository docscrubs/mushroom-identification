import type { Observation, LLMExtractionResult, LLMRequest } from '@/types';
import type { MushroomDB } from '@/db/database';
import { getApiKey, getSettings } from './api-key';
import { callLLM, LLMApiError } from './api-client';
import { getCachedResponse, setCachedResponse, buildCacheKey } from './cache';
import { recordUsage, isWithinBudget, estimateCost } from './cost-tracker';
import { buildExtractionMessages } from './prompts';

export type ExtractionOutcome =
  | { ok: true; result: LLMExtractionResult; cached: boolean }
  | {
      ok: false;
      error: 'no_api_key' | 'budget_exceeded' | 'network_error' | 'api_error' | 'parse_error';
      message: string;
    };

/**
 * Extract features from photos and/or text description using the LLM.
 * This is the main entry point for LLM feature extraction.
 */
export async function extractFeatures(
  db: MushroomDB,
  photoDataUrls: string[],
  textDescription: string | null,
  existingObservation: Observation,
): Promise<ExtractionOutcome> {
  // 1. Check API key
  const apiKey = await getApiKey(db);
  if (!apiKey) {
    return { ok: false, error: 'no_api_key', message: 'No API key configured. Set one in Settings.' };
  }

  // 2. Check budget
  const settings = await getSettings(db);
  if (!(await isWithinBudget(db, settings.budget_limit_usd))) {
    return {
      ok: false,
      error: 'budget_exceeded',
      message: 'Monthly budget exceeded. Adjust in Settings or wait for next month.',
    };
  }

  // 3. Build prompt messages
  const messages = buildExtractionMessages(photoDataUrls, textDescription, existingObservation);

  // 4. Check cache
  const cacheKey = buildCacheKey(messages);
  const cached = await getCachedResponse(db, cacheKey);
  if (cached) {
    try {
      const parsed = parseExtractionResult(cached);
      return { ok: true, result: parsed, cached: true };
    } catch {
      // Cached response is corrupt — fall through to API call
    }
  }

  // 5. Call LLM API — use vision model when photos are present
  const hasPhotos = photoDataUrls.length > 0;
  const model = hasPhotos ? settings.vision_model : settings.model;
  try {
    const request: LLMRequest = {
      model,
      messages,
      max_tokens: settings.max_tokens,
      temperature: 0.3,
      thinking: { type: 'disabled' },
    };
    // Only use response_format for text models (vision models don't support it)
    if (!hasPhotos) {
      request.response_format = { type: 'json_object' };
    }
    // Longer timeout for image requests (base64 payloads are large)
    const timeoutMs = hasPhotos ? 60_000 : 30_000;
    const response = await callLLM(
      request,
      apiKey,
      settings.endpoint,
      timeoutMs,
    );

    // 6. Parse response — content may be null if model used thinking mode
    const msg = response.choices[0]?.message;
    const content = msg?.content ?? msg?.reasoning_content ?? null;
    if (!content) {
      return { ok: false, error: 'parse_error', message: 'Empty response from LLM.' };
    }

    let result: LLMExtractionResult;
    try {
      result = parseExtractionResult(content);
    } catch {
      return {
        ok: false,
        error: 'parse_error',
        message: 'LLM returned invalid JSON. Try again.',
      };
    }

    // 7. Record usage
    const cost = estimateCost(response.usage.prompt_tokens, response.usage.completion_tokens);
    await recordUsage(db, {
      timestamp: new Date().toISOString(),
      prompt_tokens: response.usage.prompt_tokens,
      completion_tokens: response.usage.completion_tokens,
      estimated_cost_usd: cost,
      cache_hit: false,
    });

    // 8. Store cleaned JSON in cache
    await setCachedResponse(db, cacheKey, extractJsonString(content));

    return { ok: true, result, cached: false };
  } catch (err) {
    if (err instanceof LLMApiError) {
      return {
        ok: false,
        error: 'api_error',
        message: `API error (${err.status}): ${err.message}`,
      };
    }
    const detail = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: 'network_error',
      message: `Could not reach the LLM API: ${detail}`,
    };
  }
}

const MAX_IMAGE_DIMENSION = 1024;
const JPEG_QUALITY = 0.8;

/** Convert a File to a compressed base64 data URL (resized to max 1024px, JPEG). */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      // Scale down if either dimension exceeds the limit
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        const scale = MAX_IMAGE_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not create canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/** Strip markdown code fences if the LLM wrapped its JSON response. */
export function extractJsonString(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenced) return fenced[1]!.trim();
  return trimmed;
}

/** Parse and minimally validate an LLM extraction response. */
function parseExtractionResult(json: string): LLMExtractionResult {
  const parsed = JSON.parse(extractJsonString(json));

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid extraction result');
  }

  return {
    extracted_observations: parsed.extracted_observations ?? {},
    field_confidence: parsed.field_confidence ?? {},
    direct_identification: parsed.direct_identification ?? {
      species_guess: null,
      genus_guess: null,
      confidence: 'low',
      reasoning: '',
    },
    extraction_notes: Array.isArray(parsed.extraction_notes) ? parsed.extraction_notes : [],
  };
}
