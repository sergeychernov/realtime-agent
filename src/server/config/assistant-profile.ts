import { TTSEmotion } from '../types.js';

export interface ProfileConfig {
  voice: string;
  gender: 'male' | 'female';
  description?: string;
  name: string; // Русское имя для отображения
  supportedEmotions: TTSEmotion[]; // Поддерживаемые эмоции для API v1
}

export const YANDEX_PROFILES: ProfileConfig[] = [
  // Женские голоса (поддерживаемые в API v1)
  { 
    voice: 'marina', 
    gender: 'female', 
    description: 'Марина - женский голос', 
    name: 'Марина',
    supportedEmotions: ['neutral'] 
  },
  { 
    voice: 'jane', 
    gender: 'female', 
    description: 'Джейн - женский голос', 
    name: 'Джейн',
    supportedEmotions: ['neutral', 'good', 'evil'] 
  },
  { 
    voice: 'omazh', 
    gender: 'female', 
    description: 'Омаж - женский голос', 
    name: 'Омаж',
    supportedEmotions: ['neutral', 'evil'] 
  },
  { 
    voice: 'alena', 
    gender: 'female', 
    description: 'Алена - женский голос', 
    name: 'Алена',
    supportedEmotions: ['neutral', 'good'] 
  },

  // Мужские голоса (поддерживаемые в API v1)
  { 
    voice: 'filipp', 
    gender: 'male', 
    description: 'Филипп - мужской голос', 
    name: 'Филипп',
    supportedEmotions: ['neutral'] 
  },
  { 
    voice: 'ermil', 
    gender: 'male', 
    description: 'Ермил - мужской голос', 
    name: 'Ермил',
    supportedEmotions: ['neutral', 'good'] 
  },
  { 
    voice: 'zahar', 
    gender: 'male', 
    description: 'Захар - мужской голос', 
    name: 'Захар',
    supportedEmotions: ['neutral', 'good'] 
  }
];

/**
 * Получает случайный профиль из списка доступных профилей
 */
export function getRandomProfile(): ProfileConfig {
  const randomIndex = Math.floor(Math.random() * YANDEX_PROFILES.length);
  return YANDEX_PROFILES[randomIndex];
}

/**
 * Получает случайный профиль определенного пола
 */
export function getRandomProfileByGender(gender: 'male' | 'female'): ProfileConfig {
  const profilesByGender = YANDEX_PROFILES.filter(profile => profile.gender === gender);
  const randomIndex = Math.floor(Math.random() * profilesByGender.length);
  return profilesByGender[randomIndex];
}

/**
 * Получает профиль по имени
 */
export function getProfileByName(name: string): ProfileConfig | undefined {
  return YANDEX_PROFILES.find(profile => profile.voice === name);
}