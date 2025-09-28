import React, { useState, useEffect } from 'react';
import styles from './EventItem.module.css';
import { audioPlayer } from '../../utils/audioPlayer';
import { ServerEvent } from '@common/types';

type UIEvent = ServerEvent & { id: string | number; timestamp: Date };

interface EventItemProps {
  event: UIEvent;
  index: number;
}

const EventItem: React.FC<EventItemProps> = ({ event, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Проверяем состояние воспроизведения
  useEffect(() => {
    const checkPlayingState = () => {
      setIsPlaying(audioPlayer.getIsPlaying());
    };

    const interval = setInterval(checkPlayingState, 100);
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp: Date) => {
    const hours = timestamp.getHours().toString().padStart(2, '0');
    const minutes = timestamp.getMinutes().toString().padStart(2, '0');
    const seconds = timestamp.getSeconds().toString().padStart(2, '0');
    const milliseconds = timestamp.getMilliseconds().toString().padStart(3, '0');
    
    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const playAudio = async () => {
    if (event.type !== 'audio') return;
    await audioPlayer.playAudio(event.audio);
  };

  const getEventTypeDisplay = () => {
    if (event.type === 'audio' && event.audio) {
      return (
        <div className={styles.audioEventType}>
          <span>{event.type}</span>
          <button
            className={`${styles.playButton} ${isPlaying ? styles.playing : ''}`}
            onClick={(e) => {
              e.stopPropagation(); // Предотвращаем разворачивание события
              playAudio();
            }}
            disabled={isPlaying}
            title="Воспроизвести аудио"
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>
        </div>
      );
    }
    return event.type;
  };

  const formatEventContent = () => {
    // Для аудио событий показываем размер данных вместо самих данных
    if (event.type === 'audio') {
      const eventCopy = { ...event };
      eventCopy.audio = `[base64 аудио данные, размер: ${event.audio.length} символов]`;
      return JSON.stringify(eventCopy, null, 2);
    }
    return JSON.stringify(event, null, 2);
  };

  return (
    <div className={`${styles.event} ${isExpanded ? styles.expanded : styles.collapsed}`}>
      <div className={styles.eventHeader} onClick={toggleExpanded}>
        <span className={styles.eventNumber}>#{index + 1}</span>
        <span className={styles.eventType}>{getEventTypeDisplay()}</span>
        <span className={styles.eventTimestamp}>{formatTimestamp(event.timestamp)}</span>
        <span className={styles.eventToggle}>{isExpanded ? '▼' : '▶'}</span>
      </div>
      {isExpanded && (
        <div className={styles.eventContent}>
          {formatEventContent()}
        </div>
      )}
    </div>
  );
};

export default EventItem;