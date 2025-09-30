import { useState, useRef, useCallback } from 'react';
import './App.css';
import ConversationPanel from './components/ConversationPanel';
import TestPanel from './components/TestPanel';
import EventsList from './components/EventsList';
import ToolEventsList from './components/ToolEventsList';
import { audioPlayer } from './utils/audioPlayer';
import { ServerEvent, MessageItem } from '@common/types';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audio?: string; // Добавляем поле для аудио
}

type UIEvent = ServerEvent & { id: number; timestamp: Date };

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [events, setEvents] = useState<UIEvent[]>([]);
  const [toolEvents, setToolEvents] = useState<UIEvent[]>([]);
  const [currentMessageAudio, setCurrentMessageAudio] = useState<string[]>([]); // Накапливаем аудио для текущего сообщения
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const connect = useCallback(async () => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}`;
      
      console.log('Подключение к:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log('✅ Подключен к серверу');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleRealtimeEvent(data);
      };

      ws.onclose = () => {
        setIsConnected(false);
        stopContinuousCapture();
        console.log('🔌 Отключен от сервера');
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to connect:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    stopContinuousCapture();
  }, []);

  const startContinuousCapture = useCallback(async () => {
    if (!isConnected || isCapturing) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const error = 'getUserMedia не поддерживается. Используйте HTTPS или localhost.';
      setAudioError(error);
      console.error(error);
      return;
    }

    try {
      setAudioError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ 
        sampleRate: 44100, 
        latencyHint: 'interactive' 
      });
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = (event) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const inputBuffer = event.inputBuffer.getChannelData(0);
          const int16Buffer = new Int16Array(inputBuffer.length);

          for (let i = 0; i < inputBuffer.length; i++) {
            int16Buffer[i] = Math.max(-32768, Math.min(32767, inputBuffer[i] * 32768));
          }

          wsRef.current.send(JSON.stringify({
            type: 'audio',
            data: Array.from(int16Buffer)
          }));
        }
      };

      setIsCapturing(true);
      console.log('✅ Аудио запись запущена');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setAudioError(`Ошибка доступа к микрофону: ${errorMessage}`);
      console.error('Failed to start audio capture:', error);
    }
  }, [isConnected, isCapturing]);

  const stopContinuousCapture = useCallback(() => {
    if (!isCapturing) return;

    setIsCapturing(false);

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    console.log('🛑 Аудио запись остановлена');
  }, [isCapturing]);

  const handleRealtimeEvent = useCallback((event: ServerEvent) => {
    console.log('📨 Получено событие:', event.type, event);
    
    // Используем текущее время как timestamp события
    const eventWithTimestamp: UIEvent = { 
      ...event, 
      timestamp: new Date(),
      id: Date.now() + Math.random()
    };
    
    // Добавляем в список событий
    setEvents(prev => [...prev, eventWithTimestamp]);

    // Обрабатываем события инструментов
    if (event.type === 'tool_start' || event.type === 'tool_end' || event.type === 'handoff') {
      setToolEvents(prev => [...prev, eventWithTimestamp]);
    }

    switch (event.type) {
      case 'audio':
        if (event.audio) {
          // Добавляем аудио в очередь для воспроизведения с частотой дискретизации
          audioPlayer.playAudio(event.audio, event.sampleRate);
          
          // Накапливаем аудио для текущего сообщения
          setCurrentMessageAudio(prev => [...prev, event.audio]);
        }
        break;
      case 'audio_interrupted':
        console.log('🛑 Аудио прервано');
        audioPlayer.stop();
        // Очищаем накопленное аудио
        setCurrentMessageAudio([]);
        break;
      case 'agent_end':
        console.log('🏁 Агент завершил ответ');
        // Очищаем накопленное аудио после завершения ответа
        setCurrentMessageAudio([]);
        break;
      case 'history_added':
        console.log('📝 Добавление в историю:', event.item);
        if (event.item) {
          addMessageFromItem(event.item);
        }
        break;
      case 'error':
        console.error('❌ Ошибка:', event.error);
        break;
    }
  }, []);

  const addMessageFromItem = useCallback((item: MessageItem) => {
    console.log('🔍 Обработка элемента истории:', item);
    
    if (!item || item.type !== 'message') {
      console.log('❌ Элемент не является сообщением:', item);
      return;
    }
  
    let content = '';
    const role = item.role;
  
    if (Array.isArray(item.content)) {
      for (const part of item.content) {
        if (!part || typeof part !== 'object') continue;
        
        // Обрабатываем разные типы контента
        if (part.type === 'text' && (part as any).text) {
          content += (part as any).text;
        } else if (part.type === 'input_text' && (part as any).text) {
          content += (part as any).text;
        } else if (part.type === 'input_audio' && (part as any).transcript) {
          content += (part as any).transcript;
        } else if (part.type === 'audio' && (part as any).transcript) {
          content += (part as any).transcript;
        } else if (part.type === 'output_text' && (part as any).text) {
          // Учитываем выходной текст ассистента
          content += (part as any).text;
        } else if (part.type === 'output_audio_transcript' && (part as any).transcript) {
          // Учитываем транскрипт озвученного ответа
          content += (part as any).transcript;
        }
      }
    } else if (typeof item.content === 'string') {
      content = item.content;
    }

    // Фолбэк: если ассистент и есть аудио, но текста нет — всё равно показываем сообщение
    const hasAudio = role === 'assistant' && currentMessageAudio.length > 0;
  
    if (content.trim() || hasAudio) {
      // Объединяем накопленное аудио для сообщения ассистента
      let combinedAudio = '';
      if (hasAudio) {
        combinedAudio = currentMessageAudio.join('');
      }
      
      const newMessage = {
        id: Date.now().toString(),
        type: role,
        content: content.trim() ? content : 'Озвученный ответ',
        timestamp: new Date(),
        audio: combinedAudio || undefined,
      } as const;
  
      setMessages(prev => [...prev, newMessage]);
    }
  }, [currentMessageAudio]);

  const toggleAudioCapture = useCallback(() => {
    if (isCapturing) {
      stopContinuousCapture();
    } else {
      startContinuousCapture();
    }
  }, [isCapturing, startContinuousCapture, stopContinuousCapture]);

  const sendTextMessage = useCallback((text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Останавливаем воспроизведение и очищаем очередь при отправке нового сообщения
      audioPlayer.stop();
      setCurrentMessageAudio([]);
      
      wsRef.current.send(JSON.stringify({
        type: 'text_message',
        text
      }));
      console.log('📤 Отправлено текстовое сообщение:', text);
    }
  }, []);

  const downloadClientLog = useCallback(() => {
    // Формируем данные для скачивания
    const logData = {
      events: events.map(event => ({
        ...event,
        timestamp: event.timestamp.toISOString()
      })),
      conversation: messages.map(message => ({
        ...message,
        timestamp: message.timestamp.toISOString()
      })),
      tools: toolEvents.map(event => ({
        ...event,
        timestamp: event.timestamp.toISOString()
      }))
    };

    // Создаем blob с JSON данными
    const jsonString = JSON.stringify(logData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Создаем ссылку для скачивания
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `client-log-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    
    // Добавляем в DOM, кликаем и удаляем
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Освобождаем память
    URL.revokeObjectURL(url);
    
    console.log('📥 Клиентский лог скачан');
  }, [events, messages, toolEvents]);

  return (
    <div className="app">
      <div className="header">
        <h1>Голосовой Ассистент</h1>
        <div className="header-buttons">
          <button
            onClick={isConnected ? disconnect : connect}
            className={`connect-btn ${isConnected ? 'connected' : 'disconnected'}`}
          >
            {isConnected ? 'Отключиться' : 'Подключиться'}
          </button>
          <button
            onClick={downloadClientLog}
            className="download-btn"
            title="Скачать клиентский лог для отладки"
          >
            Скачать JSON
          </button>
        </div>
      </div>
      
      <div className="main">
        <div className="left-column">
          <ConversationPanel
            messages={messages}
            isConnected={isConnected}
            isCapturing={isCapturing}
            audioError={audioError}
            onToggleAudioCapture={toggleAudioCapture}
          />
          
          <TestPanel
            isConnected={isConnected}
            onSendTextMessage={sendTextMessage}
          />
        </div>
        
        <div className="right-column">
          <EventsList 
            events={events} 
            title="События" 
            maxDisplayCount={0}
          />
          
          <ToolEventsList toolEvents={toolEvents} />
        </div>
      </div>
    </div>
  );
}

export default App;