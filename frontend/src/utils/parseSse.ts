/** Parse SSE lines from a text buffer; returns remaining buffer tail. */
export function consumeSseBuffer(
  buffer: string,
  onEvent: (data: unknown) => void,
): string {
  const lines = buffer.split('\n');
  const tail = lines.pop() ?? '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;
    const payload = trimmed.slice(5).trim();
    if (!payload) continue;
    try {
      onEvent(JSON.parse(payload));
    } catch {
      /* ignore malformed chunks */
    }
  }
  return tail;
}
