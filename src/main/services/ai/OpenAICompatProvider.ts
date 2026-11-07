import type { ProviderId } from '@shared/types';
import {
  ProviderError,
  type ChatMessage,
  type ChatRequest,
  type ChatResponse,
  type LlmProvider,
  type ProviderErrorKind,
} from './types';

export interface OpenAICompatOptions {
  id: ProviderId;
  baseUrl: string;
  supportsVision: boolean;
  getKey: () => string | undefined;
  getModel: () => string;
  /** Gemini 3 needs the hidden thought signature of every tool call sent back to it. */
  thoughtSignatures?: boolean;
  /** OpenAI's newer models want max_completion_tokens and accept no custom temperature. */
  modernOpenAI?: boolean;
  /** Extra request fields for specific models, e.g. reasoning effort. */
  extraBody?: (model: string) => Record<string, unknown>;
  timeoutMs?: number;
}

interface WireToolCall {
  id?: string;
  extra_content?: unknown;
  function?: { name?: string; arguments?: string };
}

interface WireResponse {
  choices?: Array<{ message?: { content?: string | null; tool_calls?: WireToolCall[] } }>;
  error?: { message?: string; code?: string };
}

/** Groq and Gemini both expose an OpenAI-compatible chat endpoint, so one client serves both. */
export class OpenAICompatProvider implements LlmProvider {
  readonly id: ProviderId;
  readonly supportsVision: boolean;

  constructor(private readonly options: OpenAICompatOptions) {
    this.id = options.id;
    this.supportsVision = options.supportsVision;
  }

  isConfigured(): boolean {
    return Boolean(this.options.getKey());
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const key = this.options.getKey();
    if (!key) throw new ProviderError(this.id, 'auth', `No ${this.id} API key configured`);
    const model = this.options.getModel();

    const body: Record<string, unknown> = {
      model,
      messages: request.messages.map((m) => serializeMessage(m)),
      ...(this.options.modernOpenAI
        ? { max_completion_tokens: request.maxTokens ?? 800 }
        : { temperature: request.temperature ?? 0.3, max_tokens: request.maxTokens ?? 800 }),
      ...(this.options.extraBody?.(model) ?? {}),
    };
    if (request.tools?.length) {
      body['tools'] = request.tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
      body['tool_choice'] = 'auto';
    }
    if (this.options.thoughtSignatures)
      body['messages'] = request.messages.map((m) => serializeMessage(m, true));

    const timeout = AbortSignal.timeout(this.options.timeoutMs ?? 30_000);
    const signal = request.signal ? AbortSignal.any([request.signal, timeout]) : timeout;

    let res: Response;
    try {
      res = await fetch(`${this.options.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
        signal,
      });
    } catch (error) {
      if (request.signal?.aborted) throw error;
      throw new ProviderError(this.id, 'network', error instanceof Error ? error.message : 'Network error');
    }

    const text = await res.text();
    if (!res.ok) throw this.toError(res, text);

    let json: WireResponse;
    try {
      json = JSON.parse(text) as WireResponse;
    } catch {
      throw new ProviderError(this.id, 'server', 'Provider returned invalid JSON');
    }
    const message = json.choices?.[0]?.message;
    if (!message) throw new ProviderError(this.id, 'server', json.error?.message ?? 'Empty response');

    return {
      content: message.content ?? null,
      toolCalls: (message.tool_calls ?? []).map((c, i) => ({
        id: c.id || `call_${Date.now()}_${i}`,
        name: c.function?.name ?? '',
        arguments: c.function?.arguments || '{}',
        extra: c.extra_content,
      })),
      provider: this.id,
      model,
    };
  }

  private toError(res: Response, bodyText: string): ProviderError {
    let message = `HTTP ${res.status}`;
    let code = '';
    try {
      const parsed = JSON.parse(bodyText) as WireResponse | WireResponse[];
      const err = Array.isArray(parsed) ? parsed[0]?.error : parsed.error;
      if (err?.message) message = err.message;
      if (err?.code) code = err.code;
    } catch {
      /* body was not JSON, keep the status line */
    }
    const headerSeconds = Number(res.headers.get('retry-after'));
    const hinted = /try again in ([\d.]+)\s*(ms|s)\b/i.exec(message);
    const messageMs = hinted ? Number(hinted[1]) * (hinted[2]?.toLowerCase() === 'ms' ? 1 : 1000) : undefined;
    const retryAfterMs =
      Number.isFinite(headerSeconds) && headerSeconds > 0
        ? headerSeconds * 1000
        : messageMs !== undefined && Number.isFinite(messageMs)
          ? Math.ceil(messageMs)
          : undefined;

    let kind: ProviderErrorKind = 'bad_request';
    if (res.status === 429) kind = 'rate_limit';
    else if (res.status === 401 || res.status === 403) kind = 'auth';
    else if (
      res.status === 404 ||
      /model_(decommissioned|not_found)|decommissioned|does not exist/i.test(`${code} ${message}`)
    )
      kind = 'model_unavailable';
    else if (res.status >= 500) kind = 'server';
    else if (code === 'tool_use_failed' || /failed to call a function|tool_use_failed/i.test(message))
      kind = 'tool_format';
    return new ProviderError(this.id, kind, message, retryAfterMs);
  }
}

/** Google's documented placeholder for tool calls that were produced by a different model. */
const SKIP_SIGNATURE = 'skip_thought_signature_validator';

function signatureOf(extra: unknown): string | undefined {
  const google = (extra as { google?: { thought_signature?: unknown } } | undefined)?.google;
  return typeof google?.thought_signature === 'string' && google.thought_signature
    ? google.thought_signature
    : undefined;
}

function serializeMessage(m: ChatMessage, withSignatures = false): Record<string, unknown> {
  switch (m.role) {
    case 'assistant':
      return {
        role: 'assistant',
        content: m.content,
        ...(m.toolCalls?.length
          ? {
              tool_calls: m.toolCalls.map((c) => ({
                id: c.id,
                type: 'function',
                function: { name: c.name, arguments: c.arguments },
                ...(withSignatures
                  ? {
                      extra_content: {
                        google: { thought_signature: signatureOf(c.extra) ?? SKIP_SIGNATURE },
                      },
                    }
                  : {}),
              })),
            }
          : {}),
      };
    case 'tool':
      return { role: 'tool', tool_call_id: m.toolCallId, content: m.content };
    default:
      return { role: m.role, content: m.content };
  }
}
