import React, { useState, useEffect } from 'react';
import styles from './MessageItem.module.css';
import { audioPlayer } from '../../utils/audioPlayer';

interface MessageItemProps {
  message: {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    audio?: string;
  };
}

const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  // Проверяем состояние воспроизведения
  useEffect(() => {
    const checkPlayingState = () => {
      setIsPlaying(audioPlayer.getIsPlaying());
    };

    const interval = setInterval(checkPlayingState, 100);
    return () => clearInterval(interval);
  }, []);

  const playAudio = async () => {
    if (!message.audio) return;
    console.log('🎵 Воспроизведение аудио из сообщения:', message.id);
    await audioPlayer.playAudio(message.audio);
  };

  const hasAudio = message.audio && message.audio.length > 0;

  return (
    <div className={`${styles.message} ${styles[message.type]}`}>
      <div className={styles.messageBubble}>
        <div className={styles.messageContent}>
          {message.content}
        </div>
        {hasAudio && (
          <div className={styles.audioControls}>
            <button
              className={`${styles.playButton} ${isPlaying ? styles.playing : ''}`}
              onClick={playAudio}
              disabled={isPlaying}
              title="Воспроизвести аудио"
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            <span className={styles.audioInfo}>
              Аудио ({Math.round(message.audio!.length / 1000)}KB)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItem;