import type { ProviderId } from '@shared/types';

export type ContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };

export interface ToolCall {
  id: string;
  name: string;
  /** Raw JSON string exactly as the model produced it. */
  arguments: string;
  /** Provider-specific data that must be echoed back unchanged (Gemini thought signatures). */
  extra?: unknown;
}

export type ChatMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string | ContentPart[] }
  | { role: 'assistant'; content: string | null; toolCalls?: ToolCall[]; providerState?: unknown }
  | { role: 'tool'; toolCallId: string; content: string };

export interface ToolSpec {
  name: string;
  description: string;
  /** JSON Schema for the arguments object. */
  parameters: Record<string, unknown>;
}

export interface ChatRequest {
  messages: ChatMessage[];
  tools?: ToolSpec[];
  needsVision?: boolean;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface ChatResponse {
  content: string | null;
  toolCalls: ToolCall[];
  provider: ProviderId;
  model: string;
  /** Opaque data the provider needs back with the next request (e.g. Claude's raw content blocks). */
  providerState?: unknown;
}

export type ProviderErrorKind =
  'rate_limit' | 'auth' | 'model_unavailable' | 'bad_request' | 'tool_format' | 'server' | 'network';

export class ProviderError extends Error {
  constructor(
    readonly provider: ProviderId,
    readonly kind: ProviderErrorKind,
    message: string,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export interface LlmProvider {
  readonly id: ProviderId;
  readonly supportsVision: boolean;
  isConfigured(): boolean;
  chat(request: ChatRequest): Promise<ChatResponse>;
}
