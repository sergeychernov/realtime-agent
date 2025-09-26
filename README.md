# Yandex Cloud Realtime API TypeScript Server

Полнофункциональный TypeScript сервер с Express для работы с Yandex Cloud Realtime API с React клиентом.

## Особенности

- ✅ **TypeScript** - Полная типизация для безопасности кода
- ✅ **Express** - Быстрый и надежный веб-фреймворк
- ✅ **React Client** - Современный веб-интерфейс с поддержкой аудио
- ✅ **WebSocket** - Реалтайм коммуникация с клиентами
- ✅ **Yandex Cloud Integration** - Прямая интеграция с Yandex Cloud Realtime API
- ✅ **Audio Processing** - Обработка аудио потоков в реальном времени
- ✅ **Image Support** - Поддержка изображений и мультимодальности
- ✅ **Tools Integration** - Поддержка пользовательских инструментов

## Быстрый старт

### 1. Установка

```bash
# Клонируем репозиторий
git clone <repository-url>
cd realtime-agent

# Устанавливаем зависимости сервера
npm install

# Устанавливаем зависимости клиента
cd src/client
npm install
cd ../..
```

### 2. Конфигурация

Создайте `.env` файл в корне проекта:

```env
YANDEX_API_KEY=your_api_key_here
YANDEX_FOLDER_ID=your_folder_id_here
YANDEX_MODEL_NAME=speech-realtime-250923
PORT=8000
HOST=0.0.0.0
```

### 3. Запуск в режиме разработки

В режиме разработки сервер и клиент запускаются отдельно (две вкладки терминала):

- Сервер (автоперезагрузка):
```bash
npm run dev
```

- Клиент (Vite dev server):
```bash
npm run dev:client
```

После запуска:
- Сервер: http://localhost:8000
- Клиент: http://localhost:5173

### 4. Сборка и продакшн запуск

```bash
# Сборка сервера и клиента
npm run build

# Запуск продакшн сервера (отдает собранный клиент)
npm start
```

Приложение будет доступно по адресу: `http://localhost:8000`

## API Endpoints

### HTTP Endpoints

- `GET /` - Главная страница с клиентским интерфейсом
- `GET /health` - Проверка состояния сервера

### WebSocket Endpoint

- `ws://localhost:8000/ws/{session_id}` - WebSocket соединение для реалтайм коммуникации

## Сообщения WebSocket

### От клиента к серверу

```typescript
// Аудио сообщение
{
  type: 'audio',
  data: number[] // int16 array
}

// Изображение
{
  type: 'image',
  data_url: string,
  text?: string
}

// Прерывание
{
  type: 'interrupt'
}

// Коммит аудио буфера
{
  type: 'commit_audio'
}
```

### От сервера к клиенту

```typescript
// Аудио ответ
{
  type: 'audio',
  audio: string // base64 encoded
}

// Начало работы агента
{
  type: 'agent_start',
  agent: string
}

// Ошибка
{
  type: 'error',
  error: string
}
```

## Архитектура

## Перезапуск и обновление

### Перезапуск сервера (dev)

- Сервер перезапускается автоматически при изменении кода (watch).
- Для ручного перезапуска:
  - Остановить: Ctrl+C
  - Запустить снова: `npm run dev`

### Перезапуск клиента (dev)

- Клиент обновляется автоматически благодаря HMR (Hot Module Replacement).
- Если требуется перезапуск вручную:
  - Остановить: Ctrl+C в терминале клиента
  - Запустить снова: `npm run dev:client`

### Полная пересборка при проблемах

Если столкнулись с проблемами кэша или зависимостей:

```bash
# Сервер
rm -rf node_modules package-lock.json
npm install

# Клиент
cd src/client
rm -rf node_modules package-lock.json
npm install
cd ../..

# Полная сборка
npm run build
```

## Полезные команды

- Сервер:
  - `npm run dev` — запуск dev-сервера с автоперезагрузкой
  - `npm run build:server` — сборка только сервера
  - `npm start` — запуск продакшн сервера

- Клиент:
  - `npm run dev:client` — запуск клиента (Vite dev server)
  - `npm run build:client` — сборка клиента
  - `cd src/client && npm run preview` — локальный просмотр собранного клиента

- Общее:
  - `npm run build` — сборка сервера и клиента
  - `npm run lint` — проверка линтером
  - `npm run format` — автоформатирование
