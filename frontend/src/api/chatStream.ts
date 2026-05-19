import { ApiError, getLastRequestId } from './client';
import type { ChatRequestBody, ChatResponseBody } from './types';
import { consumeSseBuffer } from '../utils/parseSse';

const REQUEST_ID_HEADER = 'X-Request-ID';

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onAudio?: (audioUrl: string) => void;
  onDone: (payload: ChatResponseBody) => void;
  onError: (error: Error) => void;
}

export async function postChatStream(
  body: ChatRequestBody,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };
  const lastId = getLastRequestId();
  if (lastId) headers[REQUEST_ID_HEADER] = lastId;

  let response: Response;
  try {
    response = await fetch('/api/v1/chat/stream', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
    return;
  }

  if (!response.ok) {
    let message = response.statusText;
    try {
      const errBody = await response.json();
      message = errBody.message ?? errBody.detail ?? message;
    } catch {
      /* non-json */
    }
    callbacks.onError(new ApiError(message, response.status));
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError(new Error('Streaming not supported'));
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      buffer = consumeSseBuffer(buffer, (parsed) => {
        const row = parsed as { token?: string; audio?: string; done?: ChatResponseBody };
        if (row.token) callbacks.onToken(row.token);
        if (row.audio && callbacks.onAudio) callbacks.onAudio(row.audio);
        if (row.done) callbacks.onDone(row.done);
      });
    }

    if (buffer.trim()) {
      consumeSseBuffer(buffer + '\n', (parsed) => {
        const row = parsed as { token?: string; audio?: string; done?: ChatResponseBody };
        if (row.token) callbacks.onToken(row.token);
        if (row.audio && callbacks.onAudio) callbacks.onAudio(row.audio);
        if (row.done) callbacks.onDone(row.done);
      });
    }
  } catch (err) {
    if (signal?.aborted) return;
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}
