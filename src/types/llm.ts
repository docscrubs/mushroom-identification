// --- API Key & Settings ---

export interface LLMSettings {
  id: string; // always 'default'
  api_key: string; // z.ai API key, used as Bearer token
  endpoint: string;
  model: string; // text model (e.g. glm-4.7-flash)
  vision_model: string; // vision model for photo analysis (e.g. glm-4.6v-flash)
  max_tokens: number;
  budget_limit_usd: number;
  budget_used_usd: number;
  budget_reset_date: string; // ISO date
}

export const DEFAULT_LLM_SETTINGS: Omit<LLMSettings, 'api_key'> = {
  id: 'default',
  endpoint: '/api/chat',
  model: 'glm-4.7-flash',
  vision_model: 'glm-4.6v-flash',
  max_tokens: 2048,
  budget_limit_usd: 5.0,
  budget_used_usd: 0,
  budget_reset_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
};

// --- OpenAI-compatible Request/Response ---

export interface LLMContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | LLMContentPart[];
}

export interface LLMRequest {
  model: string;
  messages: LLMMessage[];
  max_tokens: number;
  temperature: number;
  response_format?: { type: 'json_object' };
  thinking?: { type: 'enabled' | 'disabled' };
}

export interface LLMResponse {
  id: string;
  choices: Array<{
    message: { role: string; content: string | null; reasoning_content?: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// --- Cost Tracking ---

export interface LLMUsageRecord {
  id?: number; // auto-incremented
  timestamp: string;
  prompt_tokens: number;
  completion_tokens: number;
  estimated_cost_usd: number;
  cache_hit: boolean;
}

