/**
 * SyntaXViva Professional Academic Notification Sound Service
 * Synthesizes a high-end, pleasant chime notification (Apple / Slack / Teams style)
 * using the browser Web Audio API.
 * 
 * Benefits:
 * - 0ms latency (no file loading or buffering)
 * - Zero external .mp3 dependencies or 404 errors
 * - Crystal clear acoustic double-tone chime
 */

class NotificationSoundService {
  private ctx: AudioContext | null = null;
  private isUnlocked = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Setup unlock on first user gesture
      const unlockAudio = () => {
        try {
          const ctx = this.getAudioContext();
          if (ctx && ctx.state === 'suspended') {
            ctx.resume().then(() => {
              this.isUnlocked = true;
            }).catch(() => {});
          } else if (ctx) {
            this.isUnlocked = true;
          }
        } catch {
          // ignore
        }
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      };

      window.addEventListener('click', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.ctx && AudioCtx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  /**
   * Play the official SyntaXViva assignment notification chime:
   * Tone 1: 784.0 Hz (G5) -> Tone 2: 1046.5 Hz (C6) with warm overtones.
   */
  public playNotificationChime(volume = 0.4): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Master Gain for smooth volume control
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volume, now);
      masterGain.connect(ctx.destination);

      // --- FIRST TONE: G5 (784 Hz) ---
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(783.99, now);

      // Gentle attack & smooth decay
      gain1.gain.setValueAtTime(0.0001, now);
      gain1.gain.linearRampToValueAtTime(0.9, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc1.connect(gain1);
      gain1.connect(masterGain);

      osc1.start(now);
      osc1.stop(now + 0.46);

      // --- SECOND TONE (Harmonic Bell Chord): C6 (1046.5 Hz) + E6 overtone (1318.5 Hz) ---
      const delay = 0.09; // 90ms delay between tones for musical chime
      const now2 = now + delay;

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1046.5, now2);

      gain2.gain.setValueAtTime(0.0001, now2);
      gain2.gain.linearRampToValueAtTime(1.0, now2 + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now2 + 0.65);

      osc2.connect(gain2);
      gain2.connect(masterGain);

      osc2.start(now2);
      osc2.stop(now2 + 0.66);

      // Subtle Sparkle Overtone: E6 (1318.5 Hz)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(1318.51, now2 + 0.02);

      gain3.gain.setValueAtTime(0.0001, now2 + 0.02);
      gain3.gain.linearRampToValueAtTime(0.35, now2 + 0.04);
      gain3.gain.exponentialRampToValueAtTime(0.0001, now2 + 0.55);

      osc3.connect(gain3);
      gain3.connect(masterGain);

      osc3.start(now2 + 0.02);
      osc3.stop(now2 + 0.56);
    } catch (err) {
      console.warn('[SyntaXViva] Could not play notification chime:', err);
    }
  }
}

export const notificationSound = new NotificationSoundService();
export const playNotificationSound = (volume?: number) => notificationSound.playNotificationChime(volume);
