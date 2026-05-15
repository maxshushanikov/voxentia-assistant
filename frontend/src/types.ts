export interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

export type Language = 'en' | 'de' | 'ru';
export type Speaker = 'baya' | 'kseniya' | 'eugene' | 'aidar';
export type Personality = 'professional' | 'friendly' | 'academic';

export const speakerGenderMap: Record<Speaker, 'feminine' | 'masculine'> = {
  'baya': 'feminine',
  'kseniya': 'feminine',
  'eugene': 'masculine',
  'aidar': 'masculine'
};
