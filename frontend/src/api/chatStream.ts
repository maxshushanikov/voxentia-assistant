import type { ChatRequestBody, ChatResponseBody } from './types';

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onAudio?: (audioUrl: string) => void;
  onDone: (payload: ChatResponseBody) => void;
  onError: (error: Error) => void;
}

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_BASE_MS = 800;

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = window.setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(id);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

function runWebSocketOnce(
  body: ChatRequestBody,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<'done' | 'error' | 'closed'> {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/api/v1/chat/ws`;

  return new Promise((resolve) => {
    const ws = new WebSocket(wsUrl);
    let settled = false;

    const finish = (result: 'done' | 'error' | 'closed') => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    if (signal) {
      signal.addEventListener(
        'abort',
        () => {
          ws.close();
          finish('closed');
        },
        { once: true },
      );
    }

    ws.onopen = () => {
      ws.send(JSON.stringify(body));
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data as string);
        if (payload.event === 'token') {
          callbacks.onToken(payload.data);
        } else if (payload.event === 'audio') {
          callbacks.onAudio?.(payload.data);
        } else if (payload.event === 'done') {
          callbacks.onDone(payload.data);
          ws.close();
          finish('done');
        } else if (payload.event === 'error') {
          callbacks.onError(new Error(payload.data));
          ws.close();
          finish('error');
        }
      } catch (err) {
        callbacks.onError(err instanceof Error ? err : new Error(String(err)));
        ws.close();
        finish('error');
      }
    };

    ws.onerror = () => {
      callbacks.onError(new Error('WebSocket connection error'));
      finish('error');
    };

    ws.onclose = () => {
      finish('closed');
    };
  });
}

export async function postChatStream(
  body: ChatRequestBody,
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  let attempt = 0;

  while (attempt <= MAX_RECONNECT_ATTEMPTS) {
    if (signal?.aborted) return;

    const result = await runWebSocketOnce(body, callbacks, signal);

    if (result === 'done' || signal?.aborted) {
      return;
    }

    attempt += 1;
    if (attempt > MAX_RECONNECT_ATTEMPTS) {
      callbacks.onError(
        new Error('Connection lost — could not reconnect to the assistant.'),
      );
      return;
    }

    try {
      await delay(RECONNECT_BASE_MS * attempt, signal);
    } catch {
      return;
    }
  }
}
