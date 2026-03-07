export class AudioManager {
  constructor() {
    this.context = null;
    this.unlocked = false;
    this.windAmount = 0;
    this.windSource = null;
    this.windHighpass = null;
    this.windLowpass = null;
    this.windGain = null;
    this.windLfo = null;
    this.windLfoGain = null;
    this.noiseBuffer = null;
  }

  unlock() {
    if (typeof window === 'undefined') {
      return false;
    }

    if (!this.context) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) {
        return false;
      }
      this.context = new AudioContextCtor();
    }

    if (this.context.state === 'suspended') {
      this.context.resume().catch(() => {});
    }

    this.unlocked = this.context.state === 'running';
    if (!this.unlocked) {
      return false;
    }

    this.ensureWindBed();
    this.setWind(this.windAmount);
    return true;
  }

  createNoiseBuffer() {
    if (!this.context || this.noiseBuffer) {
      return;
    }

    const sampleRate = this.context.sampleRate;
    const length = sampleRate * 2;
    const buffer = this.context.createBuffer(1, length, sampleRate);
    const channel = buffer.getChannelData(0);
    let last = 0;

    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.985 + white * 0.16;
      channel[i] = last;
    }

    this.noiseBuffer = buffer;
  }

  tone({ frequency, duration, type = 'sine', gain = 0.03, delay = 0 }) {
    if (!this.context || !this.unlocked || this.context.state !== 'running') {
      return;
    }

    const startAt = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const node = this.context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    node.gain.setValueAtTime(0.0001, startAt);
    node.gain.exponentialRampToValueAtTime(gain, startAt + 0.01);
    node.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    oscillator.connect(node);
    node.connect(this.context.destination);

    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.03);
  }

  sweep({ from, to, duration, type = 'sawtooth', gain = 0.03, delay = 0 }) {
    if (!this.context || !this.unlocked || this.context.state !== 'running') {
      return;
    }

    const startAt = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const node = this.context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, from), startAt);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), startAt + duration);
    node.gain.setValueAtTime(0.0001, startAt);
    node.gain.exponentialRampToValueAtTime(gain, startAt + 0.01);
    node.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    oscillator.connect(node);
    node.connect(this.context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.04);
  }

  noiseBurst({ duration = 0.14, gain = 0.02, highpass = 120, lowpass = 2200, delay = 0 }) {
    if (!this.context || !this.unlocked || this.context.state !== 'running') {
      return;
    }

    this.createNoiseBuffer();
    const startAt = this.context.currentTime + delay;
    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;

    const hp = this.context.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(highpass, startAt);
    hp.Q.value = 0.7;

    const lp = this.context.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(lowpass, startAt);
    lp.Q.value = 0.6;

    const node = this.context.createGain();
    node.gain.setValueAtTime(0.0001, startAt);
    node.gain.exponentialRampToValueAtTime(gain, startAt + 0.015);
    node.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    source.connect(hp);
    hp.connect(lp);
    lp.connect(node);
    node.connect(this.context.destination);

    source.start(startAt);
    source.stop(startAt + duration + 0.05);
  }

  ensureWindBed() {
    if (!this.context || this.windSource) {
      return;
    }

    this.createNoiseBuffer();

    this.windSource = this.context.createBufferSource();
    this.windSource.buffer = this.noiseBuffer;
    this.windSource.loop = true;

    this.windHighpass = this.context.createBiquadFilter();
    this.windHighpass.type = 'highpass';
    this.windHighpass.frequency.setValueAtTime(260, this.context.currentTime);
    this.windHighpass.Q.value = 0.6;

    this.windLowpass = this.context.createBiquadFilter();
    this.windLowpass.type = 'lowpass';
    this.windLowpass.frequency.setValueAtTime(1200, this.context.currentTime);
    this.windLowpass.Q.value = 0.5;

    this.windGain = this.context.createGain();
    this.windGain.gain.setValueAtTime(0.0001, this.context.currentTime);

    this.windLfo = this.context.createOscillator();
    this.windLfo.type = 'sine';
    this.windLfo.frequency.setValueAtTime(0.17, this.context.currentTime);

    this.windLfoGain = this.context.createGain();
    this.windLfoGain.gain.setValueAtTime(0.0007, this.context.currentTime);

    this.windSource.connect(this.windHighpass);
    this.windHighpass.connect(this.windLowpass);
    this.windLowpass.connect(this.windGain);
    this.windGain.connect(this.context.destination);

    this.windLfo.connect(this.windLfoGain);
    this.windLfoGain.connect(this.windGain.gain);

    this.windSource.start();
    this.windLfo.start();
  }

  setWind(amount) {
    this.windAmount = amount;
    if (!this.context || !this.unlocked || this.context.state !== 'running') {
      return;
    }

    this.ensureWindBed();
    const strength = Math.min(1, Math.abs(amount) / 50);
    const now = this.context.currentTime;

    this.windHighpass.frequency.cancelScheduledValues(now);
    this.windHighpass.frequency.linearRampToValueAtTime(220 + strength * 260, now + 0.24);

    this.windLowpass.frequency.cancelScheduledValues(now);
    this.windLowpass.frequency.linearRampToValueAtTime(900 + strength * 1900, now + 0.28);

    this.windGain.gain.cancelScheduledValues(now);
    this.windGain.gain.linearRampToValueAtTime(0.00008 + strength * 0.0046, now + 0.3);

    this.windLfo.frequency.cancelScheduledValues(now);
    this.windLfo.frequency.linearRampToValueAtTime(0.14 + strength * 0.2, now + 0.24);

    this.windLfoGain.gain.cancelScheduledValues(now);
    this.windLfoGain.gain.linearRampToValueAtTime(0.0003 + strength * 0.0012, now + 0.24);
  }

  playShot(weapon) {
    const isMortar = weapon.id === 'mortar';
    const isSplit = weapon.id.startsWith('split');
    const isBouncer = weapon.id === 'bouncer';

    this.sweep({
      from: isMortar ? 220 : isSplit ? 320 : isBouncer ? 250 : 280,
      to: isMortar ? 90 : isSplit ? 130 : isBouncer ? 120 : 110,
      duration: isMortar ? 0.14 : 0.1,
      type: isMortar ? 'sawtooth' : 'square',
      gain: isMortar ? 0.042 : 0.034
    });
    this.tone({
      frequency: isSplit ? 430 : 520,
      duration: 0.045,
      type: 'triangle',
      gain: 0.016,
      delay: 0.01
    });
    this.noiseBurst({
      duration: isMortar ? 0.11 : 0.08,
      gain: isMortar ? 0.022 : 0.016,
      highpass: isMortar ? 220 : 380,
      lowpass: isMortar ? 1800 : 2600,
      delay: 0.004
    });
  }

  playExplosion(weapon) {
    const radius = weapon.blastRadius;
    const heavy = weapon.id === 'mortar' ? 1.2 : weapon.id === 'split' ? 0.8 : 1;

    this.sweep({
      from: 180 + radius * 1.2,
      to: 42,
      duration: 0.26 * heavy,
      type: 'sawtooth',
      gain: 0.05 * heavy
    });
    this.sweep({
      from: 96,
      to: 30,
      duration: 0.34 * heavy,
      type: 'triangle',
      gain: 0.032 * heavy,
      delay: 0.018
    });
    this.noiseBurst({
      duration: 0.22 * heavy,
      gain: 0.03 * heavy,
      highpass: 80,
      lowpass: 1400 + radius * 10
    });
    this.noiseBurst({
      duration: 0.12 * heavy,
      gain: 0.018 * heavy,
      highpass: 260,
      lowpass: 2400,
      delay: 0.03
    });
  }

  playHit(damage) {
    this.tone({
      frequency: 420 + Math.min(180, damage * 2),
      duration: 0.07,
      type: 'square',
      gain: 0.012
    });
  }

  playBounce() {
    this.tone({ frequency: 340, duration: 0.05, type: 'triangle', gain: 0.018 });
    this.tone({ frequency: 520, duration: 0.04, type: 'triangle', gain: 0.012, delay: 0.04 });
  }

  playTurn() {
    this.tone({
      frequency: 420,
      duration: 0.05,
      type: 'triangle',
      gain: 0.015
    });
    this.tone({
      frequency: 580,
      duration: 0.08,
      type: 'triangle',
      gain: 0.015,
      delay: 0.055
    });
  }
}
