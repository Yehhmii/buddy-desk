import { splitSentences } from '@/lib/speakable';

/** Plays assistant speech sentence by sentence, fetching the next sentence while one plays. */
export class SpeechPlayer {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private current: AudioBufferSourceNode | null = null;
  private token = 0;
  private fallbackActive = false;
  private readonly bins = new Uint8Array(64);

  level(): number {
    if (this.fallbackActive) return 0.3 + 0.2 * Math.sin(performance.now() / 120);
    if (!this.analyser || !this.current) return 0;
    this.analyser.getByteTimeDomainData(this.bins);
    let peak = 0;
    for (const b of this.bins) peak = Math.max(peak, Math.abs(b - 128));
    return Math.min(1, peak / 64);
  }

  stop(): void {
    this.token++;
    try {
      this.current?.stop();
    } catch {
      /* already stopped */
    }
    this.current = null;
    window.speechSynthesis.cancel();
    this.fallbackActive = false;
  }

  async speak(text: string): Promise<void> {
    const my = ++this.token;
    const sentences = splitSentences(text);
    if (sentences.length === 0) return;

    let next = window.api.speech.synthesize(sentences[0] ?? '');
    for (let i = 0; i < sentences.length; i++) {
      const result = await next.catch(() => ({ audio: null, mime: '' }));
      if (my !== this.token) return;
      const upcoming = sentences[i + 1];
      if (upcoming) next = window.api.speech.synthesize(upcoming);
      if (result.audio) await this.playBuffer(result.audio, my);
      else await this.playFallback(sentences[i] ?? '', my);
      if (my !== this.token) return;
    }
  }

  private async playBuffer(data: ArrayBuffer, token: number): Promise<void> {
    this.ctx ??= new AudioContext();
    if (!this.analyser) {
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    const buffer = await this.ctx.decodeAudioData(data.slice(0));
    if (token !== this.token) return;
    await new Promise<void>((resolve) => {
      const src = this.ctx!.createBufferSource();
      src.buffer = buffer;
      src.connect(this.analyser!);
      // Safety net: never wait forever for an "ended" event that does not arrive.
      const guard = setTimeout(resolve, buffer.duration * 1000 + 3000);
      src.onended = () => {
        clearTimeout(guard);
        if (this.current === src) this.current = null;
        resolve();
      };
      this.current = src;
      src.start();
    });
  }

  private playFallback(text: string, token: number): Promise<void> {
    return new Promise((resolve) => {
      if (token !== this.token) return resolve();
      const utterance = new SpeechSynthesisUtterance(text);
      const guard = setTimeout(
        () => {
          window.speechSynthesis.cancel();
          this.fallbackActive = false;
          resolve();
        },
        text.length * 90 + 4000,
      );
      utterance.onend = utterance.onerror = () => {
        clearTimeout(guard);
        this.fallbackActive = false;
        resolve();
      };
      this.fallbackActive = true;
      window.speechSynthesis.speak(utterance);
    });
  }
}
