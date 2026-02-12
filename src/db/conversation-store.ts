import type { MushroomDB, ConversationRecord } from './database';
import type { ConversationSession, ConversationMessage } from '@/types/conversation';

function generateSessionId(): string {
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function sessionToRecord(session: ConversationSession): ConversationRecord {
  return {
    session_id: session.session_id,
    created_at: session.created_at,
    updated_at: session.updated_at,
    status: session.status,
    messages: JSON.stringify(session.messages),
  };
}

function recordToSession(record: ConversationRecord): ConversationSession {
  return {
    session_id: record.session_id,
    created_at: record.created_at,
    updated_at: record.updated_at,
    status: record.status,
    messages: JSON.parse(record.messages) as ConversationMessage[],
  };
}

export async function createSession(db: MushroomDB): Promise<ConversationSession> {
  const now = new Date().toISOString();
  const session: ConversationSession = {
    session_id: generateSessionId(),
    created_at: now,
    updated_at: now,
    messages: [],
    status: 'active',
  };

  await db.conversations.add(sessionToRecord(session));
  return session;
}

export async function getSession(
  db: MushroomDB,
  sessionId: string,
): Promise<ConversationSession | undefined> {
  const record = await db.conversations.get(sessionId);
  return record ? recordToSession(record) : undefined;
}

export async function updateSession(
  db: MushroomDB,
  session: ConversationSession,
): Promise<void> {
  await db.conversations.put(sessionToRecord({
    ...session,
    updated_at: new Date().toISOString(),
  }));
}

export async function listSessions(
  db: MushroomDB,
  statusFilter?: 'active' | 'completed',
): Promise<ConversationSession[]> {
  let records: ConversationRecord[];

  if (statusFilter) {
    records = await db.conversations
      .where('status')
      .equals(statusFilter)
      .reverse()
      .sortBy('updated_at');
  } else {
    records = await db.conversations
      .orderBy('updated_at')
      .reverse()
      .toArray();
  }

  return records.map(recordToSession);
}

export async function deleteSession(
  db: MushroomDB,
  sessionId: string,
): Promise<void> {
  await db.conversations.delete(sessionId);
}
