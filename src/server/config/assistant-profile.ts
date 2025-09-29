export interface ProfileConfig {
  name: string;
  gender: 'male' | 'female';
  description?: string;
  displayName: string; // Русское имя для отображения
}

export const YANDEX_PROFILES: ProfileConfig[] = [
  // Женские голоса
  { name: 'marina', gender: 'female', description: 'Марина - женский голос', displayName: 'Марина' },
  { name: 'jane', gender: 'female', description: 'Джейн - женский голос', displayName: 'Джейн' },
  { name: 'oksana', gender: 'female', description: 'Оксана - женский голос', displayName: 'Оксана' },
  { name: 'omazh', gender: 'female', description: 'Омаж - женский голос', displayName: 'Омаж' },
  { name: 'alena', gender: 'female', description: 'Алена - женский голос', displayName: 'Алена' },
  
  // Мужские голоса
  { name: 'filipp', gender: 'male', description: 'Филипп - мужской голос', displayName: 'Филипп' },
  { name: 'ermil', gender: 'male', description: 'Ермил - мужской голос', displayName: 'Ермил' },
  { name: 'madirus', gender: 'male', description: 'Мадирус - мужской голос', displayName: 'Мадирус' },
  { name: 'anton', gender: 'male', description: 'Антон - мужской голос', displayName: 'Антон' }
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
  return YANDEX_PROFILES.find(profile => profile.name === name);
}