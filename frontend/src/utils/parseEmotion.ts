import type { AvatarEmotion } from '../types';

const EMOTION_TAGS = ['happy', 'think', 'thinking', 'sad', 'laugh', 'surprised', 'neutral'] as const;

export function parseEmotionFromToken(token: string): AvatarEmotion | null {
  const match = token.match(/\[(happy|think|thinking|sad|laugh|surprised|neutral)\]/i);
  if (!match) return null;
  const raw = match[1].toLowerCase();
  if (raw === 'think') return 'thinking';
  if (raw === 'laugh' || raw === 'surprised') return 'happy';
  return raw as AvatarEmotion;
}

export function stripEmotionTags(text: string): string {
  return text.replace(/\[(?:happy|think|thinking|sad|laugh|surprised|neutral)\]/gi, '');
}

export function fuzzyMatch(query: string, keywords: string[]): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  let best = 0;
  for (const kw of keywords) {
    const k = kw.toLowerCase();
    if (k.includes(q) || q.includes(k)) best = Math.max(best, 0.9);
    else if (k.startsWith(q) || q.startsWith(k)) best = Math.max(best, 0.75);
    else {
      let matches = 0;
      for (const ch of q) if (k.includes(ch)) matches++;
      best = Math.max(best, matches / Math.max(q.length, 1));
    }
  }
  return best;
}
