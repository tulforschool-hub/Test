// Procedural Web Audio API Sound Engine for PAC-HOP
// Recreates classic Pac-Man arcade sounds (Intro melody, Waka-Waka, Eat Ghost, Power Pellet, Death warble)
// plus bespoke tactile Jump, Vault Bonus, and Landing Shockwave audio feedback.

class PacSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private wakaPhase: number = 0;
  private lastWakaTime: number = 0;

  constructor() {
    // AudioContext will be lazily initialized on first user gesture
  }

  private ensureContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (!this.isMuted) {
      this.playUIClick();
    }
    return this.isMuted;
  }

  public playUIClick() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.055);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  // Iconic alternating Waka-Waka sound when eating dots
  public playWaka() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Prevent overlapping waka spam if triggered within 45ms
    if (now - this.lastWakaTime < 0.045) return;
    this.lastWakaTime = now;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    const duration = 0.08;

    if (this.wakaPhase === 0) {
      // Upward "Wa-"
      osc.frequency.setValueAtTime(250, now);
      osc.frequency.linearRampToValueAtTime(465, now + duration);
      this.wakaPhase = 1;
    } else {
      // Downward "-ka"
      osc.frequency.setValueAtTime(465, now);
      osc.frequency.linearRampToValueAtTime(240, now + duration);
      this.wakaPhase = 0;
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  // Tactile arcade Jump sound when pressing the external Jump button
  public playJump(isSuperSpring: boolean = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const duration = isSuperSpring ? 0.28 : 0.21;

    // Main pitch-bending hop oscillator
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';

    const startFreq = isSuperSpring ? 240 : 210;
    const midFreq = isSuperSpring ? 540 : 440;
    const endFreq = isSuperSpring ? 880 : 680;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(midFreq, now + duration * 0.45);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);

    // Subtle harmonic overtone for bright arcade clarity
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(startFreq * 1.5, now);
    subOsc.frequency.exponentialRampToValueAtTime(endFreq * 1.5, now + duration * 0.85);

    subGain.gain.setValueAtTime(0.08, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.85);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + duration);
  }

  // Cheerful double chime when vaulting over a ghost or low hurdle wall
  public playVaultBonus() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [659.25, 987.77]; // E5 -> B5
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.065;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.16, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.17);
    });
  }

  // Soft landing thump + shockwave shimmer
  public playLand(stunnedGhostsCount: number = 0) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.11);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.13);

    if (stunnedGhostsCount > 0) {
      // Stun ripple chord
      const chord = [523.25, 659.25, 783.99];
      chord.forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(freq, now + i * 0.03);
        g.gain.setValueAtTime(0.12, now + i * 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(now + i * 0.03);
        o.stop(now + 0.26);
      });
    }
  }

  // Power Pellet pickup warble
  public playPowerPellet() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const freqs = [330, 440, 554.37, 659.25, 880];
    freqs.forEach((f, idx) => {
      const t = now + idx * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 1.12, t + 0.09);

      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    });
  }

  // Classic Pac-Man Eat Ghost ascending sweep
  public playEatGhost() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.12);
    osc.frequency.setValueAtTime(440, now + 0.13);
    osc.frequency.exponentialRampToValueAtTime(1040, now + 0.34);

    // Soft low-pass filter to keep sawtooth warm and pleasant
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, now);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.37);
  }

  // Fruit / Star Bonus pickup chime
  public playBonusFruit() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [587.33, 783.99, 987.77, 1174.66]; // D5, G5, B5, D6
    notes.forEach((f, i) => {
      const t = now + i * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.19);
    });
  }

  // Classic Pac-Man Lose Life descending warble
  public playDeath() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const steps = [
      { f1: 784, f2: 698 },
      { f1: 698, f2: 622 },
      { f1: 622, f2: 554 },
      { f1: 554, f2: 493 },
      { f1: 493, f2: 440 },
      { f1: 440, f2: 370 },
      { f1: 370, f2: 293 },
    ];

    steps.forEach((step, idx) => {
      const t = now + idx * 0.095;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(step.f1, t);
      osc.frequency.linearRampToValueAtTime(step.f2, t + 0.045);
      osc.frequency.linearRampToValueAtTime(step.f1 * 0.92, t + 0.09);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.092);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.095);
    });

    // Two final classic "bloop-bloop" tail notes
    [0.7, 0.82].forEach((offset, i) => {
      const t = now + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(i === 0 ? 220 : 280, t);
      osc.frequency.exponentialRampToValueAtTime(520, t + 0.09);

      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.11);
    });
  }

  // Classic Pac-Man inspired upbeat start jingle
  public playStartJingle() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Recognizable upbeat arcade motif (B4, B5, F#5, D#5, B5, F#5, D#5)
    const melody = [
      { f: 493.88, t: 0.0, d: 0.11 },   // B4
      { f: 987.77, t: 0.12, d: 0.11 },  // B5
      { f: 739.99, t: 0.24, d: 0.11 },  // F#5
      { f: 622.25, t: 0.36, d: 0.11 },  // D#5
      { f: 987.77, t: 0.48, d: 0.07 },  // B5
      { f: 739.99, t: 0.56, d: 0.16 },  // F#5
      { f: 622.25, t: 0.74, d: 0.24 },  // D#5
    ];

    melody.forEach((note) => {
      const start = now + note.t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, start);

      gain.gain.setValueAtTime(0.16, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + note.d);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + note.d + 0.01);
    });
  }

  // Stage Clear / Victory Fanfare
  public playStageClear() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [
      { f: 523.25, t: 0.0, d: 0.11 },  // C5
      { f: 659.25, t: 0.12, d: 0.11 }, // E5
      { f: 783.99, t: 0.24, d: 0.11 }, // G5
      { f: 1046.5, t: 0.36, d: 0.28 }, // C6
      { f: 783.99, t: 0.66, d: 0.11 }, // G5
      { f: 1046.5, t: 0.78, d: 0.38 }, // C6
    ];

    notes.forEach((n) => {
      const start = now + n.t;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, start);

      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + n.d);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + n.d + 0.01);
    });
  }
}

export const soundEngine = new PacSoundEngine();
