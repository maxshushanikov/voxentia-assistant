import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiFetch, getLastRequestId } from '../api/client';

describe('apiFetch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns JSON and stores X-Request-ID from response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'X-Request-ID': 'req-test-123' }),
        json: async () => ({ text: 'hi' }),
      }),
    );

    const data = await apiFetch<{ text: string }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'hello' }),
    });

    expect(data.text).toBe('hi');
    expect(getLastRequestId()).toBe('req-test-123');
  });

  it('throws ApiError with server detail on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
        json: async () => ({ detail: 'An internal error occurred.', code: 'internal_error' }),
      }),
    );

    await expect(apiFetch('/api/chat')).rejects.toMatchObject({
      message: 'An internal error occurred.',
      status: 500,
      code: 'internal_error',
    });
  });
});
