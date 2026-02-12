import type { MushroomDB } from '@/db/database';
import type { LLMResponse } from '@/types/llm';
import type { ConversationSession, ConversationMessage } from '@/types/conversation';
import type { DatasetSpecies } from '@/types/species';
import { createSession, getSession, updateSession, listSessions as dbListSessions } from '@/db/conversation-store';
import { buildSystemPrompt } from './system-prompt';
import { buildLLMMessages } from './message-builder';
import { callLLM } from './api-client';
import { getApiKey, getSettings } from './api-key';
import { buildCacheKey, getCachedResponse, setCachedResponse } from './cache';
import { isWithinBudget, recordUsage, estimateCost } from './cost-tracker';
import { speciesDataset } from '@/data/species-dataset';

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
 * Start a new conversation session.
 */
export async function startConversation(db: MushroomDB): Promise<ConversationSession> {
  return createSession(db);
}

/**
 * Send a message in an existing conversation.
 * Handles system prompt assembly, LLM API call, caching, and budget.
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

  // 3. Build system prompt with species data
  const species = getSpecies();
  const systemPrompt = buildSystemPrompt(species);

  // 4. Build LLM messages
  const llmMessages = buildLLMMessages(systemPrompt, session.messages);

  // 5. Check cache
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

  // 6. Check budget
  const settings = await getSettings(db);
  const withinBudget = await isWithinBudget(db, settings.budget_limit_usd);
  if (!withinBudget) {
    // Still save the user message
    await updateSession(db, session);
    return { ok: false, error: 'budget_exceeded', message: 'Monthly LLM budget exceeded.' };
  }

  // 7. Check API key
  const apiKey = await getApiKey(db);
  if (!apiKey) {
    await updateSession(db, session);
    return { ok: false, error: 'no_api_key', message: 'No API key configured.' };
  }

  // 8. Select model (vision if photos in this message)
  const hasPhotos = photos && photos.length > 0;
  const model = hasPhotos ? settings.vision_model : settings.model;

  // 9. Call LLM
  let llmResponse: LLMResponse;
  try {
    llmResponse = await callLLM(
      {
        model,
        messages: llmMessages,
        max_tokens: settings.max_tokens,
        temperature: 0.3,
      },
      apiKey,
      settings.endpoint,
      60_000, // 60s timeout for large context
    );
  } catch (err) {
    // Save user message even on error
    await updateSession(db, session);
    const message = err instanceof Error ? err.message : 'Unknown API error';
    return { ok: false, error: 'api_error', message };
  }

  // 10. Record usage
  const usage = llmResponse.usage;
  await recordUsage(db, {
    timestamp: new Date().toISOString(),
    prompt_tokens: usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
    estimated_cost_usd: estimateCost(usage.prompt_tokens, usage.completion_tokens),
    cache_hit: false,
  });

  // 11. Extract response content
  const responseContent = llmResponse.choices[0]?.message?.content ?? '';

  // 12. Cache the response
  await setCachedResponse(db, cacheKey, responseContent);

  // 13. Create assistant message and append
  const assistantMessage: ConversationMessage = {
    id: generateMessageId(),
    role: 'assistant',
    content: responseContent,
    timestamp: new Date().toISOString(),
  };
  session.messages.push(assistantMessage);

  // 14. Save session
  await updateSession(db, session);

  return { ok: true, session, response: responseContent };
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
