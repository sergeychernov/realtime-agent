class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private isPlaying: boolean = false;
  private audioQueue: Array<{audio: string, sampleRate?: number}> = [];
  private isProcessingQueue: boolean = false;

  async initialize() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Проверяем состояние AudioContext
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('🎵 AudioContext возобновлен');
    }
  }

  async playAudio(base64Audio: string, sampleRate?: number): Promise<void> {
    console.log('🎵 Добавление аудио в очередь, размер:', base64Audio.length, 'частота:', sampleRate);
    
    // Добавляем в очередь
    this.audioQueue.push({audio: base64Audio, sampleRate});
    
    // Запускаем обработку очереди если она не запущена
    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.audioQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.audioQueue.length > 0) {
      const audioItem = this.audioQueue.shift()!;
      
      try {
        await this.playAudioImmediate(audioItem.audio, audioItem.sampleRate);
        
        // Ждем завершения воспроизведения
        while (this.isPlaying) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error('❌ Ошибка воспроизведения аудио из очереди:', error);
      }
    }

    this.isProcessingQueue = false;
  }

  private async playAudioImmediate(base64Audio: string, sampleRate?: number): Promise<void> {
    try {
      await this.initialize();
      
      // Останавливаем текущее воспроизведение если есть
      this.stopImmediate();

      const audioData = atob(base64Audio);
      console.log('🎵 Декодированы base64 данные, размер:', audioData.length);
      
      // Создаем ArrayBuffer для первой попытки декодирования
      const arrayBuffer = new ArrayBuffer(audioData.length);
      const view = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < audioData.length; i++) {
        view[i] = audioData.charCodeAt(i);
      }

      let audioBuffer: AudioBuffer;

      try {
        // Сначала пробуем декодировать как готовый аудио файл
        const arrayBufferCopy = arrayBuffer.slice(0);
        audioBuffer = await this.audioContext!.decodeAudioData(arrayBufferCopy);
        console.log('🎵 Аудио декодировано как готовый файл, длительность:', audioBuffer.duration, 'сек');
      } catch (decodeError) {
        console.log('🎵 Не удалось декодировать как готовый файл, пробуем как PCM16');
        
        // Создаем новый ArrayBuffer для PCM обработки
        const pcmArrayBuffer = new ArrayBuffer(audioData.length);
        const pcmView = new Uint8Array(pcmArrayBuffer);
        
        for (let i = 0; i < audioData.length; i++) {
          pcmView[i] = audioData.charCodeAt(i);
        }
        
        // Обрабатываем как PCM16 данные
        const pcmData = new Int16Array(pcmArrayBuffer);
        const usedSampleRate = sampleRate || 44100; // Используем переданную частоту или 44.1kHz по умолчанию
        const numberOfChannels = 1; // Моно
        
        console.log('🎵 Используем частоту дискретизации:', usedSampleRate, 'Hz');
        
        // Создаем AudioBuffer для PCM данных
        audioBuffer = this.audioContext!.createBuffer(
          numberOfChannels,
          pcmData.length,
          usedSampleRate
        );
        
        // Конвертируем Int16 в Float32 и заполняем буфер
        const channelData = audioBuffer.getChannelData(0);
        for (let i = 0; i < pcmData.length; i++) {
          channelData[i] = pcmData[i] / 32768.0; // Нормализуем от -32768..32767 к -1..1
        }
        
        console.log('🎵 PCM16 данные обработаны, длительность:', audioBuffer.duration, 'сек');
      }

      // Воспроизводим
      this.currentSource = this.audioContext!.createBufferSource();
      this.currentSource.buffer = audioBuffer;
      this.currentSource.connect(this.audioContext!.destination);
      
      this.currentSource.onended = () => {
        this.isPlaying = false;
        this.currentSource = null;
        console.log('🎵 Воспроизведение завершено');
      };
      
      this.isPlaying = true;
      this.currentSource.start();
      console.log('🎵 Воспроизведение аудио запущено');
      
    } catch (error) {
      console.error('❌ Ошибка воспроизведения аудио:', error);
      this.isPlaying = false;
      this.currentSource = null;
    }
  }

  stop(): void {
    // Очищаем очередь
    this.audioQueue = [];
    this.stopImmediate();
  }

  private stopImmediate(): void {
    if (this.currentSource && this.isPlaying) {
      try {
        this.currentSource.stop();
        console.log('🎵 Воспроизведение остановлено');
      } catch (error) {
        // Игнорируем ошибки остановки
      }
      this.currentSource = null;
      this.isPlaying = false;
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  getQueueLength(): number {
    return this.audioQueue.length;
  }

  destroy(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Создаем глобальный экземпляр
export const audioPlayer = new AudioPlayer();