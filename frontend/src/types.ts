export interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
  /** True while SSE tokens are still arriving */
  streaming?: boolean;
  timestamp?: string;
}

export type Language = 'en' | 'de' | 'ru';
export type Speaker = 'baya' | 'kseniya' | 'eugene' | 'aidar';
export type Personality = 'professional' | 'friendly' | 'academic';
export type AvatarEmotion = 'neutral' | 'happy' | 'thinking';

export const speakerGenderMap: Record<Speaker, 'feminine' | 'masculine'> = {
  'baya':    'feminine',
  'kseniya': 'feminine',
  'eugene':  'masculine',
  'aidar':   'masculine',
};

