import React, { useState } from 'react';
import Panel from '../Panel';
import styles from './TestPanel.module.css';

interface TestPanelProps {
  isConnected: boolean;
  onSendTextMessage: (text: string) => void;
}

const TestPanel: React.FC<TestPanelProps> = ({
  isConnected,
  onSendTextMessage
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleTestMessage = () => {
    if (inputValue.trim()) {
      onSendTextMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTestMessage();
    }
  };

  const handlePresetMessage = (message: string) => {
    onSendTextMessage(message);
  };

  // Обычные вопросы (не активируют инструменты)
  const presetQuestions = [
    'Привет! Как дела?',
    'Расскажи о себе',
    'Помоги мне с программированием',
    'Объясни квантовую физику простыми словами',
    'Какие книги ты рекомендуешь?',
    'Как приготовить пасту?',
    'Расскажи анекдот'
  ];

  // Вопросы, которые активируют инструменты
  const toolQuestions = [
    'двенадцать градусов цельсия',
    'двадцать пять градусов цельсия',
    'ноль градусов цельсия',
    'сколько мест в самолете?',
    'что можно взять в багаж?',
    'какое питание на борту?',
    'расскажи про багаж',
    'где аварийные выходы?'
  ];

  const headerControls = (
    <div className={styles.headerControls}>
      <input
        type="text"
        placeholder="Введите сообщение для тестирования..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={!isConnected}
        className={styles.testInput}
      />
      <button
        onClick={handleTestMessage}
        disabled={!isConnected || !inputValue.trim()}
        className={styles.testButton}
      >
        Тест
      </button>
    </div>
  );

  return (
    <Panel
      title="Тестирование"
      headerControls={headerControls}
      className={styles.testPanel}
      maxHeight="300px"
    >
      <div className={styles.presetQuestions}>
        <div className={styles.questionsRow}>
          <div className={styles.questionsColumn}>
            <h4 className={styles.sectionTitle}>Обычные вопросы:</h4>
            <div className={styles.questionGrid}>
              {presetQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handlePresetMessage(question)}
                  disabled={!isConnected}
                  className={styles.presetButton}
                  title={question}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
          
          <div className={styles.questionsColumn}>
            <h4 className={styles.sectionTitle}>Вопросы с инструментами:</h4>
            <div className={styles.questionGrid}>
              {toolQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handlePresetMessage(question)}
                  disabled={!isConnected}
                  className={`${styles.presetButton} ${styles.toolButton}`}
                  title={question}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
};

export default TestPanel;