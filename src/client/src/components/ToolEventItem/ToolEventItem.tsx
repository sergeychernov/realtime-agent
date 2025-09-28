import React, { useState } from 'react';
import styles from './ToolEventItem.module.css';
import { ServerEvent } from '@common/types';

type UIEvent = (ServerEvent & Partial<{ tool: string; from: string; to: string; output: string }>) & {
  id: string | number;
  timestamp: Date;
};

interface ToolEventItemProps {
  event: UIEvent;
}

const ToolEventItem: React.FC<ToolEventItemProps> = ({ event }) => {
  const [isExpanded, setIsExpanded] = useState(false);

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

  const getEventHeader = () => {
    switch (event.type) {
      case 'handoff':
        return `${event.from} → ${event.to}`;
      case 'tool_start':
        return `▶️ ${event.tool}`;
      case 'tool_end':
        return `✅ ${event.tool}`;
      default:
        return event.type;
    }
  };

  const getEventClass = () => {
    return event.type === 'handoff' ? styles.handoff : styles.tool;
  };

  return (
    <div className={`${styles.event} ${isExpanded ? styles.expanded : styles.collapsed}`}>
      <div className={`${styles.eventHeader} ${getEventClass()}`} onClick={toggleExpanded}>
        <div className={styles.eventInfo}>
          <span className={styles.eventTitle}>{getEventHeader()}</span>
          <span className={styles.eventTimestamp}>{formatTimestamp(event.timestamp)}</span>
        </div>
        <span className={styles.eventToggle}>{isExpanded ? '▼' : '▶'}</span>
      </div>
      
      {event.output && !isExpanded && (
        <div className={styles.eventPreview}>
          {event.output.length > 100 ? `${event.output.substring(0, 100)}...` : event.output}
        </div>
      )}
      
      {isExpanded && (
        <div className={styles.eventContent}>
          <div className={styles.eventSection}>
            <strong>Полная информация:</strong>
            <pre className={styles.eventJson}>
              {JSON.stringify(event, null, 2)}
            </pre>
          </div>
          
          {event.output && (
            <div className={styles.eventSection}>
              <strong>Результат выполнения:</strong>
              <div className={styles.eventOutput}>
                {event.output}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ToolEventItem;