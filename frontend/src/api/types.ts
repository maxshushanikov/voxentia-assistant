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

export interface ChatResponseBody {
  text: string;
  audio_url?: string | null;
  session_id: string;
  intent?: string | null;
  plugin_data?: unknown;
}

export interface TranscribeResponseBody {
  text: string;
}

export interface HistoryMessage {
  role: string;
  content: string;
  timestamp: string;
  model?: string;
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
