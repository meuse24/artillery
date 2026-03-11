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
    this.masterBus = null;
    this.masterComp = null;
    this.masterGain = null;
    this.masterLimiter = null;
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
    node.connect(this.out());

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
    node.connect(this.out());
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
    node.connect(this.out());

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

  // ── Master bus with compressor/limiter ──────────────────────────────────────

  ensureMasterBus() {
    if (this.masterBus) return;
    if (!this.context) return;
    // Compressor: glues everything together, prevents clipping, pumps the volume
    this.masterComp = this.context.createDynamicsCompressor();
    this.masterComp.threshold.setValueAtTime(-18, 0);
    this.masterComp.knee.setValueAtTime(6, 0);
    this.masterComp.ratio.setValueAtTime(8, 0);
    this.masterComp.attack.setValueAtTime(0.002, 0);
    this.masterComp.release.setValueAtTime(0.08, 0);
    // Post-comp makeup gain
    this.masterGain = this.context.createGain();
    this.masterGain.gain.setValueAtTime(2.8, 0);
    // Final limiter – brick-wall so nothing clips
    this.masterLimiter = this.context.createDynamicsCompressor();
    this.masterLimiter.threshold.setValueAtTime(-3, 0);
    this.masterLimiter.knee.setValueAtTime(0, 0);
    this.masterLimiter.ratio.setValueAtTime(20, 0);
    this.masterLimiter.attack.setValueAtTime(0.001, 0);
    this.masterLimiter.release.setValueAtTime(0.02, 0);

    this.masterComp.connect(this.masterGain);
    this.masterGain.connect(this.masterLimiter);
    this.masterLimiter.connect(this.context.destination);
    this.masterBus = this.masterComp;
  }

  /** Returns the master bus node (or destination as fallback) */
  out() {
    this.ensureMasterBus();
    return this.masterBus || this.context.destination;
  }

  // ── Advanced synthesis helpers ──────────────────────────────────────────────

  shapedNoise({ duration, gain, bands, ringFreq = 0, delay = 0 }) {
    if (!this.context || !this.unlocked || this.context.state !== 'running' || this.muted) return;
    this.createNoiseBuffer();
    const t = this.context.currentTime + delay;
    const dest = this.out();
    const master = this.context.createGain();
    master.gain.setValueAtTime(0.0001, t);
    master.gain.exponentialRampToValueAtTime(gain, t + 0.004);
    master.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    if (ringFreq > 0) {
      const ring = this.context.createOscillator();
      const ringGain = this.context.createGain();
      ring.type = 'sine';
      ring.frequency.setValueAtTime(ringFreq, t);
      ringGain.gain.setValueAtTime(0, t);
      ring.connect(ringGain.gain);
      master.connect(ringGain);
      ringGain.connect(dest);
      ring.start(t);
      ring.stop(t + duration + 0.05);
      const dry = this.context.createGain();
      dry.gain.setValueAtTime(0.4, t);
      master.connect(dry);
      dry.connect(dest);
    } else {
      master.connect(dest);
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
    shaper.oversample = '4x';
    const gNode = this.context.createGain();
    gNode.gain.setValueAtTime(0.0001, t);
    gNode.gain.exponentialRampToValueAtTime(gain, t + 0.003);
    gNode.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(shaper);
    shaper.connect(gNode);
    gNode.connect(this.out());
    osc.start(t);
    osc.stop(t + duration + 0.03);
  }

  resonantBody({ frequencies, Q = 12, duration = 0.15, gain = 0.03, delay = 0 }) {
    if (!this.context || !this.unlocked || this.context.state !== 'running' || this.muted) return;
    this.createNoiseBuffer();
    const t = this.context.currentTime + delay;
    const dest = this.out();
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
      gNode.gain.exponentialRampToValueAtTime(perGain, t + 0.003);
      gNode.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      src.connect(bp);
      bp.connect(gNode);
      gNode.connect(dest);
      src.start(t);
      src.stop(t + duration + 0.05);
    });
  }

  chorusTone({ frequency, duration, type = 'sawtooth', gain = 0.04, detuneCents = 12, delay = 0, freqEnd = 0 }) {
    if (!this.context || !this.unlocked || this.context.state !== 'running' || this.muted) return;
    const t = this.context.currentTime + delay;
    const dest = this.out();
    [-detuneCents, detuneCents].forEach((det) => {
      const osc = this.context.createOscillator();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, t);
      osc.detune.setValueAtTime(det, t);
      if (freqEnd > 0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + duration);
      const gNode = this.context.createGain();
      gNode.gain.setValueAtTime(0.0001, t);
      gNode.gain.exponentialRampToValueAtTime(gain * 0.5, t + 0.005);
      gNode.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gNode);
      gNode.connect(dest);
      osc.start(t);
      osc.stop(t + duration + 0.03);
    });
  }

  /** Sub-bass pressure wave – the chest-punch of an explosion */
  subBoom({ frequency = 40, freqEnd = 18, duration = 0.5, gain = 0.22, drive = 30, delay = 0 }) {
    if (!this.context || !this.unlocked || this.context.state !== 'running' || this.muted) return;
    const t = this.context.currentTime + delay;
    const dest = this.out();
    // Layer 1: distorted sub oscillator
    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + duration);
    const shaper = this.context.createWaveShaper();
    shaper.curve = this.createDistortionCurve(drive);
    shaper.oversample = '4x';
    const lp = this.context.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(120, t);
    lp.Q.value = 1.2;
    const g = this.context.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.004);
    g.gain.setValueAtTime(gain, t + duration * 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(shaper);
    shaper.connect(lp);
    lp.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + duration + 0.05);
    // Layer 2: sub noise thump
    this.createNoiseBuffer();
    const ns = this.context.createBufferSource();
    ns.buffer = this.noiseBuffer;
    const nlp = this.context.createBiquadFilter();
    nlp.type = 'lowpass';
    nlp.frequency.setValueAtTime(80, t);
    nlp.Q.value = 2;
    const ng = this.context.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(gain * 0.5, t + 0.003);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + duration * 0.6);
    ns.connect(nlp);
    nlp.connect(ng);
    ng.connect(dest);
    ns.start(t);
    ns.stop(t + duration + 0.05);
  }

  /** Hissing tail – fire/smoke/steam after explosion */
  hissTail({ duration = 0.6, gain = 0.08, highpass = 2000, lowpass = 8000, delay = 0 }) {
    if (!this.context || !this.unlocked || this.context.state !== 'running' || this.muted) return;
    this.createNoiseBuffer();
    const t = this.context.currentTime + delay;
    const dest = this.out();
    const src = this.context.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = this.context.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(highpass, t);
    hp.Q.value = 0.5;
    const lp = this.context.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(lowpass, t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(20, highpass + 200), t + duration);
    lp.Q.value = 0.7;
    const g = this.context.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.setValueAtTime(gain * 0.7, t + duration * 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(hp);
    hp.connect(lp);
    lp.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(t + duration + 0.05);
  }

  /** Debris/shrapnel rattle – staggered metallic pings */
  debrisShower({ count = 6, duration = 0.4, gain = 0.04, delay = 0 }) {
    if (!this.context || !this.unlocked || this.context.state !== 'running' || this.muted) return;
    for (let i = 0; i < count; i++) {
      const d = delay + (i / count) * duration * 0.6 + Math.random() * 0.04;
      const freq = 1200 + Math.random() * 3000;
      const dur = 0.02 + Math.random() * 0.04;
      this.resonantBody({
        frequencies: [freq, freq * 1.5],
        Q: 14 + Math.random() * 10,
        duration: dur,
        gain: gain * (0.5 + Math.random() * 0.5),
        delay: d
      });
    }
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
    // CANNON BLAST: huge concussive punch + barrel ring + smoke whoosh
    this.subBoom({ frequency: 80, freqEnd: 30, duration: 0.18, gain: 0.18, drive: 18 });
    this.distortedTone({ frequency: 180, freqEnd: 50, duration: 0.14, type: 'sawtooth', gain: 0.14, drive: 16 });
    this.sweep({ from: 400, to: 80, duration: 0.12, type: 'square', gain: 0.08 });
    // Barrel ring
    this.resonantBody({ frequencies: [520, 1040, 2080], Q: 10, duration: 0.08, gain: 0.05, delay: 0.008 });
    // Concussive blast noise
    this.shapedNoise({
      duration: 0.14, gain: 0.1,
      bands: [
        { freq: 200, Q: 0.8, bandGain: 1 },
        { freq: 800, Q: 1.5, bandGain: 0.8 },
        { freq: 2400, Q: 2, bandGain: 0.5 }
      ]
    });
    // Smoke whoosh tail
    this.hissTail({ duration: 0.2, gain: 0.04, highpass: 1500, lowpass: 5000, delay: 0.04 });
  }

  playShotMortar() {
    // MORTAR LAUNCH: massive low-end thump + tube resonance + pressure wave
    this.subBoom({ frequency: 55, freqEnd: 20, duration: 0.32, gain: 0.24, drive: 28 });
    this.distortedTone({ frequency: 65, freqEnd: 22, duration: 0.26, type: 'sawtooth', gain: 0.16, drive: 24 });
    this.sweep({ from: 200, to: 30, duration: 0.22, type: 'sawtooth', gain: 0.1 });
    // Tube resonance – hollow metallic boom
    this.resonantBody({ frequencies: [140, 280, 560, 1120], Q: 8, duration: 0.14, gain: 0.07, delay: 0.005 });
    // Massive blast wave
    this.shapedNoise({
      duration: 0.22, gain: 0.12,
      bands: [
        { freq: 80, Q: 0.6, bandGain: 1 },
        { freq: 300, Q: 1, bandGain: 0.9 },
        { freq: 1000, Q: 1.5, bandGain: 0.5 },
        { freq: 2500, Q: 2, bandGain: 0.2 }
      ]
    });
    this.noiseBurst({ duration: 0.16, gain: 0.08, highpass: 60, lowpass: 800, delay: 0.008 });
    this.hissTail({ duration: 0.3, gain: 0.05, highpass: 800, lowpass: 3000, delay: 0.06 });
  }

  playShotSplit() {
    // CRYSTAL LAUNCHER: bright energy charge + harmonic scatter + electric snap
    this.subBoom({ frequency: 100, freqEnd: 50, duration: 0.1, gain: 0.1, drive: 12 });
    this.distortedTone({ frequency: 300, freqEnd: 120, duration: 0.08, type: 'triangle', gain: 0.08, drive: 10 });
    // Harmonic crystal cascade
    this.tone({ frequency: 880, duration: 0.06, type: 'sine', gain: 0.06 });
    this.tone({ frequency: 1320, duration: 0.05, type: 'sine', gain: 0.04, delay: 0.008 });
    this.tone({ frequency: 1760, duration: 0.04, type: 'sine', gain: 0.03, delay: 0.015 });
    this.tone({ frequency: 2200, duration: 0.03, type: 'sine', gain: 0.02, delay: 0.02 });
    this.chorusTone({ frequency: 440, duration: 0.1, type: 'triangle', gain: 0.06, detuneCents: 25 });
    // Electric crackle
    this.shapedNoise({
      duration: 0.08, gain: 0.06,
      bands: [{ freq: 3200, Q: 3 }, { freq: 6000, Q: 2.5, bandGain: 0.6 }],
      ringFreq: 880
    });
    this.noiseBurst({ duration: 0.06, gain: 0.05, highpass: 1500, lowpass: 6000, delay: 0.003 });
  }

  playShotStorm() {
    // ARCANE STORM BARRAGE: dark energy surge + dissonant cascade + thunder crack
    this.subBoom({ frequency: 70, freqEnd: 30, duration: 0.16, gain: 0.14, drive: 16 });
    this.distortedTone({ frequency: 200, freqEnd: 80, duration: 0.12, type: 'sawtooth', gain: 0.1, drive: 14 });
    // Dissonant harmonic rise
    this.chorusTone({ frequency: 330, duration: 0.14, type: 'sawtooth', gain: 0.06, detuneCents: 40, freqEnd: 800 });
    this.tone({ frequency: 660, duration: 0.08, type: 'sine', gain: 0.04, delay: 0.015 });
    this.tone({ frequency: 990, duration: 0.06, type: 'sine', gain: 0.03, delay: 0.025 });
    this.tone({ frequency: 1320, duration: 0.04, type: 'sine', gain: 0.025, delay: 0.033 });
    this.tone({ frequency: 1650, duration: 0.03, type: 'sine', gain: 0.02, delay: 0.04 });
    // Thunder crack
    this.sweep({ from: 3000, to: 400, duration: 0.08, type: 'sawtooth', gain: 0.05 });
    this.shapedNoise({
      duration: 0.12, gain: 0.07,
      bands: [{ freq: 3000, Q: 1.5 }, { freq: 6000, Q: 2.5, bandGain: 0.5 }, { freq: 9000, Q: 3, bandGain: 0.2 }],
      ringFreq: 660
    });
    this.hissTail({ duration: 0.18, gain: 0.04, highpass: 2500, lowpass: 7000, delay: 0.04 });
  }

  playShotBouncer() {
    // PNEUMATIC CANNON: compressed-air punch + metallic ring + spring release
    this.subBoom({ frequency: 90, freqEnd: 40, duration: 0.12, gain: 0.14, drive: 14 });
    this.distortedTone({ frequency: 240, freqEnd: 100, duration: 0.1, type: 'square', gain: 0.1, drive: 12 });
    // Spring release twang
    this.sweep({ from: 2400, to: 400, duration: 0.08, type: 'sine', gain: 0.06, delay: 0.005 });
    this.sweep({ from: 1200, to: 200, duration: 0.1, type: 'triangle', gain: 0.04, delay: 0.01 });
    // Metallic resonance
    this.resonantBody({ frequencies: [340, 680, 1360, 2040], Q: 16, duration: 0.07, gain: 0.05, delay: 0.005 });
    this.shapedNoise({
      duration: 0.08, gain: 0.06,
      bands: [{ freq: 600, Q: 2 }, { freq: 1800, Q: 3, bandGain: 0.7 }, { freq: 3600, Q: 2, bandGain: 0.3 }]
    });
    this.noiseBurst({ duration: 0.06, gain: 0.05, highpass: 400, lowpass: 3000, delay: 0.003 });
  }

  playShotHopper() {
    // MINE LAUNCHER: heavy mechanical slam + gear crunch + rattle discharge
    this.subBoom({ frequency: 65, freqEnd: 25, duration: 0.18, gain: 0.18, drive: 20 });
    this.distortedTone({ frequency: 150, freqEnd: 50, duration: 0.14, type: 'square', gain: 0.12, drive: 18 });
    // Gear crunch
    this.shapedNoise({
      duration: 0.1, gain: 0.08,
      bands: [
        { freq: 600, Q: 4 },
        { freq: 1400, Q: 5, bandGain: 0.7 },
        { freq: 2800, Q: 4, bandGain: 0.4 }
      ]
    });
    this.tone({ frequency: 380, duration: 0.05, type: 'square', gain: 0.06, delay: 0.006 });
    // Mechanical rattle
    this.resonantBody({ frequencies: [260, 520, 1040, 1560], Q: 10, duration: 0.08, gain: 0.04, delay: 0.01 });
    this.noiseBurst({ duration: 0.08, gain: 0.06, highpass: 150, lowpass: 2000, delay: 0.005 });
    this.hissTail({ duration: 0.15, gain: 0.03, highpass: 1000, lowpass: 4000, delay: 0.05 });
  }

  playShotRail() {
    // RAILGUN DISCHARGE: electromagnetic crack + supersonic whip + ionization sizzle
    // Initial ultra-fast transient – the "crack"
    this.tone({ frequency: 4000, duration: 0.008, type: 'square', gain: 0.12 });
    this.tone({ frequency: 8000, duration: 0.006, type: 'sine', gain: 0.06, delay: 0.001 });
    // Supersonic whip sweep
    this.sweep({ from: 6000, to: 600, duration: 0.05, type: 'sawtooth', gain: 0.1 });
    this.sweep({ from: 3000, to: 200, duration: 0.08, type: 'square', gain: 0.06, delay: 0.01 });
    // Electromagnetic bass punch
    this.subBoom({ frequency: 120, freqEnd: 40, duration: 0.12, gain: 0.16, drive: 22 });
    this.distortedTone({ frequency: 280, freqEnd: 80, duration: 0.08, type: 'sawtooth', gain: 0.1, drive: 20 });
    // Ionization crackle
    this.shapedNoise({
      duration: 0.06, gain: 0.08,
      bands: [{ freq: 5000, Q: 1.5 }, { freq: 8000, Q: 2, bandGain: 0.7 }, { freq: 11000, Q: 3, bandGain: 0.3 }]
    });
    // Chorus electric hum tail
    this.chorusTone({ frequency: 1800, duration: 0.05, type: 'sine', gain: 0.04, detuneCents: 50, freqEnd: 300 });
    this.hissTail({ duration: 0.15, gain: 0.05, highpass: 3000, lowpass: 10000, delay: 0.02 });
    // Low growl tail
    this.distortedTone({ frequency: 80, freqEnd: 30, duration: 0.12, type: 'sawtooth', gain: 0.04, drive: 16, delay: 0.03 });
  }

  // ── Per-weapon EXPLOSION sounds ───────────────────────────────────────────

  playExplosion(weapon) {
    const id = weapon.id;
    if (id === 'shell') this.playExplosionShell();
    else if (id === 'mortar') this.playExplosionMortar();
    else if (id === 'split') this.playExplosionSplit();
    else if (id === 'splitstorm') this.playExplosionStorm();
    else if (id === 'bouncer') this.playExplosionBouncer();
    else if (id === 'hopper') this.playExplosionHopper();
    else if (id === 'rail') this.playExplosionRail();
    else this.playExplosionShell();
  }

  playExplosionShell() {
    // FIREBALL DETONATION: massive low-end + pressure shockwave + fire roar + debris
    this.subBoom({ frequency: 50, freqEnd: 18, duration: 0.5, gain: 0.26, drive: 24 });
    this.distortedTone({ frequency: 100, freqEnd: 22, duration: 0.35, type: 'sawtooth', gain: 0.16, drive: 20 });
    this.sweep({ from: 300, to: 30, duration: 0.3, type: 'sawtooth', gain: 0.1 });
    this.sweep({ from: 160, to: 20, duration: 0.4, type: 'triangle', gain: 0.08, delay: 0.02 });
    // Full-spectrum blast
    this.shapedNoise({
      duration: 0.35, gain: 0.12,
      bands: [
        { freq: 80, Q: 0.6, bandGain: 1 },
        { freq: 400, Q: 1, bandGain: 0.8 },
        { freq: 1500, Q: 1.5, bandGain: 0.5 },
        { freq: 4000, Q: 2, bandGain: 0.25 }
      ]
    });
    this.noiseBurst({ duration: 0.18, gain: 0.08, highpass: 150, lowpass: 3000, delay: 0.015 });
    // Fire roar
    this.hissTail({ duration: 0.4, gain: 0.07, highpass: 800, lowpass: 4000, delay: 0.05 });
    // Debris scatter
    this.debrisShower({ count: 5, duration: 0.35, gain: 0.03, delay: 0.08 });
    this.resonantBody({ frequencies: [60, 120, 240], Q: 4, duration: 0.25, gain: 0.06, delay: 0.01 });
  }

  playExplosionMortar() {
    // EARTH-SHATTERING DETONATION: seismic sub-bass + massive shockwave + debris rain
    this.subBoom({ frequency: 32, freqEnd: 14, duration: 0.7, gain: 0.3, drive: 32 });
    this.subBoom({ frequency: 55, freqEnd: 20, duration: 0.5, gain: 0.2, drive: 28, delay: 0.01 });
    this.distortedTone({ frequency: 45, freqEnd: 16, duration: 0.5, type: 'sawtooth', gain: 0.2, drive: 28 });
    this.sweep({ from: 200, to: 18, duration: 0.45, type: 'sawtooth', gain: 0.12, delay: 0.005 });
    this.sweep({ from: 100, to: 16, duration: 0.55, type: 'triangle', gain: 0.1, delay: 0.02 });
    // Wall of destruction noise
    this.shapedNoise({
      duration: 0.5, gain: 0.14,
      bands: [
        { freq: 40, Q: 0.5, bandGain: 1 },
        { freq: 200, Q: 0.8, bandGain: 0.9 },
        { freq: 800, Q: 1.2, bandGain: 0.6 },
        { freq: 2000, Q: 1.5, bandGain: 0.35 },
        { freq: 5000, Q: 2, bandGain: 0.15 }
      ]
    });
    this.noiseBurst({ duration: 0.25, gain: 0.1, highpass: 50, lowpass: 1200 });
    // Shockwave ring-out
    this.resonantBody({ frequencies: [40, 80, 160, 320], Q: 4, duration: 0.35, gain: 0.08 });
    // Fire and smoke
    this.hissTail({ duration: 0.6, gain: 0.08, highpass: 600, lowpass: 3500, delay: 0.06 });
    this.hissTail({ duration: 0.4, gain: 0.05, highpass: 2000, lowpass: 6000, delay: 0.12 });
    // Heavy debris rain
    this.debrisShower({ count: 10, duration: 0.5, gain: 0.04, delay: 0.1 });
    this.noiseBurst({ duration: 0.2, gain: 0.06, highpass: 1000, lowpass: 5000, delay: 0.08 });
  }

  playExplosionSplit() {
    // CRYSTAL SHATTER: sharp concussive pop + glass-break harmonics + tinkle tail
    this.subBoom({ frequency: 80, freqEnd: 35, duration: 0.2, gain: 0.14, drive: 14 });
    this.distortedTone({ frequency: 200, freqEnd: 60, duration: 0.14, type: 'triangle', gain: 0.1, drive: 10 });
    this.sweep({ from: 400, to: 60, duration: 0.12, type: 'triangle', gain: 0.06 });
    // Crystal harmonics
    this.tone({ frequency: 1100, duration: 0.04, type: 'sine', gain: 0.05 });
    this.tone({ frequency: 1650, duration: 0.03, type: 'sine', gain: 0.03, delay: 0.005 });
    this.tone({ frequency: 2200, duration: 0.025, type: 'sine', gain: 0.02, delay: 0.01 });
    this.shapedNoise({
      duration: 0.12, gain: 0.07,
      bands: [
        { freq: 400, Q: 1.5, bandGain: 1 },
        { freq: 1800, Q: 2.5, bandGain: 0.6 },
        { freq: 4000, Q: 3, bandGain: 0.3 }
      ],
      ringFreq: 440
    });
    this.noiseBurst({ duration: 0.1, gain: 0.06, highpass: 250, lowpass: 3000, delay: 0.008 });
    // Glass tinkle tail
    this.debrisShower({ count: 4, duration: 0.2, gain: 0.025, delay: 0.04 });
    this.hissTail({ duration: 0.15, gain: 0.03, highpass: 3000, lowpass: 8000, delay: 0.03 });
  }

  playExplosionStorm() {
    // ARCANE DETONATION: dark energy burst + dissonant ring + sparkle shower
    this.subBoom({ frequency: 60, freqEnd: 25, duration: 0.25, gain: 0.16, drive: 16 });
    this.distortedTone({ frequency: 160, freqEnd: 45, duration: 0.18, type: 'sawtooth', gain: 0.1, drive: 12 });
    this.sweep({ from: 500, to: 50, duration: 0.16, type: 'triangle', gain: 0.06 });
    // Dissonant harmonic ring
    this.chorusTone({ frequency: 660, duration: 0.1, type: 'sine', gain: 0.05, detuneCents: 30 });
    this.tone({ frequency: 990, duration: 0.07, type: 'sine', gain: 0.03, delay: 0.008 });
    this.tone({ frequency: 1320, duration: 0.05, type: 'sine', gain: 0.025, delay: 0.015 });
    this.shapedNoise({
      duration: 0.16, gain: 0.07,
      bands: [
        { freq: 300, Q: 1 },
        { freq: 2000, Q: 2, bandGain: 0.6 },
        { freq: 5000, Q: 3, bandGain: 0.3 }
      ],
      ringFreq: 330
    });
    this.noiseBurst({ duration: 0.1, gain: 0.06, highpass: 300, lowpass: 2500, delay: 0.01 });
    // Sparkle shower
    this.debrisShower({ count: 8, duration: 0.3, gain: 0.03, delay: 0.04 });
    this.hissTail({ duration: 0.25, gain: 0.04, highpass: 4000, lowpass: 10000, delay: 0.04 });
    this.hissTail({ duration: 0.2, gain: 0.03, highpass: 1500, lowpass: 4000, delay: 0.06 });
  }

  playExplosionBouncer() {
    // METALLIC DETONATION: hard crack + steel plate resonance + ricochet scatter
    this.subBoom({ frequency: 65, freqEnd: 25, duration: 0.3, gain: 0.18, drive: 18 });
    this.distortedTone({ frequency: 160, freqEnd: 40, duration: 0.22, type: 'square', gain: 0.12, drive: 14 });
    this.sweep({ from: 400, to: 50, duration: 0.2, type: 'sawtooth', gain: 0.08 });
    // Heavy steel plate resonance
    this.resonantBody({ frequencies: [220, 440, 880, 1320, 1760], Q: 14, duration: 0.14, gain: 0.07, delay: 0.006 });
    this.shapedNoise({
      duration: 0.2, gain: 0.08,
      bands: [
        { freq: 150, Q: 0.8, bandGain: 1 },
        { freq: 700, Q: 1.5, bandGain: 0.7 },
        { freq: 2200, Q: 2, bandGain: 0.4 }
      ]
    });
    this.noiseBurst({ duration: 0.14, gain: 0.06, highpass: 120, lowpass: 2800, delay: 0.01 });
    // Ricochet pings
    this.debrisShower({ count: 5, duration: 0.3, gain: 0.035, delay: 0.06 });
    this.hissTail({ duration: 0.25, gain: 0.04, highpass: 1200, lowpass: 5000, delay: 0.05 });
  }

  playExplosionHopper() {
    // MINE BLAST: brutal snap + shrapnel spray + secondary detonation feel
    this.subBoom({ frequency: 55, freqEnd: 18, duration: 0.35, gain: 0.22, drive: 22 });
    this.distortedTone({ frequency: 130, freqEnd: 30, duration: 0.25, type: 'square', gain: 0.14, drive: 20 });
    this.sweep({ from: 350, to: 35, duration: 0.22, type: 'sawtooth', gain: 0.09 });
    // Shrapnel spray – harsh mid-range
    this.shapedNoise({
      duration: 0.22, gain: 0.1,
      bands: [
        { freq: 120, Q: 0.7, bandGain: 1 },
        { freq: 600, Q: 1.5, bandGain: 0.8 },
        { freq: 2000, Q: 2.5, bandGain: 0.5 },
        { freq: 4500, Q: 3, bandGain: 0.3 }
      ]
    });
    this.noiseBurst({ duration: 0.16, gain: 0.07, highpass: 100, lowpass: 2500, delay: 0.01 });
    // Metal shrapnel pings
    this.resonantBody({ frequencies: [1400, 2200, 3000, 3800], Q: 18, duration: 0.08, gain: 0.04, delay: 0.025 });
    this.debrisShower({ count: 8, duration: 0.35, gain: 0.04, delay: 0.06 });
    // Fire/smoke tail
    this.hissTail({ duration: 0.35, gain: 0.06, highpass: 800, lowpass: 3500, delay: 0.05 });
    this.hissTail({ duration: 0.2, gain: 0.04, highpass: 2500, lowpass: 6000, delay: 0.1 });
  }

  playExplosionRail() {
    // ELECTROMAGNETIC IMPACT: ultra-sharp crack + ionization burst + EMP shockwave + sizzle
    // Initial crack transient
    this.tone({ frequency: 5000, duration: 0.008, type: 'square', gain: 0.14 });
    this.tone({ frequency: 9000, duration: 0.005, type: 'sine', gain: 0.08, delay: 0.001 });
    this.subBoom({ frequency: 80, freqEnd: 25, duration: 0.3, gain: 0.2, drive: 24 });
    this.distortedTone({ frequency: 220, freqEnd: 50, duration: 0.15, type: 'sawtooth', gain: 0.12, drive: 22 });
    // Ionization burst
    this.sweep({ from: 5000, to: 300, duration: 0.08, type: 'sawtooth', gain: 0.08 });
    this.sweep({ from: 2500, to: 100, duration: 0.12, type: 'square', gain: 0.06, delay: 0.01 });
    this.shapedNoise({
      duration: 0.12, gain: 0.1,
      bands: [
        { freq: 300, Q: 1 },
        { freq: 3000, Q: 2, bandGain: 0.7 },
        { freq: 7000, Q: 3, bandGain: 0.4 },
        { freq: 10000, Q: 2.5, bandGain: 0.2 }
      ]
    });
    // EMP shockwave ring
    this.chorusTone({ frequency: 240, duration: 0.18, type: 'sine', gain: 0.05, detuneCents: 60, delay: 0.015 });
    this.resonantBody({ frequencies: [100, 200, 400], Q: 6, duration: 0.15, gain: 0.05, delay: 0.01 });
    // Ionization sizzle tail
    this.hissTail({ duration: 0.3, gain: 0.06, highpass: 3000, lowpass: 10000, delay: 0.03 });
    this.hissTail({ duration: 0.2, gain: 0.04, highpass: 5000, lowpass: 12000, delay: 0.06 });
    this.noiseBurst({ duration: 0.1, gain: 0.06, highpass: 200, lowpass: 2000, delay: 0.015 });
  }

  // ── Per-weapon HIT sounds ─────────────────────────────────────────────────

  playHit(damage, weapon) {
    const id = weapon?.id;
    const intensity = Math.min(1, damage / 60);

    // Heavy metallic hull impact – FEEL the hit
    this.subBoom({
      frequency: 60 + intensity * 40,
      freqEnd: 20,
      duration: 0.12 + intensity * 0.1,
      gain: 0.1 + intensity * 0.08,
      drive: 14 + intensity * 10
    });
    this.resonantBody({
      frequencies: [320 + intensity * 200, 640 + intensity * 300, 1100 + intensity * 400],
      Q: 10 + intensity * 8,
      duration: 0.08 + intensity * 0.06,
      gain: 0.05 + intensity * 0.04
    });
    this.distortedTone({
      frequency: 200 + intensity * 180,
      freqEnd: 60,
      duration: 0.08 + intensity * 0.04,
      type: 'square',
      gain: 0.06 + intensity * 0.05,
      drive: 10 + intensity * 8
    });
    // Impact noise burst
    this.noiseBurst({
      duration: 0.06 + intensity * 0.04,
      gain: 0.04 + intensity * 0.04,
      highpass: 200,
      lowpass: 2500 + intensity * 2000,
      delay: 0.003
    });

    // Weapon-specific hit character
    if (id === 'mortar') {
      this.distortedTone({ frequency: 80, freqEnd: 25, duration: 0.14, type: 'sawtooth', gain: 0.08, drive: 16, delay: 0.005 });
      this.noiseBurst({ duration: 0.1, gain: 0.05, highpass: 80, lowpass: 600, delay: 0.008 });
    } else if (id === 'rail') {
      this.tone({ frequency: 3200, duration: 0.015, type: 'sine', gain: 0.06 });
      this.sweep({ from: 2400, to: 300, duration: 0.05, type: 'sine', gain: 0.04, delay: 0.003 });
      this.hissTail({ duration: 0.08, gain: 0.03, highpass: 3000, lowpass: 8000, delay: 0.01 });
    } else if (id === 'split' || id === 'splitstorm') {
      this.tone({ frequency: 1400, duration: 0.03, type: 'sine', gain: 0.04, delay: 0.003 });
      this.tone({ frequency: 2100, duration: 0.02, type: 'sine', gain: 0.025, delay: 0.008 });
    } else if (id === 'bouncer' || id === 'hopper') {
      this.resonantBody({ frequencies: [800, 1600, 2400], Q: 16, duration: 0.05, gain: 0.03, delay: 0.005 });
    }
  }

  // ── Per-weapon BOUNCE sounds ──────────────────────────────────────────────

  playBounce(weapon) {
    const id = weapon?.id;
    if (id === 'hopper') {
      // Heavy mine impact: brutal clank + ground thud + rattle
      this.subBoom({ frequency: 70, freqEnd: 30, duration: 0.08, gain: 0.1, drive: 14 });
      this.distortedTone({ frequency: 200, freqEnd: 80, duration: 0.06, type: 'square', gain: 0.08, drive: 12 });
      this.resonantBody({ frequencies: [460, 920, 1380, 1840], Q: 16, duration: 0.06, gain: 0.05, delay: 0.004 });
      this.noiseBurst({ duration: 0.04, gain: 0.04, highpass: 400, lowpass: 3000 });
      this.noiseBurst({ duration: 0.03, gain: 0.03, highpass: 1200, lowpass: 5000, delay: 0.01 });
    } else {
      // Bouncer: hard rubber-steel impact + spring twang + ring
      this.subBoom({ frequency: 80, freqEnd: 35, duration: 0.06, gain: 0.08, drive: 10 });
      this.sweep({ from: 2200, to: 400, duration: 0.05, type: 'sine', gain: 0.06 });
      this.sweep({ from: 1100, to: 250, duration: 0.07, type: 'triangle', gain: 0.04, delay: 0.008 });
      this.tone({ frequency: 600, duration: 0.05, type: 'triangle', gain: 0.05, delay: 0.008 });
      this.resonantBody({ frequencies: [340, 680, 1020], Q: 18, duration: 0.06, gain: 0.04 });
      this.noiseBurst({ duration: 0.03, gain: 0.035, highpass: 500, lowpass: 4000 });
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
