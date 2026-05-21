/**
 * API types for the frontend client.
 * Run `python ../scripts/export_openapi.py` then `npm run generate:api` to refresh `schema.d.ts`.
 */
import type { components } from './schema';
import type { Language, Personality, Speaker } from '../types';

export type OpenApiChatResponse = components['schemas']['ChatResponse'];
export type OpenApiChatRequest = components['schemas']['ChatRequest'];

export interface ChatRequestBody {
  message: string;
  session_id?: string;
  language?: Language;
  speaker?: Speaker;
  personality?: Personality;
  model?: string | null;
  temperature?: number;
}

export interface RagSourceBody {
  filename: string;
  page?: number | null;
  chunk_index: number;
  score: number;
}

export interface ChatResponseBody {
  text: string;
  audio_url?: string | null;
  session_id: string;
  intent?: string | null;
  intent_confidence?: number | null;
  intent_source?: string | null;
  plugin_data?: unknown;
  rag_sources?: RagSourceBody[];
}

export interface TranscribeResponseBody {
  text: string;
}

export interface HistoryMessage {
  id?: number;
  role: string;
  content: string;
  timestamp: string;
  model?: string;
  parent_id?: number | null;
  branch_id?: string;
}

export interface ForkSessionResponse {
  session_id: string;
  branch_id: string;
  copied_messages: number;
  parent_message_id: number;
}

export interface ChatHistoryResponse {
  history: HistoryMessage[];
}

export interface DocumentUploadResponse {
  message?: string;
  chunks?: number;
}

export interface ApiErrorBody {
  detail: string;
  code?: string;
}
