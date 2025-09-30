// Общие типы для клиента и сервера

// Типы сообщений от клиента
export interface AudioMessage {
  type: 'audio';
  data: number[]; // int16 array
}

export interface ImageMessage {
  type: 'image';
  data_url?: string;
  text?: string;
}

export interface ImageStartMessage {
  type: 'image_start';
  id: string;
  text?: string;
}

export interface ImageChunkMessage {
  type: 'image_chunk';
  id: string;
  chunk: string;
}

export interface ImageEndMessage {
  type: 'image_end';
  id: string;
}

export interface CommitAudioMessage {
  type: 'commit_audio';
}

export interface InterruptMessage {
  type: 'interrupt';
}

export interface TextMessage {
  type: 'text_message';
  text: string;
}

export type ClientMessage = 
  | AudioMessage 
  | ImageMessage 
  | ImageStartMessage 
  | ImageChunkMessage 
  | ImageEndMessage 
  | CommitAudioMessage 
  | InterruptMessage
  | TextMessage;

// Типы событий от сервера
export interface BaseEvent {
  type: string;
}

export interface AgentStartEvent extends BaseEvent {
  type: 'agent_start';
  agent: string;
}

export interface AgentEndEvent extends BaseEvent {
  type: 'agent_end';
  agent: string;
}

export interface HandoffEvent extends BaseEvent {
  type: 'handoff';
  from: string;
  to: string;
}

export interface ToolStartEvent extends BaseEvent {
  type: 'tool_start';
  tool: string;
}

export interface ToolEndEvent extends BaseEvent {
  type: 'tool_end';
  tool: string;
  output: string;
}

export interface AudioEvent extends BaseEvent {
  type: 'audio';
  audio: string; // base64 encoded
  sampleRate?: number; // частота дискретизации
}

export interface AudioInterruptedEvent extends BaseEvent {
  type: 'audio_interrupted';
}

export interface AudioEndEvent extends BaseEvent {
  type: 'audio_end';
}

export interface HistoryUpdatedEvent extends BaseEvent {
  type: 'history_updated';
  history: any[];
}

export interface HistoryAddedEvent extends BaseEvent {
  type: 'history_added';
  item: YandexMessageItem;
}

export interface GuardrailTrippedEvent extends BaseEvent {
  type: 'guardrail_tripped';
  guardrail_results: Array<{ name: string }>;
}

export interface RawModelEvent extends BaseEvent {
  type: 'raw_model_event';
  raw_model_event: any;
}

export interface ErrorEvent extends BaseEvent {
  type: 'error';
  error: string;
}

export interface InputAudioTimeoutEvent extends BaseEvent {
  type: 'input_audio_timeout_triggered';
}

export interface ClientInfoEvent extends BaseEvent {
  type: 'client_info';
  info: string;
  [key: string]: any;
}

export type ServerEvent = 
  | AgentStartEvent 
  | AgentEndEvent 
  | HandoffEvent 
  | ToolStartEvent 
  | ToolEndEvent 
  | AudioEvent 
  | AudioInterruptedEvent 
  | AudioEndEvent 
  | HistoryUpdatedEvent 
  | HistoryAddedEvent 
  | GuardrailTrippedEvent 
  | RawModelEvent 
  | ErrorEvent 
  | InputAudioTimeoutEvent 
  | ClientInfoEvent;

// Конфигурация Yandex Cloud
export interface YandexCloudConfig {
  apiKey: string;
  folderId: string;
  modelName: string;
  url: string;
}

// Результат выполнения инструмента
export interface ToolResult {
  success: boolean;
  result: string;
  error?: string;
}

// Сессия реального времени
export interface RealtimeSession {
  id: string;
  websocket: any; // WebSocket - будет типизирован в серверной части
  yandexWs?: any; // WebSocket - будет типизирован в серверной части
  imageBuffers: Map<string, { text: string; chunks: string[] }>;
  isConnected: boolean;
  activeAgent: string;
  defaultAgent: string;
  pendingToolResult?: string;
}

// Типы для сообщений
export type MessageRole = 'user' | 'assistant';

export type TextContentPart = { type: 'text'; text: string };
export type InputTextContentPart = { type: 'input_text'; text: string };
export type InputAudioContentPart = { type: 'input_audio'; transcript?: string };
export type AudioContentPart = { type: 'audio'; transcript?: string; audio?: string };

// Типы для вывода
export type OutputTextContentPart = { type: 'output_text'; text: string };
export type OutputAudioTranscriptContentPart = { type: 'output_audio_transcript'; transcript: string };

export type ContentPart =
  | TextContentPart
  | InputTextContentPart
  | InputAudioContentPart
  | AudioContentPart
  | OutputTextContentPart
  | OutputAudioTranscriptContentPart;

export interface MessageItem {
  type: 'message';
  role: MessageRole;
  content: ContentPart[] | string;
}

// Расширенный тип для элементов сообщений от Yandex Cloud API
export interface YandexMessageItem extends MessageItem {
  id?: string;
  object?: string;
  status?: string;
  call_id?: string | null;
  name?: string | null;
  arguments?: string | null;
}