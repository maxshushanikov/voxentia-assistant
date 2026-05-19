import type { Language, Speaker, Personality } from '../types';

/** Supported UI languages. */
export const LANG_OPTIONS: { value: Language; key: 'langName_en' | 'langName_de' | 'langName_ru' }[] = [
  { value: 'en', key: 'langName_en' },
  { value: 'de', key: 'langName_de' },
  { value: 'ru', key: 'langName_ru' },
];

/** Available TTS speakers. */
export const SPEAKER_OPTIONS: {
  value: Speaker;
  key: 'speaker_baya' | 'speaker_kseniya' | 'speaker_eugene' | 'speaker_aidar';
}[] = [
  { value: 'baya',    key: 'speaker_baya' },
  { value: 'kseniya', key: 'speaker_kseniya' },
  { value: 'eugene',  key: 'speaker_eugene' },
  { value: 'aidar',   key: 'speaker_aidar' },
];

/** Available personality modes. */
export const PERSONALITY_OPTIONS: Personality[] = ['professional', 'friendly', 'academic'];
