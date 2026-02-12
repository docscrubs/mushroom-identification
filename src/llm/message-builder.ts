import type { LLMMessage, LLMContentPart } from '@/types/llm';
import type { ConversationMessage } from '@/types/conversation';
import { estimateTokens } from '@/data/species-pruning';

/**
 * Default max context tokens.
 * GLM-4.7-Flash has 200K; we reserve some headroom for the response.
 */
const DEFAULT_MAX_CONTEXT_TOKENS = 190_000;

/**
 * Convert conversation messages into LLM API format.
 *
 * - System prompt is always the first message
 * - User text becomes role: 'user' with string content
 * - User text + photos becomes role: 'user' with content parts array
 * - Photos are only included in the turn they were sent
 * - When total tokens exceed the limit, older messages are dropped
 *   (system prompt is always preserved)
 */
export function buildLLMMessages(
  systemPrompt: string,
  conversationMessages: ConversationMessage[],
  maxContextTokens: number = DEFAULT_MAX_CONTEXT_TOKENS,
): LLMMessage[] {
  const systemMessage: LLMMessage = {
    role: 'system',
    content: systemPrompt,
  };

  const systemTokens = estimateTokens(systemPrompt);
  let remainingTokens = maxContextTokens - systemTokens;

  // Convert conversation messages to LLM format, newest first for truncation
  // Photos are only included in the most recent user message to save tokens
  const convertedMessages: LLMMessage[] = [];
  const reversed = [...conversationMessages].reverse();

  // Find the index of the last user message (in original order) to include photos only for it
  let lastUserMsgIndex = -1;
  for (let i = conversationMessages.length - 1; i >= 0; i--) {
    if (conversationMessages[i]!.role === 'user') {
      lastUserMsgIndex = i;
      break;
    }
  }

  for (let ri = 0; ri < reversed.length; ri++) {
    const msg = reversed[ri]!;
    const originalIndex = conversationMessages.length - 1 - ri;
    const includePhotos = originalIndex === lastUserMsgIndex;
    const llmMessage = convertMessage(msg, includePhotos);
    const msgTokens = estimateMessageTokens(llmMessage);

    if (msgTokens > remainingTokens) {
      // No room for this message or any older ones
      break;
    }

    convertedMessages.unshift(llmMessage);
    remainingTokens -= msgTokens;
  }

  return [systemMessage, ...convertedMessages];
}

function convertMessage(msg: ConversationMessage, includePhotos: boolean): LLMMessage {
  if (msg.role === 'assistant') {
    return { role: 'assistant', content: msg.content };
  }

  // User message — include photos only for the current (latest) turn
  if (includePhotos && msg.photos && msg.photos.length > 0) {
    const parts: LLMContentPart[] = [
      { type: 'text', text: msg.content },
      ...msg.photos.map(
        (url): LLMContentPart => ({
          type: 'image_url',
          image_url: { url },
        }),
      ),
    ];
    return { role: 'user', content: parts };
  }

  return { role: 'user', content: msg.content };
}

function estimateMessageTokens(msg: LLMMessage): number {
  if (typeof msg.content === 'string') {
    return estimateTokens(msg.content);
  }
  // Content parts — estimate text parts only (images are separate tokens)
  let tokens = 0;
  for (const part of msg.content) {
    if (part.type === 'text' && part.text) {
      tokens += estimateTokens(part.text);
    } else if (part.type === 'image_url') {
      // Rough estimate for image tokens
      tokens += 1000;
    }
  }
  return tokens;
}
