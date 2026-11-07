import { describe, expect, it, vi } from 'vitest';
import { looksLikeEcho } from '@shared/echo';
import { openDatabase } from '@main/db/database';
import { TaskRepository } from '@main/db/repositories/TaskRepository';
import { TaskService } from '@main/services/tasks/TaskService';
import { ToolExecutor } from '@main/services/ai/ToolExecutor';
import { OpenAICompatProvider } from '@main/services/ai/OpenAICompatProvider';

vi.mock('@main/core/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

function executor(now: { t: number }) {
  const db = openDatabase(':memory:');
  const tasks = new TaskService(new TaskRepository(db), { emit: () => undefined }, () => now.t);
  const stub = {} as never;
  return { tasks, exec: new ToolExecutor(tasks, stub, stub, stub, stub, () => undefined) };
}

describe('duplicate protection', () => {
  it('adding the same task twice in a row creates only one', async () => {
    const now = { t: 1_000_000 };
    const { tasks, exec } = executor(now);
    await exec.execute('add_task', JSON.stringify({ title: 'Buy milk' }));
    now.t += 5_000;
    const second = await exec.execute('add_task', JSON.stringify({ title: 'buy milk ' }));
    expect(tasks.list('pending')).toHaveLength(1);
    expect(JSON.parse(second.content).note).toMatch(/Already on the list/);
  });

  it('allows the same title again after the window has passed', async () => {
    const now = { t: 1_000_000 };
    const { tasks, exec } = executor(now);
    await exec.execute('add_task', JSON.stringify({ title: 'Buy milk' }));
    now.t += 10 * 60_000;
    await exec.execute('add_task', JSON.stringify({ title: 'Buy milk' }));
    expect(tasks.list('pending')).toHaveLength(2);
  });
});

describe('echo detection', () => {
  it('flags the assistant being heard again, not real requests', () => {
    expect(looksLikeEcho('added buy milk to your tasks', 'Added buy milk to your tasks.')).toBe(true);
    expect(looksLikeEcho('add buy milk to my tasks', 'Added buy milk to your tasks.')).toBe(false);
    expect(looksLikeEcho('buy milk', 'Added buy milk to your tasks.')).toBe(false);
  });
});

describe('Gemini thought signatures', () => {
  async function bodyFor(extra: unknown) {
    let sent: { messages: Array<Record<string, unknown>> } | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: { body: string }) => {
        sent = JSON.parse(init.body);
        return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 });
      }),
    );
    const provider = new OpenAICompatProvider({
      id: 'gemini',
      baseUrl: 'https://x',
      supportsVision: true,
      thoughtSignatures: true,
      getKey: () => 'k',
      getModel: () => 'm',
    });
    await provider.chat({
      messages: [
        { role: 'user', content: 'hi' },
        {
          role: 'assistant',
          content: null,
          toolCalls: [{ id: 'c1', name: 'set_alarm', arguments: '{}', extra }],
        },
        { role: 'tool', toolCallId: 'c1', content: '{}' },
      ],
    });
    return sent!.messages[1] as {
      tool_calls: Array<{ extra_content?: { google?: { thought_signature?: string } } }>;
    };
  }

  it('uses the placeholder when the call came from another model', async () => {
    const msg = await bodyFor(undefined);
    expect(msg.tool_calls[0]?.extra_content?.google?.thought_signature).toBe(
      'skip_thought_signature_validator',
    );
  });

  it('echoes back a real signature unchanged', async () => {
    const msg = await bodyFor({ google: { thought_signature: 'abc123' } });
    expect(msg.tool_calls[0]?.extra_content?.google?.thought_signature).toBe('abc123');
  });
});

describe('floating window privacy', () => {
  const heard = {
    state: 'speaking' as const,
    userText: 'add the lease task',
    replyText: 'Added Call the landlord.',
    notice: '',
    actions: [{ ok: true, summary: 'Added "Call the landlord"' }],
  };

  it('passes everything through when text is allowed', async () => {
    const { sanitizeSnapshot } = await import('@shared/snapshot');
    expect(sanitizeSnapshot(heard, true)).toEqual(heard);
  });

  it('keeps only the state when text is hidden', async () => {
    const { sanitizeSnapshot } = await import('@shared/snapshot');
    expect(sanitizeSnapshot(heard, false)).toEqual({
      state: 'speaking',
      userText: '',
      replyText: '',
      notice: '',
      actions: [],
    });
  });

  it('still signals a problem, without its details', async () => {
    const { sanitizeSnapshot } = await import('@shared/snapshot');
    const out = sanitizeSnapshot({ ...heard, notice: 'Groq rejected the key sk-abc' }, false);
    expect(out.notice).not.toContain('Groq');
    expect(out.notice.length).toBeGreaterThan(0);
  });
});
