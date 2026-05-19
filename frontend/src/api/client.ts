const REQUEST_ID_HEADER = 'X-Request-ID';

let lastRequestId: string | null = null;

export function getLastRequestId(): string | null {
  return lastRequestId;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  errorCode?: string;
  details?: Record<string, unknown>;
  requestId?: string | null;

  constructor(
    message: string,
    status: number,
    code?: string,
    requestId?: string | null,
    errorCode?: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errorCode = errorCode;
    this.details = details;
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
    let message = response.statusText;
    let code: string | undefined;
    let errorCode: string | undefined;
    let details: Record<string, unknown> | undefined;
    try {
      const body = await response.json();
      if (body.error_code) {
        errorCode = body.error_code;
        message = body.message ?? message;
        details = body.details;
        code = body.error_code;
      } else {
        message = body.detail ?? body.message ?? message;
        code = body.code ?? body.error_code;
      }
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(message, response.status, code, requestId, errorCode, details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
