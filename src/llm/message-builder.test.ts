import { buildLLMMessages } from './message-builder';
import type { ConversationMessage } from '@/types/conversation';

const SHORT_PROMPT = 'You are a mushroom identification assistant.';

function makeMessage(
  role: 'user' | 'assistant',
  content: string,
  photos?: string[],
): ConversationMessage {
  return {
    id: `msg-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    photos,
    timestamp: new Date().toISOString(),
  };
}

describe('buildLLMMessages', () => {
  it('first message is always role: system', () => {
    const messages = buildLLMMessages(SHORT_PROMPT, []);
    expect(messages[0]).toEqual({ role: 'system', content: SHORT_PROMPT });
  });

  it('returns only system message when no conversation messages', () => {
    const messages = buildLLMMessages(SHORT_PROMPT, []);
    expect(messages).toHaveLength(1);
  });

  it('converts user text to role: user with string content', () => {
    const convMsgs = [makeMessage('user', 'I found a white mushroom')];
    const messages = buildLLMMessages(SHORT_PROMPT, convMsgs);
    expect(messages).toHaveLength(2);
    expect(messages[1]).toEqual({
      role: 'user',
      content: 'I found a white mushroom',
    });
  });

  it('converts user text + photos to role: user with content parts', () => {
    const convMsgs = [
      makeMessage('user', 'What is this?', ['data:image/jpeg;base64,abc123']),
    ];
    const messages = buildLLMMessages(SHORT_PROMPT, convMsgs);
    expect(messages).toHaveLength(2);
    const userMsg = messages[1]!;
    expect(userMsg.role).toBe('user');
    expect(Array.isArray(userMsg.content)).toBe(true);

    const parts = userMsg.content as Array<{ type: string; text?: string; image_url?: { url: string } }>;
    expect(parts[0]).toEqual({ type: 'text', text: 'What is this?' });
    expect(parts[1]).toEqual({
      type: 'image_url',
      image_url: { url: 'data:image/jpeg;base64,abc123' },
    });
  });

  it('converts assistant messages to role: assistant', () => {
    const convMsgs = [
      makeMessage('user', 'Hello'),
      makeMessage('assistant', 'Hi, I can help identify mushrooms.'),
    ];
    const messages = buildLLMMessages(SHORT_PROMPT, convMsgs);
    expect(messages).toHaveLength(3);
    expect(messages[2]).toEqual({
      role: 'assistant',
      content: 'Hi, I can help identify mushrooms.',
    });
  });

  it('preserves chronological order', () => {
    const convMsgs = [
      makeMessage('user', 'First'),
      makeMessage('assistant', 'Second'),
      makeMessage('user', 'Third'),
    ];
    const messages = buildLLMMessages(SHORT_PROMPT, convMsgs);
    expect(messages.map((m) => (typeof m.content === 'string' ? m.content : ''))).toEqual([
      SHORT_PROMPT,
      'First',
      'Second',
      'Third',
    ]);
  });

  it('handles multiple photos in a single user message', () => {
    const convMsgs = [
      makeMessage('user', 'Two photos', [
        'data:image/jpeg;base64,photo1',
        'data:image/jpeg;base64,photo2',
      ]),
    ];
    const messages = buildLLMMessages(SHORT_PROMPT, convMsgs);
    const parts = messages[1]!.content as Array<{ type: string }>;
    expect(parts).toHaveLength(3); // 1 text + 2 images
    expect(parts[0]!.type).toBe('text');
    expect(parts[1]!.type).toBe('image_url');
    expect(parts[2]!.type).toBe('image_url');
  });

  it('strips photos from older user messages, keeps only on latest', () => {
    const convMsgs = [
      makeMessage('user', 'First with photo', ['data:image/jpeg;base64,old']),
      makeMessage('assistant', 'I see a mushroom'),
      makeMessage('user', 'Second with photo', ['data:image/jpeg;base64,new']),
    ];
    const messages = buildLLMMessages(SHORT_PROMPT, convMsgs);
    expect(messages).toHaveLength(4);

    // First user message (index 1) should have text only, no photo
    expect(messages[1]!.role).toBe('user');
    expect(typeof messages[1]!.content).toBe('string');
    expect(messages[1]!.content).toBe('First with photo');

    // Latest user message (index 3) should have text + photo parts
    expect(messages[3]!.role).toBe('user');
    expect(Array.isArray(messages[3]!.content)).toBe(true);
    const parts = messages[3]!.content as Array<{ type: string }>;
    expect(parts).toHaveLength(2); // text + image
    expect(parts[0]!.type).toBe('text');
    expect(parts[1]!.type).toBe('image_url');
  });

  describe('truncation', () => {
    it('drops older messages when exceeding token limit', () => {
      // Create a scenario where the system prompt is ~10 tokens
      // and we have many messages that exceed a small limit
      const longContent = 'a'.repeat(350); // ~100 tokens each
      const convMsgs = [
        makeMessage('user', longContent),
        makeMessage('assistant', longContent),
        makeMessage('user', longContent),
        makeMessage('assistant', longContent),
        makeMessage('user', 'latest message'),
      ];

      // Set max to ~120 tokens: enough for system + latest message only
      const messages = buildLLMMessages(SHORT_PROMPT, convMsgs, 120);

      // System prompt always preserved
      expect(messages[0]!.role).toBe('system');
      // Latest message should be included
      const lastMsg = messages[messages.length - 1]!;
      expect(lastMsg.content).toBe('latest message');
      // Should have fewer than all 5 conversation messages
      expect(messages.length).toBeLessThan(6);
    });

    it('always preserves system prompt even when messages are huge', () => {
      const hugeContent = 'x'.repeat(700_000); // Way over any limit
      const convMsgs = [makeMessage('user', hugeContent)];
      const messages = buildLLMMessages(SHORT_PROMPT, convMsgs, 100);

      // System prompt always present
      expect(messages[0]).toEqual({ role: 'system', content: SHORT_PROMPT });
      // The huge message doesn't fit
      expect(messages).toHaveLength(1);
    });
  });
});
