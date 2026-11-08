import { describe, expect, it, vi } from 'vitest';
import { AnthropicProvider, toAnthropicMessages } from '@main/services/ai/AnthropicProvider';
import type { ChatMessage } from '@main/services/ai/types';

const conversation: ChatMessage[] = [
  { role: 'system', content: 'You are Buddy.' },
  { role: 'user', content: 'add milk' },
  {
    role: 'assistant',
    content: null,
    toolCalls: [
      { id: 't1', name: 'add_task', arguments: '{"title":"milk"}' },
      { id: 't2', name: 'list_tasks', arguments: '{"filter":"pending"}' },
    ],
  },
  { role: 'tool', toolCallId: 't1', content: '{"ok":true}' },
  { role: 'tool', toolCallId: 't2', content: '{"ok":true,"count":1}' },
];

describe('Claude message conversion', () => {
  it('moves the system prompt out and keeps turns alternating', () => {
    const { system, messages } = toAnthropicMessages(conversation);
    expect(system).toBe('You are Buddy.');
    expect(messages.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
  });

  it('turns tool calls into tool_use blocks and groups results into one user turn', () => {
    const { messages } = toAnthropicMessages(conversation);
    const calls = messages[1]!.content.filter((b) => b.type === 'tool_use');
    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({ id: 't1', name: 'add_task', input: { title: 'milk' } });
    const results = messages[2]!.content;
    expect(results.map((b) => b.type)).toEqual(['tool_result', 'tool_result']);
    expect(results[1]).toMatchObject({ tool_use_id: 't2' });
  });

  it('merges a screenshot follow-up into the same user turn as the tool results', () => {
    const { messages } = toAnthropicMessages([
      ...conversation,
      {
        role: 'user',
        content: [
          { type: 'text', text: 'screenshot' },
          { type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } },
        ],
      },
    ]);
    expect(messages).toHaveLength(3);
    expect(messages[2]!.content.map((b) => b.type)).toEqual(['tool_result', 'tool_result', 'text', 'image']);
  });

  it('replays the original content blocks (including thinking) when they were saved', () => {
    const blocks = [
      { type: 'thinking', thinking: 'hmm', signature: 'sig' },
      { type: 'tool_use', id: 't1', name: 'add_task', input: {} },
    ];
    const { messages } = toAnthropicMessages([
      { role: 'user', content: 'hi' },
      {
        role: 'assistant',
        content: null,
        toolCalls: [{ id: 't1', name: 'add_task', arguments: '{}' }],
        providerState: { anthropicContent: blocks },
      },
      { role: 'tool', toolCallId: 't1', content: '{}' },
    ]);
    expect(messages[1]!.content).toEqual(blocks);
  });
});

describe('Claude provider', () => {
  it('sends the right headers and parses text and tool calls', async () => {
    let seen: { url: string; headers: Record<string, string>; body: Record<string, unknown> } | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: { headers: Record<string, string>; body: string }) => {
        seen = { url, headers: init.headers, body: JSON.parse(init.body) };
        return new Response(
          JSON.stringify({
            content: [
              { type: 'text', text: 'Adding it.' },
              { type: 'tool_use', id: 'toolu_1', name: 'add_task', input: { title: 'milk' } },
            ],
          }),
          { status: 200 },
        );
      }),
    );
    const provider = new AnthropicProvider({
      getKey: () => 'sk-ant-test',
      getModel: () => 'claude-haiku-5-5',
    });
    const res = await provider.chat({
      messages: conversation.slice(0, 2),
      tools: [{ name: 'add_task', description: 'd', parameters: { type: 'object' } }],
    });

    expect(seen?.url).toBe('https://api.anthropic.com/v1/messages');
    expect(seen?.headers['x-api-key']).toBe('sk-ant-test');
    expect(seen?.headers['anthropic-version']).toBe('2023-06-01');
    expect(seen?.body['model']).toBe('claude-haiku-5-5');
    expect(seen?.body['system']).toBe('You are Buddy.');
    expect(res.content).toBe('Adding it.');
    expect(res.toolCalls[0]).toMatchObject({
      id: 'toolu_1',
      name: 'add_task',
      arguments: '{"title":"milk"}',
    });
  });

  it('maps errors to failover kinds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { type: 'authentication_error', message: 'bad key' } }), {
            status: 401,
          }),
      ),
    );
    const provider = new AnthropicProvider({ getKey: () => 'k', getModel: () => 'm' });
    await expect(provider.chat({ messages: [{ role: 'user', content: 'hi' }] })).rejects.toMatchObject({
      kind: 'auth',
    });
  });
});
