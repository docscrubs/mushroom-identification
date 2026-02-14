export type ConversationStatus = 'active' | 'completed';

export interface PipelineMetadata {
  stage1_candidates?: Array<{ name: string; scientific_name: string; confidence: string }>;
  verified_species?: string[];
  stage1_raw?: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  photos?: string[]; // data URLs, only on user messages
  timestamp: string; // ISO 8601
  pipeline_metadata?: PipelineMetadata;
}

export interface ConversationSession {
  session_id: string;
  created_at: string;
  updated_at: string;
  messages: ConversationMessage[];
  status: ConversationStatus;
}
