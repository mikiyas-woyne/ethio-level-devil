/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private sfxVol = 0.5;
  private musicVol = 0.3;
  private currentBgmNode: AudioNode | null = null;
  private bgmIntervalId: number | null = null;
  private currentWorld: string = '';
  private isMuted = false;

  constructor() {
    // Lazy-initialized on user interaction
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  setVolume(sfx: number, music: number) {
    this.sfxVol = sfx / 100;
    this.musicVol = music / 100;
    // Volume adjustments could update active nodes if tracked,
    // but doing it for future plays is perfectly fine.
  }

  playSFX(type: 'jump' | 'land' | 'death' | 'click' | 'chime' | 'ding' | 'buzz' | 'gravity' | 'glitch' | 'fuse' | 'explosion') {
    this.init();
    if (!this.ctx || this.isMuted || this.sfxVol === 0) return;

    // Resume context if suspended (browser security)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;

    try {
      switch (type) {
        case 'jump': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);

          gain.gain.setValueAtTime(this.sfxVol * 0.25, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.12);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.12);
          break;
        }
        case 'land': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(120, now);
          osc.frequency.setValueAtTime(60, now + 0.05);

          gain.gain.setValueAtTime(this.sfxVol * 0.3, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.06);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.06);
          break;
        }
        case 'death': {
          // Exploding, falling noise
          const bufferSize = this.ctx.sampleRate * 0.2;
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const noise = this.ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1000, now);
          filter.frequency.exponentialRampToValueAtTime(80, now + 0.18);

          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(this.sfxVol * 0.6, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.2);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx.destination);
          noise.start(now);
          noise.stop(now + 0.2);

          // Add a descending low frequency tone
          const osc = this.ctx.createOscillator();
          const oscGain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.18);
          oscGain.gain.setValueAtTime(this.sfxVol * 0.5, now);
          oscGain.gain.linearRampToValueAtTime(0.01, now + 0.2);
          osc.connect(oscGain);
          oscGain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
        }
        case 'click': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200, now);

          gain.gain.setValueAtTime(this.sfxVol * 0.2, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.03);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.03);
          break;
        }
        case 'ding': {
          // High crystal coin sound
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(987.77, now); // B5
          osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6

          osc2.type = 'square';
          osc2.frequency.setValueAtTime(1975.54, now); // B6
          osc2.frequency.setValueAtTime(2637.02, now + 0.08);

          gain.gain.setValueAtTime(this.sfxVol * 0.15, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.25);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(this.ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.25);
          osc2.stop(now + 0.25);
          break;
        }
        case 'chime': {
          // Level complete major arpeggio
          const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
          notes.forEach((freq, i) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.08);

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(this.sfxVol * 0.3, now + i * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);

            osc.connect(gain);
            gain.connect(this.ctx!.destination);
            osc.start(now);
            osc.stop(now + i * 0.08 + 0.35);
          });
          break;
        }
        case 'buzz': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.linearRampToValueAtTime(100, now + 0.05);

          gain.gain.setValueAtTime(this.sfxVol * 0.12, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.06);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.06);
          break;
        }
        case 'gravity': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.exponentialRampToValueAtTime(100, now + 0.2);

          gain.gain.setValueAtTime(this.sfxVol * 0.3, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.2);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
        }
        case 'glitch': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.setValueAtTime(200, now + 0.05);
          osc.frequency.setValueAtTime(450, now + 0.1);

          gain.gain.setValueAtTime(this.sfxVol * 0.2, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.15);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.15);
          break;
        }
        case 'fuse': {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(3000, now);

          gain.gain.setValueAtTime(this.sfxVol * 0.1, now);
          gain.gain.linearRampToValueAtTime(0.001, now + 0.02);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.02);
          break;
        }
        case 'explosion': {
          const bufferSize = this.ctx.sampleRate * 0.4;
          const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const noise = this.ctx.createBufferSource();
          noise.buffer = buffer;

          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(200, now);

          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(this.sfxVol * 0.8, now);
          gain.gain.linearRampToValueAtTime(0.001, now + 0.4);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx.destination);
          noise.start(now);
          noise.stop(now + 0.4);
          break;
        }
      }
    } catch (e) {
      console.warn('Error playing sfx', e);
    }
  }

  startBGM(world: 'MENU' | 'PITS' | 'COINS' | 'SPRINGS' | 'GRAVITY' | 'WRAPAROUND' | 'INVERT' | 'FINAL') {
    this.init();
    if (!this.ctx || this.isMuted) return;

    if (this.currentWorld === world && this.bgmIntervalId !== null) {
      return; // Already playing this track
    }

    this.stopBGM();
    this.currentWorld = world;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Melodies for different worlds
    let notes: number[] = [];
    let noteDuration = 0.25; // in seconds

    if (world === 'MENU') {
      // Upbeat, slightly mysterious minor arpeggio
      notes = [220, 261.63, 329.63, 440, 392, 329.63, 261.63, 293.66]; // A3, C4, E4, A4, G4, E4, C4, D4
      noteDuration = 0.22;
    } else if (world === 'PITS' || world === 'COINS') {
      // Relaxing, calming lullaby style
      notes = [261.63, 329.63, 392, 523.25, 392, 329.63, 349.23, 440, 523.25, 440, 349.23, 293.66]; // C major -> F major arpeggios
      noteDuration = 0.35;
    } else if (world === 'SPRINGS' || world === 'GRAVITY') {
      // Cheerful, bouncy
      notes = [293.66, 369.99, 440.00, 587.33, 493.88, 440.00, 392.00, 329.63]; // D major / G major vibe
      noteDuration = 0.25;
    } else if (world === 'WRAPAROUND') {
      // Spacy, slower sine arpeggios
      notes = [220, 329.63, 440, 659.25, 587.33, 440, 329.63, 293.66];
      noteDuration = 0.4;
    } else if (world === 'INVERT') {
      // Glitchy, weird intervals
      notes = [233.08, 311.13, 466.16, 311.13, 220, 293.66, 440, 293.66]; // Bb minor / A major shift
      noteDuration = 0.25;
    } else {
      // FINAL - creepy piano/horror-like slow melody
      notes = [196.00, 233.08, 293.66, 392.00, 370.00, 293.66, 233.08, 196.00]; // G minor / G minor maj7 vibe
      noteDuration = 0.5;
    }

    let currentIndex = 0;

    const playNextNote = () => {
      if (!this.ctx || this.isMuted || this.musicVol === 0) return;
      const now = this.ctx.currentTime;
      const freq = notes[currentIndex];

      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        // Let menu and early levels be soft triangle, spooky levels sawtooth/square
        if (world === 'FINAL') {
          osc.type = 'sine'; // pure creepy vibe
        } else if (world === 'INVERT') {
          osc.type = 'sawtooth'; // retro crunch
        } else {
          osc.type = 'triangle'; // pleasant
        }

        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(this.musicVol * 0.15, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + noteDuration - 0.02);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + noteDuration);

        currentIndex = (currentIndex + 1) % notes.length;
      } catch (e) {
        console.warn('BGM error', e);
      }
    };

    // Schedule the notes on an interval
    const intervalMs = noteDuration * 1000;
    this.bgmIntervalId = window.setInterval(playNextNote, intervalMs);
    // Play immediately
    playNextNote();
  }

  stopBGM() {
    if (this.bgmIntervalId !== null) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
    this.currentWorld = '';
  }
}

export const audio = new AudioEngine();
