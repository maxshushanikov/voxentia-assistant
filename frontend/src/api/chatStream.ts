import type { ChatRequestBody, ChatResponseBody } from './types';

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
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/api/v1/chat/ws`;

  return new Promise<void>((resolve) => {
    const ws = new WebSocket(wsUrl);

    if (signal) {
      signal.addEventListener('abort', () => {
        ws.close();
        resolve();
      });
    }

    ws.onopen = () => {
      ws.send(JSON.stringify(body));
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === 'token') {
          callbacks.onToken(payload.data);
        } else if (payload.event === 'audio') {
          if (callbacks.onAudio) callbacks.onAudio(payload.data);
        } else if (payload.event === 'done') {
          callbacks.onDone(payload.data);
          ws.close();
          resolve();
        } else if (payload.event === 'error') {
          callbacks.onError(new Error(payload.data));
          ws.close();
          resolve();
        }
      } catch (err) {
        callbacks.onError(err instanceof Error ? err : new Error(String(err)));
        ws.close();
        resolve();
      }
    };

    ws.onerror = () => {
      callbacks.onError(new Error('WebSocket connection error'));
      resolve();
    };

    ws.onclose = () => {
      resolve();
    };
  });
}
