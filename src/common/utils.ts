// Общие утилиты

// Вспомогательная функция для преобразования RawData в Buffer
export function toBuffer(data: any): Buffer {
  if (Buffer.isBuffer(data)) {
    return data;
  } else if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  } else if (Array.isArray(data)) {
    return Buffer.concat(data);
  } else {
    return Buffer.from(data);
  }
}

// Функция для генерации уникальных ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Функция для логирования с временными метками
export function logWithTimestamp(message: string, level: 'info' | 'error' | 'warn' = 'info'): void {
  const timestamp = new Date().toISOString();
  console[level](`[${timestamp}] ${message}`);
}

// Функция для валидации сообщений
export function isValidClientMessage(data: any): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  const validTypes = [
    'audio', 'image', 'image_start', 'image_chunk', 
    'image_end', 'commit_audio', 'interrupt', 'text_message'
  ];
  
  return validTypes.includes(data.type);
}