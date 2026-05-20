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

export async function exportAsPDF(
  messages: Message[] | HistoryMessage[],
  sessionTitle: string,
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  doc.setFont('helvetica');

  doc.setFontSize(16);
  doc.text(sessionTitle.slice(0, 80), 10, 20);
  doc.setFontSize(11);

  let y = 35;
  for (const msg of messages) {
    const prefix = msg.role === 'user' ? 'You: ' : 'Voxentia: ';
    const lines = doc.splitTextToSize(prefix + msg.content, 185);
    doc.text(lines, 10, y);
    y += lines.length * 7 + 4;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  }
  doc.save(`${sessionTitle.replace(/[^\w\-]+/g, '_').slice(0, 40)}.pdf`);
}

export function comparisonToMarkdown(
  userText: string,
  modelA: string,
  contentA: string,
  latencyA?: number,
  modelB?: string,
  contentB?: string,
  latencyB?: number,
): string {
  const lines = [
    '# Voxentia Model Comparison',
    '',
    `**User:** ${userText}`,
    '',
    `## ${modelA}${latencyA != null ? ` (${latencyA} ms)` : ''}`,
    '',
    contentA,
  ];
  if (modelB && contentB != null) {
    lines.push('', `## ${modelB}${latencyB != null ? ` (${latencyB} ms)` : ''}`, '', contentB);
  }
  return lines.join('\n');
}
