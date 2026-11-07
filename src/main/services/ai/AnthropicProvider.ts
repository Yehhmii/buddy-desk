import type { ProviderId } from '@shared/types';
import {
  ProviderError,
  type ChatMessage,
  type ChatRequest,
  type ChatResponse,
  type ContentPart,
  type LlmProvider,
  type ProviderErrorKind,
} from './types';

export interface AnthropicOptions {
  getKey: () => string | undefined;
  getModel: () => string;
  baseUrl?: string;
  timeoutMs?: number;
}

type Block = Record<string, unknown> & { type: string };

interface WireResponse {
  content?: Block[];
  error?: { type?: string; message?: string };
}

const API_VERSION = '2023-06-01';

/**
 * Claude through Anthropic's native Messages API. The OpenAI-style conversation used by the rest of the app
 * is translated here: tool calls become tool_use blocks, tool results become tool_result blocks.
 */
export class AnthropicProvider implements LlmProvider {
  readonly id: ProviderId = 'anthropic';
  readonly supportsVision = true;

  constructor(private readonly options: AnthropicOptions) {}

  isConfigured(): boolean {
    return Boolean(this.options.getKey());
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const key = this.options.getKey();
    if (!key) throw new ProviderError(this.id, 'auth', 'No Anthropic API key configured');
    const model = this.options.getModel();

    const { system, messages } = toAnthropicMessages(request.messages);
    const body: Record<string, unknown> = {
      model,
      max_tokens: request.maxTokens ?? 800,
      messages,
      ...(system ? { system } : {}),
      ...(request.tools?.length
        ? {
            tools: request.tools.map((t) => ({
              name: t.name,
              description: t.description,
              input_schema: t.parameters,
            })),
          }
        : {}),
    };

    const timeout = AbortSignal.timeout(this.options.timeoutMs ?? 30_000);
    const signal = request.signal ? AbortSignal.any([request.signal, timeout]) : timeout;

    let res: Response;
    try {
      res = await fetch(`${this.options.baseUrl ?? 'https://api.anthropic.com'}/v1/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': API_VERSION },
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
    const blocks = json.content ?? [];
    const content = blocks
      .filter((b) => b.type === 'text')
      .map((b) => String(b['text'] ?? ''))
      .join('')
      .trim();

    return {
      content: content || null,
      toolCalls: blocks
        .filter((b) => b.type === 'tool_use')
        .map((b) => ({
          id: String(b['id']),
          name: String(b['name']),
          arguments: JSON.stringify(b['input'] ?? {}),
        })),
      provider: this.id,
      model,
      // Kept verbatim: if the model produced thinking blocks they must be sent back unchanged with tool results.
      providerState: { anthropicContent: blocks },
    };
  }

  private toError(res: Response, bodyText: string): ProviderError {
    let message = `HTTP ${res.status}`;
    let type = '';
    try {
      const parsed = JSON.parse(bodyText) as WireResponse;
      if (parsed.error?.message) message = parsed.error.message;
      if (parsed.error?.type) type = parsed.error.type;
    } catch {
      /* not JSON */
    }
    const retry = Number(res.headers.get('retry-after'));
    const retryAfterMs = Number.isFinite(retry) && retry > 0 ? retry * 1000 : undefined;

    let kind: ProviderErrorKind = 'bad_request';
    if (res.status === 429 || type === 'rate_limit_error') kind = 'rate_limit';
    else if (res.status === 401 || res.status === 403) kind = 'auth';
    else if (res.status === 404 || type === 'not_found_error') kind = 'model_unavailable';
    else if (res.status >= 500 || res.status === 529) kind = 'server';
    return new ProviderError(this.id, kind, message, retryAfterMs);
  }
}

const textOf = (content: string | ContentPart[]): string =>
  typeof content === 'string'
    ? content
    : content
        .filter((p) => p.type === 'text')
        .map((p) => (p as { text: string }).text)
        .join('\n');

function toBlocks(content: string | ContentPart[]): Block[] {
  if (typeof content === 'string') return [{ type: 'text', text: content }];
  return content.map((part): Block => {
    if (part.type === 'text') return { type: 'text', text: part.text };
    const match = /^data:([^;]+);base64,(.*)$/s.exec(part.image_url.url);
    if (!match) return { type: 'text', text: '[image unavailable]' };
    return { type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } };
  });
}

/** Exported for tests. Converts the app's message list into Anthropic's system string plus alternating turns. */
export function toAnthropicMessages(messages: ChatMessage[]): {
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: Block[] }>;
} {
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => (m as { content: string }).content)
    .join('\n\n');
  const out: Array<{ role: 'user' | 'assistant'; content: Block[] }> = [];

  const push = (role: 'user' | 'assistant', blocks: Block[]): void => {
    const last = out[out.length - 1];
    // Tool results and follow-up user text must share one user turn, because turns have to alternate.
    if (last && last.role === role) last.content.push(...blocks);
    else out.push({ role, content: [...blocks] });
  };

  for (const m of messages) {
    if (m.role === 'system') continue;
    if (m.role === 'user') {
      push('user', toBlocks(m.content));
    } else if (m.role === 'tool') {
      push('user', [{ type: 'tool_result', tool_use_id: m.toolCallId, content: m.content }]);
    } else {
      const saved = (m.providerState as { anthropicContent?: Block[] } | undefined)?.anthropicContent;
      if (saved && saved.length > 0) {
        push('assistant', saved);
      } else {
        const blocks: Block[] = [];
        if (m.content) blocks.push({ type: 'text', text: textOf(m.content) });
        for (const call of m.toolCalls ?? []) {
          let input: unknown = {};
          try {
            input = JSON.parse(call.arguments || '{}');
          } catch {
            /* keep empty input */
          }
          blocks.push({ type: 'tool_use', id: call.id, name: call.name, input });
        }
        if (blocks.length > 0) push('assistant', blocks);
      }
    }
  }
  return { system, messages: out };
}
