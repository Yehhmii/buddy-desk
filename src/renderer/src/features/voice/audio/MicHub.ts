export const MIC_SAMPLE_RATE = 16_000;
const RING_SECONDS = 5;
const BUFFER_SIZE = 4096;

export type FrameListener = (frame: Float32Array) => void;

/**
 * One shared microphone stream for everything: wake word, recorder and the level meter.
 * Reference counted, so the mic (and Windows' mic indicator) is off when nobody needs it.
 * Keeps the last few seconds so a wake-word hit can include what was said just before it.
 */
export class MicHub {
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private refs = 0;
  private opening: Promise<void> | null = null;
  private readonly listeners = new Set<FrameListener>();
  private readonly ring = new Float32Array(MIC_SAMPLE_RATE * RING_SECONDS);
  private ringPos = 0;
  private ringFilled = 0;
  private smoothed = 0;

  constructor(private readonly getDeviceId: () => string | undefined = () => undefined) {}

  async acquire(): Promise<void> {
    this.refs++;
    try {
      this.opening ??= this.open();
      await this.opening;
    } catch (error) {
      this.refs--;
      this.opening = null;
      throw error;
    }
  }

  release(): void {
    this.refs = Math.max(0, this.refs - 1);
    if (this.refs === 0) this.close();
  }

  subscribe(listener: FrameListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Smoothed input loudness, 0 to 1. */
  level(): number {
    return this.smoothed;
  }

  /** The most recent audio, oldest first. */
  recent(seconds: number): Float32Array {
    const want = Math.min(Math.floor(seconds * MIC_SAMPLE_RATE), this.ringFilled);
    const out = new Float32Array(want);
    const start = (this.ringPos - want + this.ring.length) % this.ring.length;
    for (let i = 0; i < want; i++) out[i] = this.ring[(start + i) % this.ring.length] ?? 0;
    return out;
  }

  private async open(): Promise<void> {
    const deviceId = this.getDeviceId();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      },
    });
    this.ctx = new AudioContext({ sampleRate: MIC_SAMPLE_RATE });
    this.source = this.ctx.createMediaStreamSource(this.stream);
    // ScriptProcessor is deprecated but works everywhere in Electron and needs no extra worklet file.
    this.processor = this.ctx.createScriptProcessor(BUFFER_SIZE, 1, 1);
    this.processor.onaudioprocess = (e) => this.onAudio(e.inputBuffer.getChannelData(0));
    const mute = this.ctx.createGain();
    mute.gain.value = 0;
    this.source.connect(this.processor);
    this.processor.connect(mute).connect(this.ctx.destination);
    this.stream.getAudioTracks().forEach((t) => (t.onended = () => this.close()));
  }

  private onAudio(input: Float32Array): void {
    const frame = new Float32Array(input);
    let sum = 0;
    for (let i = 0; i < frame.length; i++) {
      const v = frame[i] ?? 0;
      sum += v * v;
      this.ring[this.ringPos] = v;
      this.ringPos = (this.ringPos + 1) % this.ring.length;
    }
    this.ringFilled = Math.min(this.ring.length, this.ringFilled + frame.length);
    const rms = Math.sqrt(sum / frame.length);
    this.smoothed = this.smoothed * 0.6 + Math.min(1, rms * 8) * 0.4;
    for (const listener of this.listeners) listener(frame);
  }

  private close(): void {
    this.processor?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
    this.processor = null;
    this.source = null;
    this.stream = null;
    this.ctx = null;
    this.opening = null;
    this.ringFilled = 0;
    this.smoothed = 0;
  }
}
