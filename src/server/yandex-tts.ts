import { YandexCloudConfig } from '../common/types.js';
import { TTSEmotion } from './types.js';
import { ProfileConfig } from './config/assistant-profile.js';

export interface TTSOptions {
  text: string;
  voice: string;
  emotion?: TTSEmotion;
  speed?: number;
  format?: 'lpcm' | 'oggopus';
  sampleRateHertz?: number;
}

export class YandexTTS {
  private config: YandexCloudConfig;

  constructor(config: YandexCloudConfig) {
    this.config = config;
  }

  /**
   * Синтезирует речь через Yandex SpeechKit API
   */
  async synthesizeSpeech(options: TTSOptions): Promise<Buffer> {
    const url = 'https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize';

    const params = new URLSearchParams({
      text: options.text,
      voice: options.voice,
      format: options.format || 'lpcm',
      sampleRateHertz: (options.sampleRateHertz || 16000).toString(), // Используем 16000 Hz
      folderId: this.config.folderId
    });

    // Добавляем эмоцию, если указана
    if (options.emotion) {
      params.append('emotion', options.emotion);
    }

    // Добавляем скорость, если указана
    if (options.speed) {
      params.append('speed', options.speed.toString());
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Api-Key ${this.config.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TTS API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const audioBuffer = await response.arrayBuffer();
      return Buffer.from(audioBuffer);
    } catch (error) {
      console.error('Ошибка синтеза речи:', error);
      throw error;
    }
  }

  /**
   * Создает приветственное сообщение с аудио
   */
  async createGreeting(profile: ProfileConfig): Promise<{ text: string; audio: Buffer; sampleRate: number }> {
    const greetings = [
      `Привет! Я ${profile.name}. Чем могу помочь?`,
      `Здравствуйте! ${profile.name} к вашим услугам.`,
      `Привет! ${profile.name} на связи. Готов помочь!`
    ];

    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    const sampleRate = 16000; // Используем поддерживаемую частоту

    // Выбираем подходящую эмоцию из поддерживаемых профилем
    let emotion: 'neutral' | 'good' | 'evil' = 'neutral';
    
    // Для приветствия предпочитаем 'good', если поддерживается, иначе 'neutral'
    if (profile.supportedEmotions.includes('good')) {
      emotion = 'good';
    } else {
      emotion = 'neutral';
    }

    const audio = await this.synthesizeSpeech({
      text: randomGreeting,
      voice: profile.voice,
      emotion: emotion,
      speed: 1.2,
      format: 'lpcm',
      sampleRateHertz: sampleRate
    });

    return {
      text: randomGreeting,
      audio,
      sampleRate
    };
  }
}