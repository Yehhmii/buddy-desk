export interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_TURNS = 12;
const IDLE_RESET_MS = 15 * 60_000;

/** Short-term memory so follow-ups like "make that one high priority" work. Cleared when idle. */
export class ConversationMemory {
  private turns: Turn[] = [];
  private lastAt = 0;

  constructor(private readonly clock: () => number = Date.now) {}

  window(): Turn[] {
    if (this.clock() - this.lastAt > IDLE_RESET_MS) this.turns = [];
    return [...this.turns];
  }

  remember(user: string, assistant: string): void {
    this.turns.push({ role: 'user', content: user }, { role: 'assistant', content: assistant });
    if (this.turns.length > MAX_TURNS) this.turns = this.turns.slice(-MAX_TURNS);
    this.lastAt = this.clock();
  }

  reset(): void {
    this.turns = [];
  }
}
