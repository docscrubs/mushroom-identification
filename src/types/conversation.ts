export type ConversationStatus = 'active' | 'completed';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  photos?: string[]; // data URLs, only on user messages
  timestamp: string; // ISO 8601
}

export interface ConversationSession {
  session_id: string;
  created_at: string;
  updated_at: string;
  messages: ConversationMessage[];
  status: ConversationStatus;
}
