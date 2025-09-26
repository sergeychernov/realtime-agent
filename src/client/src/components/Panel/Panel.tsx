import React, { useRef, useEffect, ReactNode } from 'react';
import styles from './Panel.module.css';

interface PanelProps {
  title: string;
  count?: number;
  children: ReactNode;
  headerControls?: ReactNode;
  autoScroll?: boolean;
  onAutoScrollChange?: (autoScroll: boolean) => void;
  maxHeight?: string;
  className?: string;
}

const Panel: React.FC<PanelProps> = ({
  title,
  count,
  children,
  headerControls,
  autoScroll = false,
  onAutoScrollChange,
  maxHeight = '500px',
  className = ''
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Автоскролл к последнему элементу
  useEffect(() => {
    if (autoScroll && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [children, autoScroll]);

  const handleScroll = () => {
    if (contentRef.current && onAutoScrollChange) {
      const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      onAutoScrollChange(isAtBottom);
    }
  };

  const scrollToTop = () => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
      onAutoScrollChange?.(false);
    }
  };

  const scrollToBottom = () => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
      onAutoScrollChange?.(true);
    }
  };

  return (
    <div className={`${styles.panel} ${className}`} style={{ maxHeight }}>
      <div className={styles.header}>
        <span className={styles.title}>
          {title} {count !== undefined && `(${count})`}
        </span>
        <div className={styles.controls}>
          {headerControls}
          <button 
            className={styles.scrollBtn} 
            onClick={scrollToTop}
            title="К началу"
          >
            ⬆️
          </button>
          <button 
            className={styles.scrollBtn} 
            onClick={scrollToBottom}
            title="К концу"
          >
            ⬇️
          </button>
          {onAutoScrollChange && (
            <label className={styles.autoScrollToggle}>
              <input 
                type="checkbox" 
                checked={autoScroll}
                onChange={(e) => onAutoScrollChange(e.target.checked)}
              />
              Автоскролл
            </label>
          )}
        </div>
      </div>
      <div 
        className={styles.content} 
        ref={contentRef}
        onScroll={handleScroll}
      >
        {children}
      </div>
    </div>
  );
};

export default Panel;