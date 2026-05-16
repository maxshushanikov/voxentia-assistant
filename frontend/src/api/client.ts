const REQUEST_ID_HEADER = 'X-Request-ID';

let lastRequestId: string | null = null;

export function getLastRequestId(): string | null {
  return lastRequestId;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  requestId?: string | null;

  constructor(message: string, status: number, code?: string, requestId?: string | null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (lastRequestId) {
    headers.set(REQUEST_ID_HEADER, lastRequestId);
  }

  const response = await fetch(path, { ...init, headers });
  const requestId = response.headers.get(REQUEST_ID_HEADER);
  if (requestId) {
    lastRequestId = requestId;
  }

  if (!response.ok) {
    let detail = response.statusText;
    let code: string | undefined;
    try {
      const body = await response.json();
      detail = body.detail ?? detail;
      code = body.code;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(detail, response.status, code, requestId);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
