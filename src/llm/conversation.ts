import type { MushroomDB } from '@/db/database';
import type { LLMMessage } from '@/types/llm';
import type { ConversationSession, ConversationMessage } from '@/types/conversation';
import type { DatasetSpecies } from '@/types/species';
import type { PipelineStage } from '@/types/pipeline';
import { createSession, getSession, updateSession, listSessions as dbListSessions } from '@/db/conversation-store';
import { getApiKey, getSettings } from './api-key';
import { buildCacheKey, getCachedResponse, setCachedResponse } from './cache';
import { isWithinBudget, recordUsage, estimateCost } from './cost-tracker';
import { speciesDataset } from '@/data/species-dataset';
import { runIdentificationPipeline } from './pipeline';

export type SendMessageResult =
  | { ok: true; session: ConversationSession; response: string }
  | { ok: false; error: 'no_api_key' | 'budget_exceeded' | 'api_error' | 'session_not_found'; message: string };

let cachedSpecies: DatasetSpecies[] | null = null;

function getSpecies(): DatasetSpecies[] {
  if (!cachedSpecies) {
    cachedSpecies = speciesDataset;
  }
  return cachedSpecies;
}

function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Build LLM messages from conversation history (without system prompt).
 * Used as input to the pipeline, which builds its own system prompts per stage.
 */
function buildConversationMessages(messages: ConversationMessage[]): LLMMessage[] {
  const result: LLMMessage[] = [];

  // Find last user message index for photo inclusion
  let lastUserMsgIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]!.role === 'user') {
      lastUserMsgIndex = i;
      break;
    }
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]!;
    if (msg.role === 'assistant') {
      result.push({ role: 'assistant', content: msg.content });
    } else {
      // User message — include photos only for the latest user turn
      const includePhotos = i === lastUserMsgIndex && msg.photos && msg.photos.length > 0;
      if (includePhotos) {
        result.push({
          role: 'user',
          content: [
            { type: 'text', text: msg.content },
            ...msg.photos!.map((url) => ({
              type: 'image_url' as const,
              image_url: { url },
            })),
          ],
        });
      } else {
        result.push({ role: 'user', content: msg.content });
      }
    }
  }

  return result;
}

/**
 * Start a new conversation session.
 */
export async function startConversation(db: MushroomDB): Promise<ConversationSession> {
  return createSession(db);
}

/**
 * Send a message in an existing conversation using the two-stage pipeline.
 * Handles caching, budget checks, and pipeline orchestration.
 */
export async function sendMessage(
  db: MushroomDB,
  sessionId: string,
  text: string,
  photos?: string[],
): Promise<SendMessageResult> {
  // 1. Load session
  const session = await getSession(db, sessionId);
  if (!session) {
    return { ok: false, error: 'session_not_found', message: 'Conversation not found.' };
  }

  // 2. Create user message and append
  const userMessage: ConversationMessage = {
    id: generateMessageId(),
    role: 'user',
    content: text,
    photos: photos && photos.length > 0 ? photos : undefined,
    timestamp: new Date().toISOString(),
  };
  session.messages.push(userMessage);

  // 3. Build conversation messages for cache key + pipeline
  const llmMessages = buildConversationMessages(session.messages);

  // 4. Check cache
  const cacheKey = buildCacheKey(llmMessages);
  const cached = await getCachedResponse(db, cacheKey);
  if (cached) {
    const assistantMessage: ConversationMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content: cached,
      timestamp: new Date().toISOString(),
    };
    session.messages.push(assistantMessage);
    await updateSession(db, session);
    return { ok: true, session, response: cached };
  }

  // 5. Check budget
  const settings = await getSettings(db);
  const withinBudget = await isWithinBudget(db, settings.budget_limit_usd);
  if (!withinBudget) {
    await updateSession(db, session);
    return { ok: false, error: 'budget_exceeded', message: 'Monthly LLM budget exceeded.' };
  }

  // 6. Get API key (null = server default via proxy)
  const apiKey = await getApiKey(db);

  // 7. Run two-stage pipeline
  const species = getSpecies();
  let pipelineResult;
  try {
    pipelineResult = await runIdentificationPipeline({
      messages: llmMessages,
      apiKey,
      settings: {
        model: settings.model,
        vision_model: settings.vision_model,
        max_tokens: settings.max_tokens,
        endpoint: settings.endpoint,
      },
      dataset: species,
    });
  } catch (err) {
    await updateSession(db, session);
    const message = err instanceof Error ? err.message : 'Unknown API error';
    return { ok: false, error: 'api_error', message };
  }

  // 8. Record combined usage
  const usage = pipelineResult.usage;
  await recordUsage(db, {
    timestamp: new Date().toISOString(),
    prompt_tokens: usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
    estimated_cost_usd: estimateCost(usage.prompt_tokens, usage.completion_tokens),
    cache_hit: false,
  });

  // 9. Cache the response
  await setCachedResponse(db, cacheKey, pipelineResult.response);

  // 10. Create assistant message with pipeline metadata
  const assistantMessage: ConversationMessage = {
    id: generateMessageId(),
    role: 'assistant',
    content: pipelineResult.response,
    timestamp: new Date().toISOString(),
    pipeline_metadata: {
      stage1_candidates: pipelineResult.stage1.candidates.map((c) => ({
        name: c.name,
        scientific_name: c.scientific_name,
        confidence: c.confidence,
      })),
      verified_species: pipelineResult.verifiedSpecies,
      stage1_raw: JSON.stringify(pipelineResult.stage1),
    },
  };
  session.messages.push(assistantMessage);

  // 11. Save session
  await updateSession(db, session);

  return { ok: true, session, response: pipelineResult.response };
}

/**
 * Send a message with streaming response using the two-stage pipeline.
 * Calls onChunk with each content delta from Stage 2 as it arrives.
 * Falls back to cached response if available (no streaming needed).
 */
export async function sendMessageStreaming(
  db: MushroomDB,
  sessionId: string,
  text: string,
  onChunk: (content: string) => void,
  photos?: string[],
  onStageChange?: (stage: PipelineStage) => void,
): Promise<SendMessageResult> {
  // 1. Load session
  const session = await getSession(db, sessionId);
  if (!session) {
    return { ok: false, error: 'session_not_found', message: 'Conversation not found.' };
  }

  // 2. Create user message and append
  const userMessage: ConversationMessage = {
    id: generateMessageId(),
    role: 'user',
    content: text,
    photos: photos && photos.length > 0 ? photos : undefined,
    timestamp: new Date().toISOString(),
  };
  session.messages.push(userMessage);

  // 3. Build conversation messages for cache key + pipeline
  const llmMessages = buildConversationMessages(session.messages);

  // 4. Check cache — if hit, return immediately (no streaming needed)
  const cacheKey = buildCacheKey(llmMessages);
  const cached = await getCachedResponse(db, cacheKey);
  if (cached) {
    const assistantMessage: ConversationMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content: cached,
      timestamp: new Date().toISOString(),
    };
    session.messages.push(assistantMessage);
    await updateSession(db, session);
    return { ok: true, session, response: cached };
  }

  // 5. Check budget
  const settings = await getSettings(db);
  const withinBudget = await isWithinBudget(db, settings.budget_limit_usd);
  if (!withinBudget) {
    await updateSession(db, session);
    return { ok: false, error: 'budget_exceeded', message: 'Monthly LLM budget exceeded.' };
  }

  // 6. Get API key (null = server default via proxy)
  const apiKey = await getApiKey(db);

  // 7. Run two-stage pipeline with streaming
  const species = getSpecies();
  let pipelineResult;
  try {
    pipelineResult = await runIdentificationPipeline({
      messages: llmMessages,
      apiKey,
      settings: {
        model: settings.model,
        vision_model: settings.vision_model,
        max_tokens: settings.max_tokens,
        endpoint: settings.endpoint,
      },
      dataset: species,
      callbacks: {
        onChunk,
        onStageChange,
      },
    });
  } catch (err) {
    await updateSession(db, session);
    const message = err instanceof Error ? err.message : 'Unknown API error';
    return { ok: false, error: 'api_error', message };
  }

  // 8. Record combined usage
  const usage = pipelineResult.usage;
  await recordUsage(db, {
    timestamp: new Date().toISOString(),
    prompt_tokens: usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
    estimated_cost_usd: estimateCost(usage.prompt_tokens, usage.completion_tokens),
    cache_hit: false,
  });

  // 9. Cache the response
  await setCachedResponse(db, cacheKey, pipelineResult.response);

  // 10. Create assistant message with pipeline metadata
  const assistantMessage: ConversationMessage = {
    id: generateMessageId(),
    role: 'assistant',
    content: pipelineResult.response,
    timestamp: new Date().toISOString(),
    pipeline_metadata: {
      stage1_candidates: pipelineResult.stage1.candidates.map((c) => ({
        name: c.name,
        scientific_name: c.scientific_name,
        confidence: c.confidence,
      })),
      verified_species: pipelineResult.verifiedSpecies,
      stage1_raw: JSON.stringify(pipelineResult.stage1),
    },
  };
  session.messages.push(assistantMessage);

  // 11. Save session
  await updateSession(db, session);

  return { ok: true, session, response: pipelineResult.response };
}

/**
 * End a conversation (mark as completed).
 */
export async function endConversation(
  db: MushroomDB,
  sessionId: string,
): Promise<void> {
  const session = await getSession(db, sessionId);
  if (session) {
    session.status = 'completed';
    await updateSession(db, session);
  }
}

/**
 * Get a conversation session by ID.
 */
export { getSession } from '@/db/conversation-store';

/**
 * List all sessions, optionally filtered by status.
 */
export async function listSessions(
  db: MushroomDB,
  statusFilter?: 'active' | 'completed',
): Promise<ConversationSession[]> {
  return dbListSessions(db, statusFilter);
}
