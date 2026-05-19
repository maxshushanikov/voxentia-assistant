import type { Message } from '../types';
import type { HistoryMessage } from '../api/types';

export function messagesToMarkdown(messages: Message[] | HistoryMessage[]): string {
  const lines = ['# Voxentia Chat Export', '', `Exported: ${new Date().toISOString()}`, ''];
  for (const m of messages) {
    const role = m.role === 'user' ? '**You**' : '**Assistant**';
    const ts = 'timestamp' in m && m.timestamp ? ` _(${m.timestamp})_` : '';
    lines.push(`### ${role}${ts}`, '', m.content, '');
  }
  return lines.join('\n');
}

export function messagesToJson(
  sessionId: string,
  messages: Message[] | HistoryMessage[],
): string {
  return JSON.stringify(
    {
      session_id: sessionId,
      exported_at: new Date().toISOString(),
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...('timestamp' in m && m.timestamp ? { timestamp: m.timestamp } : {}),
        ...('id' in m && m.id ? { id: m.id } : {}),
      })),
    },
    null,
    2,
  );
}

export function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
