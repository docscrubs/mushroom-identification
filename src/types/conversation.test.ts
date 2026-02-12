import type { ConversationMessage, ConversationSession, ConversationStatus } from './conversation';

describe('conversation types', () => {
  it('ConversationMessage has all required fields', () => {
    const msg: ConversationMessage = {
      id: 'msg-1',
      role: 'user',
      content: 'I found a mushroom',
      timestamp: new Date().toISOString(),
    };
    expect(msg.id).toBe('msg-1');
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('I found a mushroom');
    expect(msg.timestamp).toBeTruthy();
    expect(msg.photos).toBeUndefined();
  });

  it('ConversationMessage supports optional photos', () => {
    const msg: ConversationMessage = {
      id: 'msg-2',
      role: 'user',
      content: 'What is this?',
      photos: ['data:image/jpeg;base64,abc'],
      timestamp: new Date().toISOString(),
    };
    expect(msg.photos).toHaveLength(1);
  });

  it('ConversationMessage role can be assistant', () => {
    const msg: ConversationMessage = {
      id: 'msg-3',
      role: 'assistant',
      content: 'This looks like a Chanterelle.',
      timestamp: new Date().toISOString(),
    };
    expect(msg.role).toBe('assistant');
  });

  it('ConversationSession has all required fields', () => {
    const session: ConversationSession = {
      session_id: 'session-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: [],
      status: 'active',
    };
    expect(session.session_id).toBe('session-1');
    expect(session.messages).toHaveLength(0);
    expect(session.status).toBe('active');
  });

  it('ConversationStatus is active or completed', () => {
    const statuses: ConversationStatus[] = ['active', 'completed'];
    expect(statuses).toContain('active');
    expect(statuses).toContain('completed');
  });
});
