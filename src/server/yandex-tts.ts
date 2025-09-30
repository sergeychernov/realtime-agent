import { YandexCloudConfig } from '../common/types.js';
import { ProfileConfig } from './config/assistant-profile.js';

export interface TTSOptions {
  text: string;
  voice: string;
  emotion?: 'good' | 'evil' | 'neutral';
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
      `Привет! Я ${profile.displayName}. Чем могу помочь?`,
      `Здравствуйте! ${profile.displayName} к вашим услугам.`,
      `Привет! ${profile.displayName} на связи. Готов помочь!`
    ];

    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    const sampleRate = 16000; // Используем поддерживаемую частоту

    const audio = await this.synthesizeSpeech({
      text: randomGreeting,
      voice: profile.name,
      emotion: 'good',
      speed: 1.0,
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