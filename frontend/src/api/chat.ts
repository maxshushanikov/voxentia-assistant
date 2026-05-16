import { apiFetch } from './client';
import type {
  ChatHistoryResponse,
  ChatRequestBody,
  ChatResponseBody,
  DocumentUploadResponse,
  TranscribeResponseBody,
} from './types';

export function postChat(body: ChatRequestBody) {
  return apiFetch<ChatResponseBody>('/api/chat', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getChatHistory(sessionId: string) {
  return apiFetch<ChatHistoryResponse>(
    `/api/chat/history?session_id=${encodeURIComponent(sessionId)}`,
  );
}

export function postTranscribe(formData: FormData) {
  return apiFetch<TranscribeResponseBody>('/api/transcribe', {
    method: 'POST',
    body: formData,
    headers: {},
  });
}

export function getSessions() {
  return apiFetch<{ sessions: { session_id: string; title: string; timestamp: string }[] }>(
    '/api/sessions',
  );
}

export function deleteSession(sessionId: string) {
  return apiFetch<{ message: string; deleted_messages: number }>(
    `/api/sessions/${encodeURIComponent(sessionId)}`,
    { method: 'DELETE' },
  );
}

export function deleteAllSessions() {
  return apiFetch<{ message: string; deleted_messages: number }>('/api/sessions', {
    method: 'DELETE',
  });
}

export function uploadDocument(formData: FormData) {
  return apiFetch<DocumentUploadResponse>('/api/documents/upload', {
    method: 'POST',
    body: formData,
    headers: {},
  });
}
