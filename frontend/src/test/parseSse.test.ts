import { describe, expect, it, vi } from 'vitest';

import { consumeSseBuffer } from '../utils/parseSse';

describe('consumeSseBuffer', () => {
  it('parses token and done events from SSE lines', () => {
    const events: unknown[] = [];
    const tail = consumeSseBuffer(
      'data: {"token":"Hello"}\n\ndata: {"done":{"text":"Hello","session_id":"s1"}}\n\n',
      (e) => events.push(e),
    );
    expect(tail).toBe('');
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ token: 'Hello' });
    expect(events[1]).toEqual({ done: { text: 'Hello', session_id: 's1' } });
  });

  it('keeps incomplete line in tail buffer', () => {
    const onEvent = vi.fn();
    const tail = consumeSseBuffer('data: {"token":"Hi', onEvent);
    expect(onEvent).not.toHaveBeenCalled();
    expect(tail).toBe('data: {"token":"Hi');
  });
});
