import { WebSocket } from 'ws';
import { YandexCloudConfig, RealtimeSession, ServerEvent } from '../common/types.js';
import { toBuffer } from '../common/utils.js';
import { ClientHandler } from './client-handler.js';
import { YandexHandler } from './yandex-handler.js';

export class RealtimeWebSocketManager {
  private sessions: Map<string, RealtimeSession> = new Map();
  private yandexHandler: YandexHandler;
  private clientHandler: ClientHandler;

  constructor(config: YandexCloudConfig) {
    this.yandexHandler = new YandexHandler(config, this.sendToClient.bind(this));
    this.clientHandler = new ClientHandler(this.yandexHandler, this.sendToClient.bind(this));
  }

  async connect(websocket: any, sessionId: string): Promise<void> {
    console.log(`[${sessionId}] 🔌 Подключение новой сессии`);
    
    const session: RealtimeSession = {
      id: sessionId,
      websocket,
      yandexWs: undefined,
      imageBuffers: new Map(),
      isConnected: true,
      activeAgent: 'FAQ Agent',
      defaultAgent: 'FAQ Agent'
    };

    this.sessions.set(sessionId, session);

    // Подключение к Yandex Cloud Realtime API
    await this.yandexHandler.connectToYandexCloud(session);

    // Обработка сообщений от клиента
    websocket.on('message', (data: any) => {
      const session = this.sessions.get(sessionId);
      if (session) {
        this.clientHandler.handleMessage(session, toBuffer(data));
      }
    });

    websocket.on('close', () => {
      console.log(`[${sessionId}] 🔌 Клиент отключился`);
      this.disconnect(sessionId);
    });

    websocket.on('error', (error: any) => {
      console.error(`[${sessionId}] ❌ Ошибка WebSocket клиента:`, error);
      this.disconnect(sessionId);
    });
  }

  private sendToClient(session: RealtimeSession, event: ServerEvent): void {
    if (session.websocket.readyState === WebSocket.OPEN) {
      const eventStr = JSON.stringify(event);
      
      // ВАЖНО: Логируем ВСЕ отправки клиенту
      console.log(`[${session.id}] 📤 ОТПРАВКА КЛИЕНТУ: ${event.type}, размер: ${eventStr.length} байт`);
      
      session.websocket.send(eventStr);
      
      console.log(`[${session.id}] ✅ Событие отправлено клиенту успешно`);
    } else {
      console.error(`[${session.id}] ❌ Не удалось отправить клиенту, WebSocket не готов. Состояние: ${session.websocket.readyState}`);
    }
  }

  disconnect(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      console.log(`[${sessionId}] 🔌 Отключение сессии`);
      
      if (session.yandexWs) {
        session.yandexWs.close();
      }
      
      session.isConnected = false;
      this.sessions.delete(sessionId);
      
      console.log(`[${sessionId}] ✅ Сессия удалена`);
    }
  }
}
