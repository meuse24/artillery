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
    this.tone({
      frequency: weapon.id === 'mortar' ? 120 : weapon.id.startsWith('split') ? 240 : 190,
      duration: weapon.id === 'mortar' ? 0.12 : 0.08,
      type: weapon.id === 'mortar' ? 'sawtooth' : 'square',
      gain: weapon.id === 'mortar' ? 0.038 : 0.03
    });
    this.tone({
      frequency: weapon.id === 'split' ? 320 : 90,
      duration: weapon.id === 'split' ? 0.09 : 0.12,
      type: 'triangle',
      gain: weapon.id === 'split' ? 0.022 : 0.018,
      delay: 0.015
    });
  }

  playExplosion(weapon) {
    const radius = weapon.blastRadius;
    this.tone({
      frequency: 52 + radius * 0.8,
      duration: weapon.id === 'mortar' ? 0.28 : 0.22,
      type: weapon.id === 'split' ? 'triangle' : 'sawtooth',
      gain: weapon.id === 'mortar' ? 0.05 : 0.04
    });
    this.tone({
      frequency: 40,
      duration: 0.2,
      type: 'triangle',
      gain: 0.025,
      delay: 0.02
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
