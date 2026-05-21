export interface RagSource {
  filename: string;
  page?: number | null;
  chunk_index: number;
  score: number;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
  /** True while SSE tokens are still arriving */
  streaming?: boolean;
  timestamp?: string;
  model?: string;
  ragSources?: RagSource[];
  intentConfidence?: number;
  intentSource?: string;
  dbId?: number;
  comparison?: {
    modelA: string;
    contentA: string;
    modelB: string;
    contentB: string;
    streamingA?: boolean;
    streamingB?: boolean;
    latencyA?: number;
    latencyB?: number;
  };
}

export type Language = 'en' | 'de' | 'ru';
export type Speaker = 'baya' | 'kseniya' | 'eugene' | 'aidar';
export type Personality = 'professional' | 'friendly' | 'academic';
export type AvatarEmotion = 'neutral' | 'happy' | 'thinking' | 'sad';

export const speakerGenderMap: Record<Speaker, 'feminine' | 'masculine'> = {
  'baya':    'feminine',
  'kseniya': 'feminine',
  'eugene':  'masculine',
  'aidar':   'masculine',
};

