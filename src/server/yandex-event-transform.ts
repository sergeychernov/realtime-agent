import { ServerEvent, MessageItem } from '../common/types.js';

export function transformYandexEvent(event: any, agent: string): ServerEvent | null {
  // Чистая трансформация событий Yandex → ServerEvent без побочных эффектов
  switch (event.type) {
    case 'session.created':
    case 'session.updated':
    case 'input_audio_buffer.committed':
      return null;

    case 'input_audio_buffer.speech_started':
      return { type: 'audio_interrupted' };

    case 'input_audio_buffer.speech_stopped':
      return { type: 'audio_end' };

    case 'conversation.item.created':
      if (event.item && event.item.type === 'message') {
        return {
          type: 'history_added',
          item: event.item as MessageItem
        };
      }
      return null;

    case 'response.created':
      return { type: 'agent_start', agent };

    case 'response.done':
      return { type: 'agent_end', agent };

    case 'response.output_item.added':
      if (event.item && event.item.type === 'function_call') {
        const toolName = event.item.name || 'unknown';
        return {
          type: 'tool_start',
          tool: toolName
        };
      }
      if (event.item && event.item.type === 'message') {
        return {
          type: 'history_added',
          item: event.item as MessageItem
        };
      }
      return null;

    case 'response.output_item.done':
      if (event.item && event.item.type === 'function_call' && event.item.status === 'completed') {
        return {
          type: 'history_added',
          item: event.item
        };
      }
      return null;

    case 'response.audio.delta':
      if (event.delta) {
        return {
          type: 'audio',
          audio: event.delta
        };
      }
      return null;

    case 'response.audio.done':
      return { type: 'audio_end' };

    case 'response.output_audio.delta':
      if (event.delta) {
        return {
          type: 'audio',
          audio: event.delta
        };
      }
      return null;

    case 'response.output_audio.done':
      return { type: 'audio_end' };

    case 'conversation.item.input_audio_transcription.completed':
      return {
        type: 'history_added',
        item: {
          type: 'message',
          role: 'user',
          content: [
            { type: 'input_audio', transcript: event.transcript }
          ]
        }
      };

    case 'error':
      return {
        type: 'error',
        error: event.error?.error || event.error || event.message || 'Unknown error'
      };

    case 'response.content_part.added':
    case 'response.content_part.done':
    case 'response.output_text.done':
    case 'response.output_audio_transcript.done':
      return {
        type: 'raw_model_event',
        raw_model_event: event
      };

    default:
      return {
        type: 'raw_model_event',
        raw_model_event: event
      };
  }
}