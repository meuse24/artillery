export class AudioManager {
  constructor() {
    this.context = null;
    this.unlocked = false;
    this.muted = false;
    this.windAmount = 0;
    this.windSource = null;
    this.windHighpass = null;
    this.windLowpass = null;
    this.windGain = null;
    this.windLfo = null;
    this.windLfoGain = null;
    this.noiseBuffer = null;
    this.driveSource = null;
    this.driveBandpass = null;
    this.driveLowpass = null;
    this.driveGain = null;
    this.drivePulse = null;
    this.drivePulseGain = null;
    this.driveTone = null;
    this.driveToneGain = null;
    // Heavy tank additions
    this.driveClatterSource = null;
    this.driveClatterBandpass = null;
    this.driveClatterGain = null;
    this.driveClatterPulse = null;
    this.driveClatterPulseGain = null;
    this.driveRumbleTone = null;
    this.driveRumbleGain = null;
    this.driveRattle = null;
    this.driveRattleGain = null;
    this.driveDistortion = null;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (!this.context) {
      return;
    }

    const now = this.context.currentTime;
    if (this.muted) {
      this.windGain?.gain.cancelScheduledValues(now);
      this.windGain?.gain.linearRampToValueAtTime(0.0001, now + 0.08);
      this.driveGain?.gain.cancelScheduledValues(now);
      this.driveGain?.gain.linearRampToValueAtTime(0.0001, now + 0.08);
      this.driveToneGain?.gain.cancelScheduledValues(now);
      this.driveToneGain?.gain.linearRampToValueAtTime(0.0001, now + 0.08);
      this.drivePulseGain?.gain.cancelScheduledValues(now);
      this.drivePulseGain?.gain.linearRampToValueAtTime(0.0001, now + 0.08);
      this.driveClatterGain?.gain.cancelScheduledValues(now);
      this.driveClatterGain?.gain.linearRampToValueAtTime(0.0001, now + 0.08);
      this.driveRumbleGain?.gain.cancelScheduledValues(now);
      this.driveRumbleGain?.gain.linearRampToValueAtTime(0.0001, now + 0.08);
      this.driveRattleGain?.gain.cancelScheduledValues(now);
      this.driveRattleGain?.gain.linearRampToValueAtTime(0.0001, now + 0.08);
      return;
    }

    if (this.unlocked && this.context.state === 'running') {
      this.ensureWindBed();
      this.setWind(this.windAmount);
    }
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

    if (!this.muted) {
      this.ensureWindBed();
      this.setWind(this.windAmount);
    }
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

  tone({ frequency, duration, type = 'sine', gain = 0.05, delay = 0 }) {
    if (!this.context || !this.unlocked || this.context.state !== 'running' || this.muted) {
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

  sweep({ from, to, duration, type = 'sawtooth', gain = 0.05, delay = 0 }) {
    if (!this.context || !this.unlocked || this.context.state !== 'running' || this.muted) {
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

  noiseBurst({ duration = 0.14, gain = 0.035, highpass = 120, lowpass = 2200, delay = 0 }) {
    if (!this.context || !this.unlocked || this.context.state !== 'running' || this.muted) {
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

  createDistortionCurve(amount) {
    const samples = 256;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  ensureDriveLoop() {
    if (!this.context || this.driveSource) {
      return;
    }

    this.createNoiseBuffer();
    const t = this.context.currentTime;

    // ── Main engine rumble noise ────────────────────────────────────
    this.driveSource = this.context.createBufferSource();
    this.driveSource.buffer = this.noiseBuffer;
    this.driveSource.loop = true;

    this.driveBandpass = this.context.createBiquadFilter();
    this.driveBandpass.type = 'bandpass';
    this.driveBandpass.frequency.setValueAtTime(140, t);
    this.driveBandpass.Q.value = 1.8;

    this.driveLowpass = this.context.createBiquadFilter();
    this.driveLowpass.type = 'lowpass';
    this.driveLowpass.frequency.setValueAtTime(800, t);
    this.driveLowpass.Q.value = 0.7;

    // Waveshaper distortion for gritty diesel engine character
    this.driveDistortion = this.context.createWaveShaper();
    this.driveDistortion.curve = this.createDistortionCurve(12);
    this.driveDistortion.oversample = '2x';

    this.driveGain = this.context.createGain();
    this.driveGain.gain.setValueAtTime(0.0001, t);

    // Engine firing pulse – slow thudding like a diesel
    this.drivePulse = this.context.createOscillator();
    this.drivePulse.type = 'square';
    this.drivePulse.frequency.setValueAtTime(6, t);

    this.drivePulseGain = this.context.createGain();
    this.drivePulseGain.gain.setValueAtTime(0.0006, t);

    // Low engine tone – diesel rumble
    this.driveTone = this.context.createOscillator();
    this.driveTone.type = 'sawtooth';
    this.driveTone.frequency.setValueAtTime(28, t);

    this.driveToneGain = this.context.createGain();
    this.driveToneGain.gain.setValueAtTime(0.0001, t);

    this.driveSource.connect(this.driveBandpass);
    this.driveBandpass.connect(this.driveLowpass);
    this.driveLowpass.connect(this.driveDistortion);
    this.driveDistortion.connect(this.driveGain);
    this.driveGain.connect(this.context.destination);

    this.driveTone.connect(this.driveToneGain);
    this.driveToneGain.connect(this.driveDistortion);

    this.drivePulse.connect(this.drivePulseGain);
    this.drivePulseGain.connect(this.driveGain.gain);

    // ── Track clatter layer – metallic rattling ─────────────────────
    this.driveClatterSource = this.context.createBufferSource();
    this.driveClatterSource.buffer = this.noiseBuffer;
    this.driveClatterSource.loop = true;

    this.driveClatterBandpass = this.context.createBiquadFilter();
    this.driveClatterBandpass.type = 'bandpass';
    this.driveClatterBandpass.frequency.setValueAtTime(1800, t);
    this.driveClatterBandpass.Q.value = 3.5;

    this.driveClatterGain = this.context.createGain();
    this.driveClatterGain.gain.setValueAtTime(0.0001, t);

    // Fast pulse to chop the noise into rapid clicks = track links
    this.driveClatterPulse = this.context.createOscillator();
    this.driveClatterPulse.type = 'square';
    this.driveClatterPulse.frequency.setValueAtTime(14, t);

    this.driveClatterPulseGain = this.context.createGain();
    this.driveClatterPulseGain.gain.setValueAtTime(0.001, t);

    this.driveClatterSource.connect(this.driveClatterBandpass);
    this.driveClatterBandpass.connect(this.driveClatterGain);
    this.driveClatterGain.connect(this.context.destination);

    this.driveClatterPulse.connect(this.driveClatterPulseGain);
    this.driveClatterPulseGain.connect(this.driveClatterGain.gain);

    // ── Deep sub-bass rumble tone ───────────────────────────────────
    this.driveRumbleTone = this.context.createOscillator();
    this.driveRumbleTone.type = 'sine';
    this.driveRumbleTone.frequency.setValueAtTime(22, t);

    this.driveRumbleGain = this.context.createGain();
    this.driveRumbleGain.gain.setValueAtTime(0.0001, t);

    this.driveRumbleTone.connect(this.driveRumbleGain);
    this.driveRumbleGain.connect(this.context.destination);

    // ── Mechanical rattle – high-mid metallic resonance ─────────────
    this.driveRattle = this.context.createOscillator();
    this.driveRattle.type = 'square';
    this.driveRattle.frequency.setValueAtTime(68, t);

    this.driveRattleGain = this.context.createGain();
    this.driveRattleGain.gain.setValueAtTime(0.0001, t);

    this.driveRattle.connect(this.driveRattleGain);
    this.driveRattleGain.connect(this.driveDistortion);

    // Start all sources
    this.driveSource.start();
    this.driveTone.start();
    this.drivePulse.start();
    this.driveClatterSource.start();
    this.driveClatterPulse.start();
    this.driveRumbleTone.start();
    this.driveRattle.start();
  }

  setDrive(active, intensity = 1) {
    if (!this.context || !this.unlocked || this.context.state !== 'running') {
      return;
    }

    this.ensureDriveLoop();
    if (this.muted) {
      active = false;
    }
    const amount = Math.max(0, Math.min(1, intensity));
    const now = this.context.currentTime;
    const ramp = active ? 0.06 : 0.18;

    // Main engine noise – much louder and grittier
    const targetNoise = active ? 0.006 + amount * 0.012 : 0.0001;
    const bandFreq = active ? 110 + amount * 180 : 100;
    const lowFreq = active ? 500 + amount * 1200 : 400;
    this.driveBandpass.frequency.cancelScheduledValues(now);
    this.driveBandpass.frequency.linearRampToValueAtTime(bandFreq, now + ramp);
    this.driveLowpass.frequency.cancelScheduledValues(now);
    this.driveLowpass.frequency.linearRampToValueAtTime(lowFreq, now + ramp);
    this.driveGain.gain.cancelScheduledValues(now);
    this.driveGain.gain.linearRampToValueAtTime(targetNoise, now + ramp);

    // Diesel engine tone – deep sawtooth growl
    const targetTone = active ? 0.0018 + amount * 0.004 : 0.0001;
    const toneFreq = active ? 24 + amount * 22 : 20;
    this.driveToneGain.gain.cancelScheduledValues(now);
    this.driveToneGain.gain.linearRampToValueAtTime(targetTone, now + ramp);
    this.driveTone.frequency.cancelScheduledValues(now);
    this.driveTone.frequency.linearRampToValueAtTime(toneFreq, now + ramp);

    // Engine firing pulse – slow thudding
    const targetPulse = active ? 0.0018 + amount * 0.003 : 0.0003;
    const pulseFreq = active ? 5 + amount * 7 : 3;
    this.drivePulseGain.gain.cancelScheduledValues(now);
    this.drivePulseGain.gain.linearRampToValueAtTime(targetPulse, now + ramp);
    this.drivePulse.frequency.cancelScheduledValues(now);
    this.drivePulse.frequency.linearRampToValueAtTime(pulseFreq, now + ramp);

    // Track clatter – rapid metallic clicking
    const targetClatter = active ? 0.0025 + amount * 0.005 : 0.0001;
    const clatterBand = active ? 1400 + amount * 1600 : 1200;
    const clatterPulseFreq = active ? 12 + amount * 22 : 8;
    this.driveClatterGain.gain.cancelScheduledValues(now);
    this.driveClatterGain.gain.linearRampToValueAtTime(targetClatter, now + ramp);
    this.driveClatterBandpass.frequency.cancelScheduledValues(now);
    this.driveClatterBandpass.frequency.linearRampToValueAtTime(clatterBand, now + ramp);
    this.driveClatterPulse.frequency.cancelScheduledValues(now);
    this.driveClatterPulse.frequency.linearRampToValueAtTime(clatterPulseFreq, now + ramp);
    this.driveClatterPulseGain.gain.cancelScheduledValues(now);
    this.driveClatterPulseGain.gain.linearRampToValueAtTime(
      active ? 0.002 + amount * 0.004 : 0.0005, now + ramp
    );

    // Sub-bass ground rumble
    const targetRumble = active ? 0.008 + amount * 0.014 : 0.0001;
    const rumbleFreq = active ? 18 + amount * 12 : 16;
    this.driveRumbleGain.gain.cancelScheduledValues(now);
    this.driveRumbleGain.gain.linearRampToValueAtTime(targetRumble, now + ramp);
    this.driveRumbleTone.frequency.cancelScheduledValues(now);
    this.driveRumbleTone.frequency.linearRampToValueAtTime(rumbleFreq, now + ramp);

    // Mechanical rattle
    const targetRattle = active ? 0.0006 + amount * 0.0015 : 0.0001;
    const rattleFreq = active ? 55 + amount * 40 : 50;
    this.driveRattleGain.gain.cancelScheduledValues(now);
    this.driveRattleGain.gain.linearRampToValueAtTime(targetRattle, now + ramp);
    this.driveRattle.frequency.cancelScheduledValues(now);
    this.driveRattle.frequency.linearRampToValueAtTime(rattleFreq, now + ramp);
  }

  setWind(amount) {
    this.windAmount = amount;
    if (!this.context || !this.unlocked || this.context.state !== 'running' || this.muted) {
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

  // ── Advanced synthesis helpers ──────────────────────────────────────────────

  /** Multi-band filtered noise with per-band Q and optional ring modulation */
  shapedNoise({ duration, gain, bands, ringFreq = 0, delay = 0 }) {
    if (!this.context || !this.unlocked || this.context.state !== 'running' || this.muted) return;
    this.createNoiseBuffer();
    const t = this.context.currentTime + delay;
    const master = this.context.createGain();
    master.gain.setValueAtTime(0.0001, t);
    master.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    master.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    let output = master;
    if (ringFreq > 0) {
      const ring = this.context.createOscillator();
      const ringGain = this.context.createGain();
      ring.type = 'sine';
      ring.frequency.setValueAtTime(ringFreq, t);
      ringGain.gain.setValueAtTime(0, t);
      ring.connect(ringGain.gain);
      master.connect(ringGain);
      ringGain.connect(this.context.destination);
      ring.start(t);
      ring.stop(t + duration + 0.05);
      output = master;
      // Also connect dry path at reduced level
      const dry = this.context.createGain();
      dry.gain.setValueAtTime(0.3, t);
      master.connect(dry);
      dry.connect(this.context.destination);
    } else {
      master.connect(this.context.destination);
    }

    bands.forEach(({ type = 'bandpass', freq, Q = 1, detune = 0, bandGain = 1 }) => {
      const src = this.context.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.context.createBiquadFilter();
      filter.type = type;
      filter.frequency.setValueAtTime(freq, t);
      filter.Q.value = Q;
      if (detune) filter.detune.setValueAtTime(detune, t);
      const bGain = this.context.createGain();
      bGain.gain.setValueAtTime(bandGain, t);
      src.connect(filter);
      filter.connect(bGain);
      bGain.connect(master);
      src.start(t);
      src.stop(t + duration + 0.05);
    });
  }

  /** Distorted tone through a waveshaper for gritty, saturated sounds */
  distortedTone({ frequency, duration, type = 'sawtooth', gain = 0.05, drive = 8, delay = 0, freqEnd = 0 }) {
    if (!this.context || !this.unlocked || this.context.state !== 'running' || this.muted) return;
    const t = this.context.currentTime + delay;
    const osc = this.context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, t);
    if (freqEnd > 0) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + duration);
    }
    const shaper = this.context.createWaveShaper();
    shaper.curve = this.createDistortionCurve(drive);
    shaper.oversample = '2x';
    const gNode = this.context.createGain();
    gNode.gain.setValueAtTime(0.0001, t);
    gNode.gain.exponentialRampToValueAtTime(gain, t + 0.006);
    gNode.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(shaper);
    shaper.connect(gNode);
    gNode.connect(this.context.destination);
    osc.start(t);
    osc.stop(t + duration + 0.03);
  }

  /** Resonant body simulation – parallel tuned filters on impulse noise */
  resonantBody({ frequencies, Q = 12, duration = 0.15, gain = 0.03, delay = 0 }) {
    if (!this.context || !this.unlocked || this.context.state !== 'running' || this.muted) return;
    this.createNoiseBuffer();
    const t = this.context.currentTime + delay;
    frequencies.forEach((freq) => {
      const src = this.context.createBufferSource();
      src.buffer = this.noiseBuffer;
      const bp = this.context.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(freq, t);
      bp.Q.value = Q;
      const gNode = this.context.createGain();
      const perGain = gain / frequencies.length;
      gNode.gain.setValueAtTime(0.0001, t);
      gNode.gain.exponentialRampToValueAtTime(perGain, t + 0.004);
      gNode.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      src.connect(bp);
      bp.connect(gNode);
      gNode.connect(this.context.destination);
      src.start(t);
      src.stop(t + duration + 0.05);
    });
  }

  /** Dual-detuned oscillator for thick, chorused tones */
  chorusTone({ frequency, duration, type = 'sawtooth', gain = 0.04, detuneCents = 12, delay = 0, freqEnd = 0 }) {
    if (!this.context || !this.unlocked || this.context.state !== 'running' || this.muted) return;
    const t = this.context.currentTime + delay;
    [-detuneCents, detuneCents].forEach((det) => {
      const osc = this.context.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, t);
      osc.detune.setValueAtTime(det, t);
      if (freqEnd > 0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + duration);
      const gNode = this.context.createGain();
      gNode.gain.setValueAtTime(0.0001, t);
      gNode.gain.exponentialRampToValueAtTime(gain * 0.5, t + 0.008);
      gNode.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gNode);
      gNode.connect(this.context.destination);
      osc.start(t);
      osc.stop(t + duration + 0.03);
    });
  }

  // ── Per-weapon SHOT sounds ────────────────────────────────────────────────

  playShot(weapon) {
    const id = weapon.id;
    if (id === 'shell') this.playShotShell();
    else if (id === 'mortar') this.playShotMortar();
    else if (id === 'split') this.playShotSplit();
    else if (id === 'splitstorm') this.playShotStorm();
    else if (id === 'bouncer') this.playShotBouncer();
    else if (id === 'hopper') this.playShotHopper();
    else if (id === 'rail') this.playShotRail();
    else this.playShotShell();
  }

  playShotShell() {
    // Classic cannon: concussive thump + brass casing ring + smoke burst
    this.distortedTone({ frequency: 160, freqEnd: 55, duration: 0.12, type: 'sawtooth', gain: 0.07, drive: 14 });
    this.tone({ frequency: 1250, duration: 0.03, type: 'sine', gain: 0.025 });
    this.tone({ frequency: 2800, duration: 0.018, type: 'sine', gain: 0.012, delay: 0.005 });
    this.noiseBurst({ duration: 0.09, gain: 0.042, highpass: 300, lowpass: 2400, delay: 0.003 });
    this.resonantBody({ frequencies: [520, 1040], Q: 8, duration: 0.06, gain: 0.018, delay: 0.01 });
  }

  playShotMortar() {
    // Heavy mortar: deep chamber boom + pressure wave + metallic tube resonance
    this.distortedTone({ frequency: 72, freqEnd: 28, duration: 0.22, type: 'sawtooth', gain: 0.09, drive: 20 });
    this.sweep({ from: 180, to: 38, duration: 0.18, type: 'triangle', gain: 0.06 });
    this.shapedNoise({
      duration: 0.16, gain: 0.055,
      bands: [
        { freq: 120, Q: 1.2, bandGain: 1 },
        { freq: 400, Q: 2, bandGain: 0.6 },
        { freq: 1600, Q: 1.5, bandGain: 0.3 }
      ]
    });
    this.resonantBody({ frequencies: [180, 360, 720], Q: 10, duration: 0.1, gain: 0.025, delay: 0.008 });
    this.noiseBurst({ duration: 0.13, gain: 0.04, highpass: 80, lowpass: 900, delay: 0.01 });
  }

  playShotSplit() {
    // Crystal split: bright harmonic chime + electric crackle
    this.tone({ frequency: 880, duration: 0.05, type: 'sine', gain: 0.035 });
    this.tone({ frequency: 1320, duration: 0.04, type: 'sine', gain: 0.022, delay: 0.01 });
    this.tone({ frequency: 1760, duration: 0.03, type: 'sine', gain: 0.014, delay: 0.018 });
    this.chorusTone({ frequency: 440, duration: 0.08, type: 'triangle', gain: 0.03, detuneCents: 20 });
    this.shapedNoise({
      duration: 0.07, gain: 0.03,
      bands: [{ freq: 3200, Q: 3, bandGain: 1 }, { freq: 6000, Q: 2, bandGain: 0.5 }],
      ringFreq: 880
    });
    this.noiseBurst({ duration: 0.05, gain: 0.025, highpass: 1800, lowpass: 5000 });
  }

  playShotStorm() {
    // Arcane storm: ethereal whoosh + harmonic cascade + crackle
    this.chorusTone({ frequency: 330, duration: 0.12, type: 'sawtooth', gain: 0.03, detuneCents: 30, freqEnd: 660 });
    this.tone({ frequency: 660, duration: 0.06, type: 'sine', gain: 0.02, delay: 0.02 });
    this.tone({ frequency: 990, duration: 0.04, type: 'sine', gain: 0.014, delay: 0.03 });
    this.tone({ frequency: 1320, duration: 0.03, type: 'sine', gain: 0.01, delay: 0.038 });
    this.sweep({ from: 2200, to: 600, duration: 0.1, type: 'sine', gain: 0.018 });
    this.shapedNoise({
      duration: 0.1, gain: 0.028,
      bands: [{ freq: 4000, Q: 2 }, { freq: 7000, Q: 3, bandGain: 0.4 }],
      ringFreq: 660
    });
    this.noiseBurst({ duration: 0.06, gain: 0.02, highpass: 2000, lowpass: 6000, delay: 0.01 });
  }

  playShotBouncer() {
    // Rubber-steel hybrid: punchy metallic pop + spring twang
    this.distortedTone({ frequency: 220, freqEnd: 120, duration: 0.08, type: 'square', gain: 0.05, drive: 10 });
    this.sweep({ from: 1800, to: 400, duration: 0.06, type: 'sine', gain: 0.03, delay: 0.005 });
    this.tone({ frequency: 680, duration: 0.04, type: 'triangle', gain: 0.025, delay: 0.01 });
    this.resonantBody({ frequencies: [340, 680, 1360], Q: 14, duration: 0.05, gain: 0.02, delay: 0.005 });
    this.noiseBurst({ duration: 0.05, gain: 0.028, highpass: 500, lowpass: 3000 });
  }

  playShotHopper() {
    // Mechanical launcher: chunky thud + gear ratchet + metallic rattle
    this.distortedTone({ frequency: 140, freqEnd: 60, duration: 0.1, type: 'square', gain: 0.06, drive: 16 });
    this.tone({ frequency: 380, duration: 0.04, type: 'square', gain: 0.03, delay: 0.008 });
    this.shapedNoise({
      duration: 0.08, gain: 0.035,
      bands: [
        { freq: 800, Q: 4, bandGain: 1 },
        { freq: 2200, Q: 5, bandGain: 0.6 }
      ]
    });
    this.resonantBody({ frequencies: [260, 520, 1100], Q: 10, duration: 0.07, gain: 0.02, delay: 0.006 });
    this.noiseBurst({ duration: 0.06, gain: 0.03, highpass: 200, lowpass: 1800, delay: 0.004 });
  }

  playShotRail() {
    // Electromagnetic railgun: supersonic crack + electric discharge + high-freq whine
    this.tone({ frequency: 3200, duration: 0.015, type: 'sine', gain: 0.04 });
    this.tone({ frequency: 6400, duration: 0.01, type: 'sine', gain: 0.02, delay: 0.002 });
    this.sweep({ from: 4800, to: 800, duration: 0.04, type: 'sawtooth', gain: 0.035 });
    this.distortedTone({ frequency: 240, freqEnd: 100, duration: 0.06, type: 'sawtooth', gain: 0.04, drive: 18 });
    this.shapedNoise({
      duration: 0.04, gain: 0.04,
      bands: [{ freq: 5000, Q: 1 }, { freq: 8000, Q: 2, bandGain: 0.7 }]
    });
    this.chorusTone({ frequency: 1600, duration: 0.03, type: 'sine', gain: 0.02, detuneCents: 40, freqEnd: 400 });
    // Trailing electric hum
    this.tone({ frequency: 120, duration: 0.08, type: 'sawtooth', gain: 0.015, delay: 0.02 });
  }

  // ── Per-weapon EXPLOSION sounds ───────────────────────────────────────────

  playExplosion(weapon) {
    const id = weapon.id;
    if (id === 'shell') this.playExplosionShell(weapon);
    else if (id === 'mortar') this.playExplosionMortar(weapon);
    else if (id === 'split') this.playExplosionSplit(weapon);
    else if (id === 'splitstorm') this.playExplosionStorm(weapon);
    else if (id === 'bouncer') this.playExplosionBouncer(weapon);
    else if (id === 'hopper') this.playExplosionHopper(weapon);
    else if (id === 'rail') this.playExplosionRail(weapon);
    else this.playExplosionShell(weapon);
  }

  playExplosionShell() {
    // Standard explosion: fireball + pressure wave + debris scatter
    this.distortedTone({ frequency: 90, freqEnd: 25, duration: 0.28, type: 'sawtooth', gain: 0.09, drive: 16 });
    this.sweep({ from: 240, to: 35, duration: 0.22, type: 'triangle', gain: 0.06 });
    this.shapedNoise({
      duration: 0.26, gain: 0.06,
      bands: [
        { freq: 100, Q: 0.8, bandGain: 1 },
        { freq: 600, Q: 1.2, bandGain: 0.7 },
        { freq: 2000, Q: 1.5, bandGain: 0.3 }
      ]
    });
    this.noiseBurst({ duration: 0.14, gain: 0.04, highpass: 200, lowpass: 3000, delay: 0.02 });
    this.resonantBody({ frequencies: [80, 160], Q: 4, duration: 0.18, gain: 0.03, delay: 0.01 });
  }

  playExplosionMortar() {
    // Massive detonation: earth-shaking sub-bass + shockwave + flying debris
    this.distortedTone({ frequency: 48, freqEnd: 20, duration: 0.4, type: 'sawtooth', gain: 0.11, drive: 24 });
    this.sweep({ from: 160, to: 22, duration: 0.36, type: 'sawtooth', gain: 0.08, delay: 0.005 });
    this.sweep({ from: 80, to: 20, duration: 0.44, type: 'triangle', gain: 0.06, delay: 0.02 });
    this.shapedNoise({
      duration: 0.35, gain: 0.07,
      bands: [
        { freq: 60, Q: 0.6, bandGain: 1 },
        { freq: 300, Q: 1, bandGain: 0.8 },
        { freq: 1200, Q: 1.5, bandGain: 0.4 },
        { freq: 3000, Q: 2, bandGain: 0.15 }
      ]
    });
    // Debris shower
    this.noiseBurst({ duration: 0.2, gain: 0.035, highpass: 800, lowpass: 4000, delay: 0.06 });
    this.noiseBurst({ duration: 0.15, gain: 0.025, highpass: 1500, lowpass: 5000, delay: 0.12 });
    this.resonantBody({ frequencies: [55, 110, 220], Q: 5, duration: 0.22, gain: 0.035 });
  }

  playExplosionSplit() {
    // Small crystalline pop: bright, sharp, quick
    this.distortedTone({ frequency: 180, freqEnd: 60, duration: 0.12, type: 'triangle', gain: 0.05, drive: 8 });
    this.tone({ frequency: 1100, duration: 0.03, type: 'sine', gain: 0.02 });
    this.shapedNoise({
      duration: 0.1, gain: 0.035,
      bands: [
        { freq: 400, Q: 1.5, bandGain: 1 },
        { freq: 2400, Q: 3, bandGain: 0.5 }
      ],
      ringFreq: 440
    });
    this.noiseBurst({ duration: 0.08, gain: 0.03, highpass: 300, lowpass: 2800, delay: 0.01 });
    this.resonantBody({ frequencies: [440, 880], Q: 10, duration: 0.06, gain: 0.015, delay: 0.005 });
  }

  playExplosionStorm() {
    // Arcane detonation: ethereal shatter + harmonic ring + sparkle tail
    this.distortedTone({ frequency: 140, freqEnd: 50, duration: 0.14, type: 'triangle', gain: 0.04, drive: 8 });
    this.chorusTone({ frequency: 660, duration: 0.08, type: 'sine', gain: 0.02, detuneCents: 25 });
    this.tone({ frequency: 1320, duration: 0.05, type: 'sine', gain: 0.012, delay: 0.01 });
    this.shapedNoise({
      duration: 0.12, gain: 0.03,
      bands: [{ freq: 3000, Q: 3 }, { freq: 5500, Q: 4, bandGain: 0.5 }],
      ringFreq: 330
    });
    this.noiseBurst({ duration: 0.06, gain: 0.025, highpass: 400, lowpass: 2000, delay: 0.008 });
    // Sparkle tail
    this.noiseBurst({ duration: 0.08, gain: 0.012, highpass: 4000, lowpass: 8000, delay: 0.04 });
  }

  playExplosionBouncer() {
    // Metallic burst: sharp crack + reverberant ring
    this.distortedTone({ frequency: 150, freqEnd: 45, duration: 0.18, type: 'square', gain: 0.06, drive: 12 });
    this.sweep({ from: 320, to: 60, duration: 0.16, type: 'triangle', gain: 0.045 });
    this.shapedNoise({
      duration: 0.16, gain: 0.04,
      bands: [
        { freq: 200, Q: 1, bandGain: 1 },
        { freq: 1000, Q: 2, bandGain: 0.6 }
      ]
    });
    this.resonantBody({ frequencies: [340, 680, 1020], Q: 12, duration: 0.1, gain: 0.025, delay: 0.008 });
    this.noiseBurst({ duration: 0.1, gain: 0.03, highpass: 150, lowpass: 2500, delay: 0.015 });
  }

  playExplosionHopper() {
    // Mine detonation: sharp concussive snap + metallic shrapnel spray
    this.distortedTone({ frequency: 120, freqEnd: 35, duration: 0.2, type: 'square', gain: 0.07, drive: 18 });
    this.sweep({ from: 280, to: 40, duration: 0.18, type: 'sawtooth', gain: 0.05 });
    this.shapedNoise({
      duration: 0.18, gain: 0.045,
      bands: [
        { freq: 160, Q: 0.8, bandGain: 1 },
        { freq: 800, Q: 2, bandGain: 0.7 },
        { freq: 2800, Q: 3, bandGain: 0.4 }
      ]
    });
    // Shrapnel ping shower
    this.resonantBody({ frequencies: [1800, 2600, 3400], Q: 16, duration: 0.06, gain: 0.015, delay: 0.03 });
    this.noiseBurst({ duration: 0.12, gain: 0.03, highpass: 400, lowpass: 3200, delay: 0.02 });
  }

  playExplosionRail() {
    // Electromagnetic impact: sharp electric snap + ionization crackle + EMP ring
    this.tone({ frequency: 4200, duration: 0.012, type: 'sine', gain: 0.035 });
    this.distortedTone({ frequency: 200, freqEnd: 60, duration: 0.1, type: 'sawtooth', gain: 0.055, drive: 20 });
    this.sweep({ from: 3600, to: 300, duration: 0.06, type: 'sawtooth', gain: 0.03 });
    this.shapedNoise({
      duration: 0.08, gain: 0.04,
      bands: [{ freq: 4000, Q: 2 }, { freq: 7000, Q: 3, bandGain: 0.5 }]
    });
    // EMP ring-out
    this.chorusTone({ frequency: 240, duration: 0.12, type: 'sine', gain: 0.02, detuneCents: 50, delay: 0.02 });
    this.noiseBurst({ duration: 0.06, gain: 0.03, highpass: 200, lowpass: 1600, delay: 0.01 });
    this.resonantBody({ frequencies: [120, 240], Q: 6, duration: 0.1, gain: 0.02, delay: 0.015 });
  }

  // ── Per-weapon HIT sounds ─────────────────────────────────────────────────

  playHit(damage, weapon) {
    const id = weapon?.id;
    const intensity = Math.min(1, damage / 60);

    // Universal metallic hull impact
    this.resonantBody({
      frequencies: [420 + intensity * 180, 840 + intensity * 200],
      Q: 8 + intensity * 6,
      duration: 0.06 + intensity * 0.04,
      gain: 0.02 + intensity * 0.015
    });
    this.tone({
      frequency: 380 + intensity * 220,
      duration: 0.05,
      type: 'square',
      gain: 0.02 + intensity * 0.012
    });

    // Weapon-specific hit layer
    if (id === 'mortar') {
      this.distortedTone({ frequency: 110, freqEnd: 40, duration: 0.1, type: 'sawtooth', gain: 0.03, drive: 12, delay: 0.005 });
    } else if (id === 'rail') {
      this.tone({ frequency: 2400, duration: 0.02, type: 'sine', gain: 0.018 });
      this.sweep({ from: 1800, to: 300, duration: 0.04, type: 'sine', gain: 0.012, delay: 0.005 });
    } else if (id === 'split' || id === 'splitstorm') {
      this.tone({ frequency: 1100, duration: 0.025, type: 'sine', gain: 0.015, delay: 0.003 });
    } else if (id === 'bouncer' || id === 'hopper') {
      this.tone({ frequency: 680, duration: 0.03, type: 'triangle', gain: 0.018, delay: 0.005 });
    }
  }

  // ── Per-weapon BOUNCE sounds ──────────────────────────────────────────────

  playBounce(weapon) {
    const id = weapon?.id;
    if (id === 'hopper') {
      // Heavy mechanical clank + spring
      this.distortedTone({ frequency: 180, freqEnd: 100, duration: 0.05, type: 'square', gain: 0.035, drive: 10 });
      this.resonantBody({ frequencies: [460, 920, 1380], Q: 14, duration: 0.04, gain: 0.02, delay: 0.005 });
      this.noiseBurst({ duration: 0.03, gain: 0.02, highpass: 600, lowpass: 3000 });
    } else {
      // Bouncer: elastic metallic ping + spring twang
      this.sweep({ from: 1600, to: 480, duration: 0.04, type: 'sine', gain: 0.03 });
      this.tone({ frequency: 520, duration: 0.04, type: 'triangle', gain: 0.028, delay: 0.01 });
      this.resonantBody({ frequencies: [340, 680], Q: 16, duration: 0.04, gain: 0.018 });
    }
  }

  playTurn() {
    this.tone({
      frequency: 420,
      duration: 0.05,
      type: 'triangle',
      gain: 0.025
    });
    this.tone({
      frequency: 580,
      duration: 0.08,
      type: 'triangle',
      gain: 0.025,
      delay: 0.055
    });
  }

  playGameOver({ winner = true } = {}) {
    if (winner) {
      this.tone({ frequency: 392, duration: 0.14, type: 'triangle', gain: 0.02 });
      this.tone({ frequency: 523, duration: 0.16, type: 'triangle', gain: 0.02, delay: 0.09 });
      this.tone({ frequency: 659, duration: 0.2, type: 'triangle', gain: 0.018, delay: 0.19 });
      this.sweep({ from: 220, to: 320, duration: 0.24, type: 'sine', gain: 0.014, delay: 0.02 });
    } else {
      this.tone({ frequency: 330, duration: 0.12, type: 'triangle', gain: 0.016 });
      this.tone({ frequency: 277, duration: 0.18, type: 'triangle', gain: 0.016, delay: 0.1 });
      this.sweep({ from: 210, to: 120, duration: 0.28, type: 'sine', gain: 0.012, delay: 0.03 });
    }
    this.noiseBurst({ duration: 0.11, gain: 0.008, highpass: 260, lowpass: 1700, delay: 0.04 });
  }
}
