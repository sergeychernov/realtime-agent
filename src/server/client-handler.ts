import { WebSocket } from 'ws';
import { RealtimeSession, AudioMessage, TextMessage, ServerEvent } from '../common/types.js';
import { toBuffer } from '../common/utils.js';

export interface IYandexHandler {
  sendToYandex(session: RealtimeSession, message: any): void;
  logErrorThrottled(sessionId: string, key: string, logFn: () => void, intervalMs?: number): void;
}

export class ClientHandler {
  private yandexHandler: IYandexHandler;
  private sendToClient: (session: RealtimeSession, event: ServerEvent) => void;

  constructor(
    yandexHandler: IYandexHandler,
    sendToClient: (session: RealtimeSession, event: ServerEvent) => void
  ) {
    this.yandexHandler = yandexHandler;
    this.sendToClient = sendToClient;
  }

  handleMessage(session: RealtimeSession, data: Buffer): void {
    try {
      const message = JSON.parse(data.toString()) as any;
      
      // Логируем только не-аудио сообщения
      if (message.type !== 'audio') {
        console.log(`[${session.id}] 📋 Тип сообщения: ${message.type}`);
      }

      switch (message.type) {
        case 'audio':
          // Тротлинг для аудио логов
          this.yandexHandler.logErrorThrottled(session.id, 'audio_received', () => {
            console.log(`[${session.id}] 🎵 Обработка аудио сообщения, размер данных: ${message.data?.length || 0} сэмплов`);
          }, 5000);
          this.handleAudioMessage(session, message as AudioMessage);
          break;
        case 'text_message':
          console.log(`[${session.id}] 💬 Текстовое сообщение: "${message.text}"`);
          this.handleTextMessage(session, message as TextMessage);
          break;
        case 'commit_audio':
          console.log(`[${session.id}] 🎵 Коммит аудио`);
          this.handleCommitAudio(session);
          break;
        case 'interrupt':
          console.log(`[${session.id}] ⏹️ Прерывание`);
          this.handleInterrupt(session);
          break;
        default:
          console.warn(`[${session.id}] ⚠️ Неизвестный тип сообщения: ${message.type}`);
      }
    } catch (error) {
      console.error(`[${session.id}] ❌ Ошибка парсинга сообщения:`, error);
      this.sendToClient(session, {
        type: 'error',
        error: 'Неверный формат сообщения'
      });
    }
  }

  private handleTextMessage(session: RealtimeSession, message: TextMessage): void {
    console.log(`[${session.id}] 💬 Отправка текстового сообщения в Yandex: "${message.text}"`);
    
    if (session.yandexWs && session.yandexWs.readyState === WebSocket.OPEN) {
      // Отправляем текстовое сообщение как conversation item
      this.yandexHandler.sendToYandex(session, {
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: message.text
            }
          ]
        }
      });
      
      console.log(`[${session.id}] 🚀 Запрос генерации ответа`);
      // Запрашиваем ответ
      this.yandexHandler.sendToYandex(session, {
        type: 'response.create'
      });
    } else {
      console.error(`[${session.id}] ❌ Yandex WebSocket не подключен или не готов. Состояние: ${session.yandexWs?.readyState}`);
      this.sendToClient(session, {
        type: 'error',
        error: 'Соединение с Yandex Cloud не установлено'
      });
    }
  }

  private handleAudioMessage(session: RealtimeSession, message: AudioMessage): void {
    if (session.yandexWs && session.yandexWs.readyState === WebSocket.OPEN) {
      // Конвертируем int16 array в bytes
      const audioBuffer = Buffer.alloc(message.data.length * 2);
      for (let i = 0; i < message.data.length; i++) {
        const value = message.data[i];
        if (value !== undefined) {
          audioBuffer.writeInt16LE(value, i * 2);
        }
      }

      const base64Audio = audioBuffer.toString('base64');
      
      // Отправляем аудио в Yandex Cloud
      this.yandexHandler.sendToYandex(session, {
        type: 'input_audio_buffer.append',
        audio: base64Audio
      });
      
      // Тротлинг для аудио логов
      this.yandexHandler.logErrorThrottled(session.id, 'audio_sent', () => {
        console.log(`[${session.id}] 🎵 Аудио данные отправлены в Yandex, base64 размер: ${base64Audio.length} символов`);
      }, 5000);
    } else {
      this.yandexHandler.logErrorThrottled(session.id, 'yandex_ws_audio_not_connected', () => {
        console.error(`[${session.id}] ❌ Yandex WebSocket не подключен для аудио. Состояние: ${session.yandexWs?.readyState}`);
      }, 3000);
    }
  }

  private handleCommitAudio(session: RealtimeSession): void {
    console.log(`[${session.id}] 🎵 Коммит аудио буфера`);
    this.yandexHandler.sendToYandex(session, {
      type: 'input_audio_buffer.commit'
    });
    
    console.log(`[${session.id}] 🔄 Аудио зафиксировано, ожидаем автоматического обнаружения конца речи`);
  }

  private handleInterrupt(session: RealtimeSession): void {
    console.log(`[${session.id}] ⏹️ Отмена ответа`);
    this.yandexHandler.sendToYandex(session, {
      type: 'response.cancel'
    });
  }
}