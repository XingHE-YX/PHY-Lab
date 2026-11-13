// A teaching tone, not an acoustic radiation or granular-contact simulation.
// Pitch uses physical drive frequency even while the visual phase is slowed.
export class PlateAudio {
  private context?: AudioContext;
  private oscillator?: OscillatorNode;
  private gain?: GainNode;
  private timer?: ReturnType<typeof setTimeout>;
  private generation = 0;
  private disposed = false;
  private active = false;

  constructor(private readonly unavailable: () => void) {}

  async play(frequency: number, rmsVelocity: number) {
    if (this.disposed) return;
    this.active = true;
    clearTimeout(this.timer);
    const generation = ++this.generation;
    try {
      // Construct and resume only in a play/unmute gesture; loading stays silent.
      if (!this.context) {
        if (typeof AudioContext !== "function")
          throw new Error("Audio unavailable");
        const context = (this.context = new AudioContext());
        this.gain = context.createGain();
        this.gain.gain.value = 0;
        this.oscillator = context.createOscillator();
        this.oscillator.type = "sine";
        this.oscillator.frequency.value = frequency;
        this.oscillator.connect(this.gain);
        this.gain.connect(context.destination);
        this.oscillator.start();
      }
      const context = this.context;
      this.oscillator!.frequency.setValueAtTime(frequency, context.currentTime);
      await context.resume();
      if (this.disposed || generation !== this.generation) {
        // A late resume must not make a paused/disposed experiment audible.
        if (!this.active && context.state === "running")
          await context.suspend();
        return;
      }
      const velocity = Math.max(0, rmsVelocity),
        volume = 0.08 * Math.sqrt(velocity / (velocity + 0.004)),
        gain = this.gain!.gain;
      gain.cancelScheduledValues(context.currentTime);
      gain.setTargetAtTime(volume, context.currentTime, 0.015);
    } catch {
      if (!this.disposed && generation === this.generation) this.unavailable();
    }
  }

  stop() {
    this.active = false;
    ++this.generation;
    clearTimeout(this.timer);
    const context = this.context;
    if (!context || context.state === "closed") return;
    const gain = this.gain?.gain;
    gain?.cancelScheduledValues(context.currentTime);
    gain?.setTargetAtTime(0, context.currentTime, 0.008);
    this.timer = setTimeout(() => {
      if (context.state === "running") void context.suspend().catch(() => {});
    }, 80);
  }

  dispose() {
    if (this.disposed) return;
    this.stop();
    this.disposed = true;
    clearTimeout(this.timer);
    const context = this.context;
    if (!context) return;
    // Close after the short fade; free the oscillator and audio device on exit.
    this.timer = setTimeout(() => {
      this.oscillator?.stop();
      this.oscillator?.disconnect();
      this.gain?.disconnect();
      void context.close().catch(() => {});
    }, 80);
  }
}
