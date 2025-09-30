import { WebSocket } from 'ws';
import { YandexCloudConfig, RealtimeSession, ServerEvent } from '../common/types.js';
import { toBuffer } from '../common/utils.js';
import { sanitizeStringsDeep } from './utils.js';
import { ToolsManager } from './tools.js';
import { transformYandexEvent } from './yandex-event-transform.js';
import { getRandomProfile, ProfileConfig } from './config/assistant-profile.js';
import { YandexTTS } from './yandex-tts.js';

export class YandexHandler {
  private yandexConfig: YandexCloudConfig;
  private toolsManager: ToolsManager;
  private pendingFunctionCalls: Map<string, string> = new Map();
  private pendingFunctionCallIds: Map<string, string> = new Map();
  private logTimestamps: Map<string, number> = new Map();
  private sendToClient: (session: RealtimeSession, event: ServerEvent) => void;
  private selectedProfile: ProfileConfig | null = null;
  private tts: YandexTTS;

  constructor(
    config: YandexCloudConfig,
    sendToClient: (session: RealtimeSession, event: ServerEvent) => void
  ) {
    this.yandexConfig = config;
    this.toolsManager = new ToolsManager();
    this.sendToClient = sendToClient;
    this.tts = new YandexTTS(config);
  }

  async connectToYandexCloud(session: RealtimeSession): Promise<void> {
    // Формируем правильный URL с параметрами модели
    const { apiKey, folderId, modelName } = this.yandexConfig;
    const url = `${this.yandexConfig.url}?model=gpt://${folderId}/${modelName}`;
    
    console.log(`[${session.id}] 🌐 Подключение к Yandex Cloud: ${url}`);
    
    const yandexWs = new WebSocket(url, {
      headers: {
        'Authorization': `api-key ${apiKey}`
      }
    });

    session.yandexWs = yandexWs;

    yandexWs.on('open', async () => {
      console.log(`[${session.id}] ✅ Подключен к Yandex Cloud`);
      // Получаем случайный профиль для этой сессии
      this.selectedProfile = getRandomProfile();
      console.log(`[${session.id}] 🎤 Выбран ассистент: ${this.selectedProfile.displayName} (${this.selectedProfile.gender})`);
      
      // Отправляем начальную конфигурацию сессии
      const sessionConfig = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: this.getSystemInstructions(),
          voice: this.selectedProfile.name,
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500
          },
          tools: this.getToolDefinitions(),
          tool_choice: 'auto',
          temperature: 0.8,
          max_response_output_tokens: 4096,
          speed: 1.0
        }
      };

      console.log(`[${session.id}] ⚙️ Отправка конфигурации сессии`);
      this.sendToYandex(session, sessionConfig);
      
      // Отправляем приветствие через TTS API
      setTimeout(async () => {
        try {
          console.log(`[${session.id}] 🎵 Генерация приветствия через TTS API`);
          
          const greeting = await this.tts.createGreeting(this.selectedProfile!);
          
          // Отправляем текст приветствия в историю
          this.sendToClient(session, {
            type: 'history_added',
            item: {
              type: 'message',
              role: 'assistant',
              content: [
                {
                  type: 'text',
                  text: greeting.text
                }
              ]
            }
          });

          // Отправляем аудио приветствия
          this.sendToClient(session, {
            type: 'audio',
            audio: greeting.audio.toString('base64'),
            sampleRate: greeting.sampleRate // Передаем частоту дискретизации
          });

          // Отправляем событие окончания аудио
          this.sendToClient(session, {
            type: 'audio_end'
          });

          console.log(`[${session.id}] ✅ Приветствие отправлено (${greeting.audio.length} байт аудио)`);
        } catch (error) {
          console.error(`[${session.id}] ❌ Ошибка генерации приветствия:`, error);
          
          // Fallback: отправляем текстовое приветствие
          const fallbackText = `Привет! Я ${this.selectedProfile?.displayName}. Как дела? Чем могу помочь?`;
          this.sendToClient(session, {
            type: 'history_added',
            item: {
              type: 'message',
              role: 'assistant',
              content: [
                {
                  type: 'text',
                  text: fallbackText
                }
              ]
            }
          });
        }
      }, 500);
    });

    yandexWs.on('message', (data: any) => {
      // ВАЖНО: Логируем ВСЕ сообщения от Yandex, с безопасной обработкой больших JSON
      const rawMessage = toBuffer(data).toString();
      console.log(`[${session.id}] 🔥 ПОЛУЧЕНО ОТ YANDEX: ${rawMessage.length} символов`);
      
      try {
        const parsed = JSON.parse(rawMessage);
        const sanitized = sanitizeStringsDeep(parsed, 200);
        console.log(`[${session.id}] 🔥 СОДЕРЖИМОЕ (JSON):`, JSON.stringify(sanitized));
        this.handleYandexMessage(session, toBuffer(data));
      } catch (error) {
        // Если это не JSON — выводим усечённую строку
        let logMessage = rawMessage;
        if (rawMessage.length > 500) {
          logMessage = rawMessage.substring(0, 500) + '...';
        }
        console.log(`[${session.id}] 🔥 СОДЕРЖИМОЕ:`, logMessage);
        console.error(`[${session.id}] ❌ ОШИБКА ПАРСИНГА YANDEX:`, error);
      }
    });

    yandexWs.on('close', (code: number, reason: Buffer) => {
      console.log(`[${session.id}] 🔌 Yandex Cloud отключился. Код: ${code}, Причина: ${reason}`);
    });

    yandexWs.on('error', (error: any) => {
      console.error(`[${session.id}] ❌ Ошибка Yandex Cloud WebSocket:`, error);
      this.sendToClient(session, {
        type: 'error',
        error: `Ошибка подключения к Yandex Cloud: ${error.message}`
      });
    });
  }

  private handleYandexMessage(session: RealtimeSession, data: Buffer): void {
    try {
      let event = JSON.parse(data.toString());
      console.log(`[${session.id}] 📨 Получено событие от Yandex: ${event.type}`);

      // Переключение агента при старте инструмента + событие handoff
      if (event.type === 'response.output_item.added' && event.item && event.item.type === 'function_call') {
        const toolName = event.item.name || 'unknown';
        const newAgent = this.getAgentNameForTool(toolName);
        if (newAgent !== session.activeAgent) {
          this.sendToClient(session, {
            type: 'handoff',
            from: session.activeAgent,
            to: newAgent,
          });
          session.activeAgent = newAgent;
        }
      }

      // Приведение error-события к стандартному формату (без мутаций исходного объекта)
      if (event.type === 'error' && event.message && !event.error) {
        event = { ...event, error: { error: event.message } };
        delete event.message;
      }

      // Побочные эффекты, вынесенные из трансформации
      if (event.type === 'response.audio.delta' && event.delta) {
        this.logErrorThrottled(session.id, 'audio_delta_received', () => {
          console.log(`[${session.id}] 🎵 Получена аудио дельта (audio), размер: ${event.delta.length} символов`);
        }, 3000);
      }

      if (event.type === 'response.output_audio.delta' && event.delta) {
        this.logErrorThrottled(session.id, 'output_audio_delta_received', () => {
          console.log(`[${session.id}] 🎵 Получена аудио дельта (output_audio), размер: ${event.delta.length} символов`);
        }, 3000);
      }

      if (event.type === 'response.output_item.added' && event.item?.type === 'function_call') {
        const callId = event.item.call_id;
        const itemId = event.item.id;
        const toolName = event.item.name || 'unknown';
        if (callId) {
          this.pendingFunctionCalls.set(callId, toolName);
        }
        if (itemId) {
          this.pendingFunctionCalls.set(itemId, toolName);
        }
        if (itemId && callId) {
          this.pendingFunctionCallIds.set(itemId, callId);
        }
      }

      if (event.type === 'response.output_item.done' && event.item?.type === 'function_call' && event.item.status === 'completed') {
        this.handleFunctionCall(session, event.item);
      }

      if (event.type === 'response.done' && session.pendingToolResult) {
        const toSpeak = session.pendingToolResult;
        setTimeout(() => {
          this.sendToYandex(session, {
            type: 'conversation.item.create',
            item: {
              type: 'message',
              role: 'user',
              content: [
                { type: 'input_text', text: `Озвучь результат: ${toSpeak}` }
              ]
            }
          });

          this.sendToYandex(session, {
            type: 'response.create',
            response: {
              modalities: ['audio'],
              instructions: 'Озвучь результат выполнения инструмента коротко и естественно.'
            }
          });
        }, 100);

        session.pendingToolResult = undefined;
      }

      // Чистая трансформация события в ServerEvent
      const transformed = transformYandexEvent(event, session.activeAgent);
      if (transformed) {
        this.sendToClient(session, transformed);
      }
    } catch (error) {
      console.error(`[${session.id}] ❌ Ошибка парсинга сообщения от Yandex:`, error);
    }
  }

  private async handleFunctionCall(session: RealtimeSession, functionCall: any): Promise<void> {
    console.log(`[${session.id}] 🔧 Обработка вызова функции:`, functionCall.name);

    try {
      // Парсим аргументы если они в виде строки
      let args = functionCall.arguments;
      if (typeof args === 'string') {
        try {
          args = JSON.parse(args);
        } catch (parseError) {
          console.error(`[${session.id}] ❌ Ошибка парсинга аргументов:`, parseError);
          args = {};
        }
      }

      const result = await this.toolsManager.executeTool(functionCall.name, args);
      
      const resultText = result.success ? result.result : `Ошибка: ${result.error}`;

      if (!functionCall.call_id) {
        console.error(`[${session.id}] ❌ Отсутствует call_id для function_call_output`);
        return;
      }

      console.log(`[${session.id}] 📤 Отправка результата функции в Yandex:`, resultText);
      this.sendToYandex(session, {
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: functionCall.call_id,
          output: resultText
        }
      });

      // Отправляем tool_end клиенту
      this.sendToClient(session, {
        type: 'tool_end',
        tool: functionCall.name,
        output: resultText
      });

      // УЛУЧШЕННОЕ СОХРАНЕНИЕ РЕЗУЛЬТАТА ДЛЯ ОЗВУЧИВАНИЯ
      // Сохраняем только если результат не пустой и успешный
      if (result.success && resultText.trim()) {
        session.pendingToolResult = resultText;
        console.log(`[${session.id}] 💾 Результат сохранен для озвучивания:`, resultText);
      }

      console.log(`[${session.id}] ✅ Результат функции отправлен`);
    } catch (error) {
      console.error(`[${session.id}] ❌ Ошибка выполнения функции:`, error);
    }
  }

  sendToYandex(session: RealtimeSession, message: any): void {
    if (session.yandexWs && session.yandexWs.readyState === WebSocket.OPEN) {
      const messageStr = JSON.stringify(message);
      
      // Тротлинг для частых сообщений
      if (message.type === 'input_audio_buffer.append') {
        this.logErrorThrottled(session.id, 'yandex_send_audio', () => {
          console.log(`[${session.id}] 📤 Отправка в Yandex: ${message.type}, размер: ${messageStr.length} байт`);
        }, 5000);
      } else {
        console.log(`[${session.id}] 📤 Отправка в Yandex: ${message.type}, размер: ${messageStr.length} байт`);
      }
      
      session.yandexWs.send(messageStr);
    } else {
      console.error(`[${session.id}] ❌ Не удалось отправить в Yandex, WebSocket не готов. Состояние: ${session.yandexWs?.readyState}`);
    }
  }

  logErrorThrottled(sessionId: string, key: string, logFn: () => void, intervalMs = 3000): void {
    const compositeKey = `${sessionId}:${key}`;
    const now = Date.now();
    const last = this.logTimestamps.get(compositeKey) || 0;
    
    if (now - last >= intervalMs) {
      logFn();
      this.logTimestamps.set(compositeKey, now);
    }
  }

  private getSystemInstructions(): string {
    return `# Системный контекст
Вы — голосовой помощник авиакомпании. 
Отвечайте на вопросы клиента коротко и дружелюбно. 
Используйте инструменты, не придумывайте ответы сами.

Ты ${this.selectedProfile?.displayName || 'Марина'}, специалист по часто задаваемым вопросам
Отвечайте на вопросы пользователя, вызывая нужный инструмент.
Отвечайте максимально коротко и естественно, без приветствий и без фраз вроде "Чем ещё могу помочь?".`;
  }

  private getToolDefinitions(): any[] {
    return [
      {
        type: 'function',
        name: 'faq_lookup_tool',
        description: 'Простейший поиск по часто задаваемым вопросам.',
        parameters: {
          type: 'object',
          properties: {
            question: {
              type: 'string',
              description: 'Вопрос пользователя'
            }
          },
          required: ['question']
        }
      },
      {
        type: 'function',
        name: 'convert_temperature_tool',
        description: 'Конвертирует температуру из градусов Цельсия в Фаренгейты.',
        parameters: {
          type: 'object',
          properties: {
            value_celsius: {
              type: 'number',
              description: 'Температура в градусах Цельсия'
            }
          },
          required: ['value_celsius']
        }
      }
    ];
  }

  private getAgentNameForTool(toolName: string): string {
    switch (toolName) {
      case 'convert_temperature_tool':
        return 'Temperature Agent';
      case 'faq_lookup_tool':
        return 'FAQ Agent';
      default:
        return 'General Agent';
    }
  }
}