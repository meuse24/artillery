export class AudioManager {
  constructor() {
    this.context = null;
    this.unlocked = false;
    this.windAmount = 0;
    this.windOsc = null;
    this.windGain = null;
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
    if (!this.context || this.windOsc) {
      return;
    }

    this.windOsc = this.context.createOscillator();
    this.windGain = this.context.createGain();
    this.windOsc.type = 'triangle';
    this.windOsc.frequency.setValueAtTime(110, this.context.currentTime);
    this.windGain.gain.setValueAtTime(0.0001, this.context.currentTime);
    this.windOsc.connect(this.windGain);
    this.windGain.connect(this.context.destination);
    this.windOsc.start();
  }

  setWind(amount) {
    this.windAmount = amount;
    if (!this.context || !this.unlocked || this.context.state !== 'running') {
      return;
    }

    this.ensureWindBed();
    const strength = Math.min(1, Math.abs(amount) / 50);
    const now = this.context.currentTime;
    this.windOsc.frequency.cancelScheduledValues(now);
    this.windOsc.frequency.linearRampToValueAtTime(90 + strength * 120, now + 0.18);
    this.windGain.gain.cancelScheduledValues(now);
    this.windGain.gain.linearRampToValueAtTime(0.0001 + strength * 0.012, now + 0.22);
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
