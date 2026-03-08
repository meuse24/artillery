import Phaser from 'phaser';
import titleSongUrl from '../../../cratercommand.ogg?url';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants.js';
import { SCENE_KEYS } from '../config/sceneContracts.js';
import { loadLaunchPreferences, saveLaunchPreferences } from '../systems/LaunchPreferencesStore.js';
import { playTitleSong, setTitleSongSource, stopTitleSong } from '../systems/TitleSongManager.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.BOOT);
  }

  create() {
    this.startPreferences = loadLaunchPreferences();
    setTitleSongSource(titleSongUrl);
    if (!this.startPreferences.sound) {
      stopTitleSong();
    }

    this.createParticleTexture();
    this.createBootOverlay();
  }

  createParticleTexture() {
    if (this.textures.exists('particle-dot')) {
      return;
    }

    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(6, 6, 6);
    graphics.generateTexture('particle-dot', 12, 12);
    graphics.destroy();
  }

  createBootOverlay() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x05090f, 1)
      .setOrigin(0, 0)
      .setDepth(0);

    this.createLaunchAtmosphere();

    this.add
      .text(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5 - 172, 'ARCADE TANK DUEL', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#7fe7dc',
        letterSpacing: 3
      })
      .setOrigin(0.5)
      .setDepth(501);

    this.add
      .text(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5 - 108, 'CRATER COMMAND', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '78px',
        fontStyle: 'bold',
        color: '#f2b84b'
      })
      .setOrigin(0.5)
      .setDepth(501)
      .setStroke('#1a1208', 7);

    this.add
      .text(
        GAME_WIDTH * 0.5,
        GAME_HEIGHT * 0.5 - 24,
        'Prepare launch.\nSelect launch options and press START.',
        {
          fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
          fontSize: '23px',
          color: '#f4f1df',
          align: 'center',
          lineSpacing: 10
        }
      )
      .setOrigin(0.5)
      .setDepth(501);

    this.fullscreenButton = this.createToggleButton(GAME_WIDTH * 0.5 - 148, GAME_HEIGHT * 0.5 + 76, 0x102632, 0x7fe7dc);
    this.soundButton = this.createToggleButton(GAME_WIDTH * 0.5 + 148, GAME_HEIGHT * 0.5 + 76, 0x2b2418, 0xf2b84b);
    this.fullscreenText = this.createToggleText(GAME_WIDTH * 0.5 - 148, GAME_HEIGHT * 0.5 + 76);
    this.soundText = this.createToggleText(GAME_WIDTH * 0.5 + 148, GAME_HEIGHT * 0.5 + 76);

    [this.fullscreenButton, this.fullscreenText].forEach((item) => {
      item.setInteractive({ useHandCursor: true }).on('pointerdown', (_pointer, _lx, _ly, event) => {
        event?.stopPropagation();
        this.togglePreference('fullscreen');
      })
        .on('pointerover', () => this.fullscreenButton.setStrokeStyle(1.5, 0x7fe7dc, 0.46))
        .on('pointerout', () => this.updatePreferenceLabels());
    });
    [this.soundButton, this.soundText].forEach((item) => {
      item.setInteractive({ useHandCursor: true }).on('pointerdown', (_pointer, _lx, _ly, event) => {
        event?.stopPropagation();
        this.togglePreference('sound');
      })
        .on('pointerover', () => this.soundButton.setStrokeStyle(1.5, 0xf2b84b, 0.46))
        .on('pointerout', () => this.updatePreferenceLabels());
    });

    this.startButton = this.add
      .rectangle(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5 + 156, 470, 64, 0xf2b84b, 0.32)
      .setStrokeStyle(2, 0xf2b84b, 0.64)
      .setDepth(501)
      .setInteractive({ useHandCursor: true });
    this.startLabel = this.add
      .text(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5 + 156, 'START', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#fff3d1'
      })
      .setOrigin(0.5)
      .setDepth(502)
      .setInteractive({ useHandCursor: true });

    [this.startButton, this.startLabel].forEach((item) => {
      item.on('pointerdown', (_pointer, _lx, _ly, event) => {
        event?.stopPropagation();
        this.startFromBoot();
      });
    });

    this.startButton
      .on('pointerover', () => this.startButton.setFillStyle(0xf2b84b, 0.42))
      .on('pointerout', () => this.startButton.setFillStyle(0xf2b84b, 0.32));

    this.hotkeyPrefix = this.add
      .text(0, 0, 'HOTKEYS', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#b7c7d0'
      })
      .setOrigin(0.5)
      .setDepth(501);
    this.hotkeyFullscreen = this.createHotkeyChip('(F) FULLSCREEN', '#7fe7dc', () => this.togglePreference('fullscreen'));
    this.hotkeySound = this.createHotkeyChip('(S) SOUND', '#f2b84b', () => this.togglePreference('sound'));
    this.hotkeyStart = this.createHotkeyChip('(ENTER)/(SPACE) START', '#ffd995', () => this.startFromBoot());
    this.layoutBootHotkeys();

    this.input.keyboard?.on('keydown-F', () => this.togglePreference('fullscreen'));
    this.input.keyboard?.on('keydown-S', () => this.togglePreference('sound'));
    this.input.keyboard?.on('keydown-ENTER', () => this.startFromBoot());
    this.input.keyboard?.on('keydown-SPACE', () => this.startFromBoot());

    this.updatePreferenceLabels();
  }

  createLaunchAtmosphere() {
    const radarX = GAME_WIDTH * 0.5;
    const radarY = GAME_HEIGHT * 0.5 + 10;
    const fogTop = this.add
      .rectangle(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5 - 150, GAME_WIDTH + 140, 94, 0x13293a, 0.45)
      .setDepth(1);
    const fogBottom = this.add
      .rectangle(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5 + 164, GAME_WIDTH + 120, 88, 0x2b2a22, 0.42)
      .setDepth(1);
    this.tweens.add({
      targets: fogTop,
      x: GAME_WIDTH * 0.5 + 36,
      duration: 2800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });
    this.tweens.add({
      targets: fogBottom,
      x: GAME_WIDTH * 0.5 - 42,
      duration: 3200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });

    const radarBase = this.add.circle(radarX, radarY, 162, 0x143446, 0.32).setDepth(2);
    this.add.circle(radarX, radarY, 120, 0x7fe7dc, 0.12).setDepth(2);
    this.add.circle(radarX, radarY, 84, 0x7fe7dc, 0.12).setDepth(2);
    this.add.circle(radarX, radarY, 48, 0x7fe7dc, 0.12).setDepth(2);
    this.add.circle(radarX, radarY, 4, 0x7fe7dc, 0.62).setDepth(3);
    this.tweens.add({
      targets: radarBase,
      alpha: 0.44,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });

    this.radarSweep = this.add
      .rectangle(radarX, radarY, 2, 148, 0x7fe7dc, 0.72)
      .setOrigin(0.5, 1)
      .setDepth(4);
    this.tweens.add({
      targets: this.radarSweep,
      rotation: Math.PI * 2,
      duration: 2400,
      repeat: -1,
      ease: 'Linear'
    });

    const hull = this.add.rectangle(radarX, GAME_HEIGHT * 0.5 + 18, 224, 22, 0x8a6a4b, 0.62).setDepth(2);
    const turret = this.add.rectangle(radarX + 24, GAME_HEIGHT * 0.5 + 4, 92, 16, 0xb39068, 0.62).setDepth(2);
    const barrel = this.add.rectangle(radarX + 94, GAME_HEIGHT * 0.5 - 1, 56, 6, 0xb39068, 0.62).setDepth(2);
    const track = this.add.rectangle(radarX, GAME_HEIGHT * 0.5 + 33, 248, 10, 0x2f251b, 0.76).setDepth(2);
    this.tweens.add({
      targets: [hull, turret, barrel, track],
      alpha: 0.8,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut'
    });
  }

  createToggleButton(x, y, fillColor, strokeColor) {
    return this.add
      .rectangle(x, y, 252, 34, fillColor, 0.9)
      .setStrokeStyle(1.5, strokeColor, 0.24)
      .setDepth(501);
  }

  createToggleText(x, y) {
    return this.add
      .text(x, y, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#d9e4ea',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(502);
  }

  createHotkeyChip(label, color, onPress) {
    const chip = this.add
      .text(0, 0, label, {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color,
        backgroundColor: 'rgba(11,22,30,0.88)',
        padding: { x: 10, y: 5 }
      })
      .setOrigin(0.5)
      .setDepth(502)
      .setInteractive({ useHandCursor: true });

    chip
      .on('pointerdown', (_pointer, _lx, _ly, event) => {
        event?.stopPropagation();
        onPress?.();
      })
      .on('pointerover', () => chip.setBackgroundColor('rgba(26,48,63,0.96)'))
      .on('pointerout', () => chip.setBackgroundColor('rgba(11,22,30,0.88)'));

    return chip;
  }

  layoutBootHotkeys() {
    const hotkeyY = GAME_HEIGHT * 0.5 + 224;
    const gap = 10;
    const items = [
      this.hotkeyPrefix,
      this.hotkeyFullscreen,
      this.hotkeySound,
      this.hotkeyStart
    ];
    const totalWidth = items.reduce((sum, item) => sum + item.displayWidth, 0) + gap * (items.length - 1);
    let cursor = GAME_WIDTH * 0.5 - totalWidth * 0.5;
    items.forEach((item) => {
      item.setPosition(cursor + item.displayWidth * 0.5, hotkeyY);
      cursor += item.displayWidth + gap;
    });
  }

  togglePreference(key) {
    if (!(key in this.startPreferences)) {
      return;
    }
    this.startPreferences[key] = !this.startPreferences[key];
    this.startPreferences = saveLaunchPreferences(this.startPreferences);
    this.playUiPing({
      frequency: key === 'sound' ? 560 : 430,
      duration: 0.045,
      gain: 0.013
    });
    if (key === 'sound') {
      if (this.startPreferences.sound) {
        playTitleSong();
      } else {
        stopTitleSong();
      }
    }
    this.updatePreferenceLabels();
  }

  updatePreferenceLabels() {
    const fullscreenOn = this.startPreferences.fullscreen;
    const soundOn = this.startPreferences.sound;

    this.fullscreenText.setText(`(F) Fullscreen: ${fullscreenOn ? 'ON' : 'OFF'}`);
    this.soundText.setText(`(S) Sound: ${soundOn ? 'ON' : 'OFF'}`);

    this.fullscreenButton.setFillStyle(fullscreenOn ? 0x183e53 : 0x17222c, 0.9);
    this.fullscreenButton.setStrokeStyle(1.5, 0x7fe7dc, fullscreenOn ? 0.34 : 0.16);
    this.soundButton.setFillStyle(soundOn ? 0x3f311e : 0x1f252c, 0.9);
    this.soundButton.setStrokeStyle(1.5, 0xf2b84b, soundOn ? 0.34 : 0.16);
    this.fullscreenText.setColor(fullscreenOn ? '#dff9f5' : '#a0b4bf');
    this.soundText.setColor(soundOn ? '#ffe3b2' : '#acaba1');
  }

  startFromBoot() {
    this.startPreferences = saveLaunchPreferences(this.startPreferences);
    this.playUiPing({ frequency: 690, duration: 0.07, gain: 0.014 });

    // Transition effect: Fade out all BootScene elements
    this.cameras.main.fadeOut(400, 5, 9, 15);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (this.startPreferences.sound) {
        playTitleSong();
      } else {
        stopTitleSong();
      }

      if (
        this.startPreferences.fullscreen &&
        this.scale &&
        !this.scale.isFullscreen
      ) {
        try {
          const request = this.scale.startFullscreen();
          if (request?.catch) {
            request.catch(() => {
              this.startPreferences.fullscreen = false;
              this.startPreferences = saveLaunchPreferences(this.startPreferences);
            });
          }
        } catch {
          this.startPreferences.fullscreen = false;
          this.startPreferences = saveLaunchPreferences(this.startPreferences);
        }
      }

      if (!this.scene.isActive(SCENE_KEYS.GAME)) {
        this.scene.launch(SCENE_KEYS.GAME);
      }
      if (!this.scene.isActive(SCENE_KEYS.UI)) {
        this.scene.launch(SCENE_KEYS.UI);
      }
      this.applyPreferencesToGameScene();
    });
  }

  applyPreferencesToGameScene(attempt = 0) {
    const gameScene = this.scene.get(SCENE_KEYS.GAME);
    const ready = Boolean(
      gameScene &&
      gameScene.players &&
      typeof gameScene.setStartPreference === 'function' &&
      typeof gameScene.applyStartPreferences === 'function'
    );
    if (!ready) {
      if (attempt < 12) {
        setTimeout(() => this.applyPreferencesToGameScene(attempt + 1), 16);
      } else {
        this.scene.remove(SCENE_KEYS.BOOT);
      }
      return;
    }

    if (!gameScene.startPreferences) {
      gameScene.startPreferences = { ...this.startPreferences };
    }
    gameScene.setStartPreference?.('fullscreen', this.startPreferences.fullscreen);
    gameScene.setStartPreference?.('sound', this.startPreferences.sound);
    gameScene.applyStartPreferences?.({ requestFullscreen: false });
    gameScene.syncHud?.();
    this.scene.remove(SCENE_KEYS.BOOT);
  }

  ensureUiAudioContext() {
    if (this.uiAudioContext) {
      return this.uiAudioContext;
    }
    if (typeof window === 'undefined') {
      return null;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) {
      return null;
    }
    try {
      this.uiAudioContext = new Ctor();
    } catch {
      this.uiAudioContext = null;
    }
    return this.uiAudioContext;
  }

  playUiPing({ frequency = 500, duration = 0.05, gain = 0.012 } = {}) {
    const context = this.ensureUiAudioContext();
    if (!context) {
      return;
    }
    if (context.state === 'suspended') {
      context.resume().catch(() => {});
    }
    const startAt = context.currentTime + 0.001;
    const osc = context.createOscillator();
    const amp = context.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, startAt);
    amp.gain.setValueAtTime(0.0001, startAt);
    amp.gain.exponentialRampToValueAtTime(gain, startAt + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    osc.connect(amp);
    amp.connect(context.destination);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.02);
  }
}
