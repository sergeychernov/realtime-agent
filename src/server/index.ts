import 'dotenv/config'; // ВАЖНО: загружаем переменные окружения в самом начале
import express from 'express';
import { createServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { WebSocketServer } from 'ws';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { YandexCloudConfig } from '../common/types.js';
import { RealtimeWebSocketManager } from './websocket-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Конфигурация Yandex Cloud - теперь переменные должны загружаться
// Конфигурация Yandex Cloud - восстанавливаем правильный URL
const yandexConfig: YandexCloudConfig = {
  apiKey: process.env.YANDEX_API_KEY || '',
  folderId: process.env.YANDEX_FOLDER_ID || '',
  modelName: process.env.YANDEX_MODEL_NAME || 'speech-realtime-250923',
  url: process.env.YANDEX_WEBSOCKET_URL || 'wss://rest-assistant.api.cloud.yandex.net/v1/realtime/openai'
};

// Проверяем, что переменные загрузились
console.log('🔍 Проверяем переменные окружения:');
console.log('   YANDEX_API_KEY:', process.env.YANDEX_API_KEY ? `${process.env.YANDEX_API_KEY.substring(0, 10)}...` : 'НЕ ЗАДАН');
console.log('   YANDEX_FOLDER_ID:', process.env.YANDEX_FOLDER_ID || 'НЕ ЗАДАН');
console.log('   YANDEX_MODEL_NAME:', process.env.YANDEX_MODEL_NAME || 'НЕ ЗАДАН');
console.log('   YANDEX_WEBSOCKET_URL:', yandexConfig.url);

if (!yandexConfig.apiKey || !yandexConfig.folderId) {
  console.error('❌ ОШИБКА: Не заданы обязательные переменные окружения YANDEX_API_KEY или YANDEX_FOLDER_ID');
  console.error('   Проверьте файл .env в корне проекта');
  process.exit(1);
}

const manager = new RealtimeWebSocketManager(yandexConfig);

// Правильные пути
const projectRoot = path.resolve(__dirname, '../../');
const clientDistPath = path.join(projectRoot, 'src/client/dist');

console.log('📁 Пути к файлам:');
console.log('   __dirname:', __dirname);
console.log('   Project root:', projectRoot);
console.log('   Client dist:', clientDistPath);
console.log('   Client dist exists:', fs.existsSync(clientDistPath));

// Используем только React клиент
if (fs.existsSync(clientDistPath)) {
  console.log('📁 Используем собранный React клиент');
  app.use(express.static(clientDistPath));
} else {
  console.log('⚠️ React клиент не собран! Запустите: cd src/client && npm run build');
}

// Маршруты
app.get('/', (req, res) => {
  if (fs.existsSync(clientDistPath)) {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  } else {
    res.send(`
      <!DOCTYPE html>
      <html lang="ru">
      <head>
          <meta charset="UTF-8">
          <title>Ошибка</title>
      </head>
      <body>
          <h1>React клиент не собран</h1>
          <p>Выполните команды:</p>
          <pre>cd src/client && npm install && npm run build</pre>
      </body>
      </html>
    `);
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Настройка сервера
const PORT = parseInt(process.env.PORT || '8000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Ищем сертификаты в правильном корне проекта
const certPath = path.join(projectRoot, 'cert.pem');
const keyPath = path.join(projectRoot, 'key.pem');

console.log('🔍 Проверяем SSL сертификаты:');
console.log('   Cert path:', certPath);
console.log('   Key path:', keyPath);
console.log('   Cert exists:', fs.existsSync(certPath));
console.log('   Key exists:', fs.existsSync(keyPath));

const useHttps = fs.existsSync(certPath) && fs.existsSync(keyPath);

let server: import('http').Server | import('https').Server;

if (useHttps) {
  console.log('🔒 Загружаем SSL сертификаты...');
  
  try {
    const options = {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath)
    };
    server = createHttpsServer(options, app);
    console.log('✅ SSL сертификаты загружены успешно');
  } catch (error) {
    console.error('❌ Ошибка загрузки SSL сертификатов:', error);
    console.log('🔓 Переключаемся на HTTP');
    server = createServer(app);
  }
} else {
  console.log('🔓 SSL сертификаты не найдены, используем HTTP');
  server = createServer(app);
}

const wss = new WebSocketServer({ server });

// Обработка WebSocket подключений
wss.on('connection', (ws, req) => {
  const sessionId = uuidv4();
  console.log(`🔌 Новое WebSocket подключение: ${sessionId}`);
  
  manager.connect(ws, sessionId);
});

server.listen(PORT, HOST, () => {
  const actualProtocol = useHttps ? 'https' : 'http';
  const wsProtocol = useHttps ? 'wss' : 'ws';
  
  console.log(`🚀 Сервер запущен:`);
  console.log(`   ${actualProtocol.toUpperCase()}: ${actualProtocol}://${HOST}:${PORT}`);
  console.log(`   WebSocket: ${wsProtocol}://${HOST}:${PORT}`);
  console.log(`   SSL: ${useHttps ? 'включен' : 'отключен'}`);
  
  if (useHttps) {
    console.log(`🌐 Откройте: https://localhost:${PORT}`);
    console.log(`⚠️  Если браузер показывает предупреждение - нажмите "Дополнительно" → "Перейти на localhost"`);
  } else {
    console.log(`🌐 Откройте: http://localhost:${PORT}`);
    console.log(`⚠️  Для работы микрофона нужен HTTPS!`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Получен сигнал SIGTERM, завершение работы...');
  server.close(() => {
    console.log('✅ Сервер остановлен');
    process.exit(0);
  });
});

export { app, server, manager };