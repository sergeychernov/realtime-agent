import React from 'react';
import Panel from '../Panel';
import MessageItem from '../MessageItem';
import styles from './ConversationPanel.module.css';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ConversationPanelProps {
  messages: Message[];
  isConnected: boolean;
  isCapturing: boolean;
  audioError: string | null;
  onToggleAudioCapture: () => void;
}

const ConversationPanel: React.FC<ConversationPanelProps> = ({
  messages,
  isConnected,
  isCapturing,
  audioError,
  onToggleAudioCapture
}) => {
  const headerControls = (
    <div className={styles.headerControls}>
      <button
        onClick={onToggleAudioCapture}
        className={`${styles.micBtn} ${isCapturing ? styles.recording : styles.stopped}`}
        disabled={!isConnected}
        title={audioError || ''}
      >
        {isCapturing ? '🎤 Остановить' : '🔇 Микрофон'}
      </button>
      
      <span className={`${styles.status} ${isConnected ? styles.connected : styles.disconnected}`}>
        {isConnected ? 'Подключено' : 'Отключено'}
      </span>
    </div>
  );

  return (
    <div className={styles.conversationPanel}>
      <Panel
        title="Разговор"
        count={messages.length}
        headerControls={headerControls}
        className={styles.panel}
      >
        <div className={styles.messagesContent}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              {isConnected ? 'Начните говорить или отправьте тестовое сообщение' : 'Подключитесь к серверу'}
            </div>
          ) : (
            messages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))
          )}
        </div>
      </Panel>
      
      {audioError && (
        <div className={styles.audioError}>
          ⚠️ {audioError}
        </div>
      )}
    </div>
  );
};

export default ConversationPanel;