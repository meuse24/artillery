import Phaser from 'phaser';
import titleSongUrl from '../../../cratercommand.ogg?url';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants.js';
import { SCENE_KEYS } from '../config/sceneContracts.js';
import { setBattleSongVolumeLevel, stopBattleSong } from '../systems/BattleSongManager.js';
import { loadLaunchPreferences, saveLaunchPreferences } from '../systems/LaunchPreferencesStore.js';
import {
  playTitleSong,
  setTitleSongSource,
  setTitleSongVolumeLevel,
  stopTitleSong
} from '../systems/TitleSongManager.js';
import {
  adjustBootPreferenceLevel,
  getBootUiPingConfig,
  getBootOrientationState,
  getBootPreferenceViewModel,
  isBootGameSceneReady,
  shouldPlayBootUiPing,
  toggleBootPreference
} from './bootSceneModel.js';
import {
  distributeVerticalSections,
  getBootScreenMetrics
} from '../ui/screenLayoutModel.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.BOOT);
  }

  create() {
    this.startPreferences = loadLaunchPreferences();
    this.bootOrientationState = getBootOrientationState();
    this.applyAudioMixPreferences();
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

    this.bootKicker = this.add
      .text(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5 - 172, 'ARCADE TANK DUEL', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#7fe7dc',
        letterSpacing: 3
      })
      .setOrigin(0.5)
      .setDepth(501);

    this.bootTitle = this.add
      .text(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5 - 108, 'CRATER COMMAND', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '78px',
        fontStyle: 'bold',
        color: '#f2b84b'
      })
      .setOrigin(0.5)
      .setDepth(501)
      .setStroke('#1a1208', 7);

    this.bootIntro = this.add
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

    this.musicButton = this.createToggleButton(GAME_WIDTH * 0.5 - 148, GAME_HEIGHT * 0.5 + 120, 0x173226, 0x8fe3bf);
    this.sfxButton = this.createToggleButton(GAME_WIDTH * 0.5 + 148, GAME_HEIGHT * 0.5 + 120, 0x332417, 0xffcf8a);
    this.musicText = this.createToggleText(GAME_WIDTH * 0.5 - 148, GAME_HEIGHT * 0.5 + 120);
    this.sfxText = this.createToggleText(GAME_WIDTH * 0.5 + 148, GAME_HEIGHT * 0.5 + 120);

    [this.musicButton, this.musicText].forEach((item) => {
      item.setInteractive({ useHandCursor: true }).on('pointerdown', (pointer, _lx, _ly, event) => {
        event?.stopPropagation();
        this.adjustLevelPreference('musicVolume', pointer.worldX < this.musicButton.x ? -1 : 1);
      })
        .on('pointerover', () => this.musicButton.setStrokeStyle(1.5, 0x8fe3bf, 0.46))
        .on('pointerout', () => this.updatePreferenceLabels());
    });
    [this.sfxButton, this.sfxText].forEach((item) => {
      item.setInteractive({ useHandCursor: true }).on('pointerdown', (pointer, _lx, _ly, event) => {
        event?.stopPropagation();
        this.adjustLevelPreference('sfxVolume', pointer.worldX < this.sfxButton.x ? -1 : 1);
      })
        .on('pointerover', () => this.sfxButton.setStrokeStyle(1.5, 0xffcf8a, 0.46))
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
    this.orientationHint = this.add
      .text(
        GAME_WIDTH * 0.5,
        GAME_HEIGHT * 0.5 + 118,
        '',
        {
          fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
          fontSize: '18px',
          color: '#ffd995',
          align: 'center',
          lineSpacing: 6,
          wordWrap: { width: 580 }
        }
      )
      .setOrigin(0.5)
      .setDepth(502)
      .setVisible(false);

    [this.startButton, this.startLabel].forEach((item) => {
      item.on('pointerdown', (_pointer, _lx, _ly, event) => {
        event?.stopPropagation();
        this.startFromBoot();
      });
    });

    this.startButton
      .on('pointerover', () => {
        if (!this.bootOrientationState?.startBlocked) {
          this.startButton.setFillStyle(0xf2b84b, 0.42);
        }
      })
      .on('pointerout', () => this.updateLaunchAvailability());

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

    this.input.keyboard?.on('keydown-F', () => this.togglePreference('fullscreen'));
    this.input.keyboard?.on('keydown-S', () => this.togglePreference('sound'));
    this.input.keyboard?.on('keydown-Q', () => this.adjustLevelPreference('musicVolume', -1));
    this.input.keyboard?.on('keydown-W', () => this.adjustLevelPreference('musicVolume', 1));
    this.input.keyboard?.on('keydown-A', () => this.adjustLevelPreference('sfxVolume', -1));
    this.input.keyboard?.on('keydown-D', () => this.adjustLevelPreference('sfxVolume', 1));
    this.input.keyboard?.on('keydown-ENTER', () => this.startFromBoot());
    this.input.keyboard?.on('keydown-SPACE', () => this.startFromBoot());
    this.bindViewportWatchers();

    this.updatePreferenceLabels();
    this.updateLaunchAvailability();
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
    const hotkeyY = this.bootHotkeyY ?? (GAME_HEIGHT * 0.5 + 224);
    const gap = this.bootHotkeyGap ?? 10;
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

  layoutBootOverlay() {
    const viewport = this.getViewportSize();
    const metrics = getBootScreenMetrics({
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      showOrientationHint: Boolean(this.bootOrientationState?.startBlocked)
    });
    const sections = [
      {
        key: 'kicker',
        height: Math.max(18, Math.round(metrics.kickerFontPx * 1.45))
      },
      {
        key: 'title',
        height: Math.max(72, Math.round(metrics.titleFontPx * 1.18))
      },
      {
        key: 'intro',
        height: Math.max(
          Math.round(metrics.introFontPx * 2.4 + metrics.introLineSpacing),
          Math.round(this.bootIntro.displayHeight || 0)
        )
      },
      {
        key: 'toggles',
        height: metrics.toggleHeight
      },
      {
        key: 'audioLevels',
        height: metrics.toggleHeight
      },
      ...(this.bootOrientationState?.startBlocked
        ? [{
          key: 'hint',
          height: Math.max(
            46,
            Math.round(metrics.hintFontPx * 2.6 + metrics.hintLineSpacing)
          )
        }]
        : []),
      {
        key: 'start',
        height: metrics.startButtonHeight
      },
      {
        key: 'hotkeys',
        height: Math.max(20, Math.round(metrics.hotkeyFontPx * 2.05))
      }
    ];
    const layout = distributeVerticalSections({
      top: metrics.topPad,
      height: GAME_HEIGHT - metrics.topPad - metrics.bottomPad,
      sections,
      minGap: metrics.minGap,
      maxGap: metrics.maxGap
    });

    this.bootKicker.setFontSize(`${metrics.kickerFontPx}px`);
    this.bootTitle.setFontSize(`${metrics.titleFontPx}px`);
    this.bootTitle.setStroke('#1a1208', Math.max(5, Math.round(metrics.titleFontPx * 0.09)));
    this.bootIntro.setFontSize(`${metrics.introFontPx}px`);
    this.bootIntro.setLineSpacing(metrics.introLineSpacing);
    this.bootIntro.setWordWrapWidth(metrics.introWrapWidth, true);
    this.fullscreenButton.width = metrics.toggleWidth;
    this.fullscreenButton.height = metrics.toggleHeight;
    this.soundButton.width = metrics.toggleWidth;
    this.soundButton.height = metrics.toggleHeight;
    this.musicButton.width = metrics.toggleWidth;
    this.musicButton.height = metrics.toggleHeight;
    this.sfxButton.width = metrics.toggleWidth;
    this.sfxButton.height = metrics.toggleHeight;
    this.fullscreenText.setFontSize(`${metrics.toggleFontPx}px`);
    this.soundText.setFontSize(`${metrics.toggleFontPx}px`);
    this.musicText.setFontSize(`${metrics.toggleFontPx}px`);
    this.sfxText.setFontSize(`${metrics.toggleFontPx}px`);
    this.startButton.width = metrics.startButtonWidth;
    this.startButton.height = metrics.startButtonHeight;
    this.startLabel.setFontSize(`${metrics.startFontPx}px`);
    this.orientationHint.setWordWrapWidth(metrics.hintWrapWidth, true);
    this.orientationHint.setFontSize(`${metrics.hintFontPx}px`);
    this.orientationHint.setLineSpacing(metrics.hintLineSpacing);
    this.hotkeyPrefix.setFontSize(`${Math.max(12, metrics.hotkeyFontPx - 1)}px`);
    this.hotkeyFullscreen.setFontSize(`${metrics.hotkeyFontPx}px`);
    this.hotkeySound.setFontSize(`${metrics.hotkeyFontPx}px`);
    this.hotkeyStart.setFontSize(`${metrics.hotkeyFontPx}px`);

    this.bootKicker.setPosition(GAME_WIDTH * 0.5, layout.positions.kicker ?? this.bootKicker.y);
    this.bootTitle.setPosition(GAME_WIDTH * 0.5, layout.positions.title ?? this.bootTitle.y);
    this.bootIntro.setPosition(GAME_WIDTH * 0.5, layout.positions.intro ?? this.bootIntro.y);
    this.fullscreenButton.setPosition(GAME_WIDTH * 0.5 - 148, layout.positions.toggles ?? this.fullscreenButton.y);
    this.soundButton.setPosition(GAME_WIDTH * 0.5 + 148, layout.positions.toggles ?? this.soundButton.y);
    this.fullscreenText.setPosition(this.fullscreenButton.x, this.fullscreenButton.y);
    this.soundText.setPosition(this.soundButton.x, this.soundButton.y);
    this.musicButton.setPosition(GAME_WIDTH * 0.5 - 148, layout.positions.audioLevels ?? this.musicButton.y);
    this.sfxButton.setPosition(GAME_WIDTH * 0.5 + 148, layout.positions.audioLevels ?? this.sfxButton.y);
    this.musicText.setPosition(this.musicButton.x, this.musicButton.y);
    this.sfxText.setPosition(this.sfxButton.x, this.sfxButton.y);
    this.orientationHint.setPosition(GAME_WIDTH * 0.5, layout.positions.hint ?? (layout.positions.start ?? this.startButton.y) - 40);
    this.startButton.setPosition(GAME_WIDTH * 0.5, layout.positions.start ?? this.startButton.y);
    this.startLabel.setPosition(this.startButton.x, this.startButton.y);
    this.bootHotkeyY = layout.positions.hotkeys ?? this.bootHotkeyY;
    this.bootHotkeyGap = metrics.hotkeyGap;
    this.layoutBootHotkeys();
  }

  togglePreference(key) {
    const nextPreferences = toggleBootPreference(this.startPreferences, key);
    if (nextPreferences === this.startPreferences) {
      return;
    }

    this.startPreferences = nextPreferences;
    this.startPreferences = saveLaunchPreferences(this.startPreferences);
    this.applyAudioMixPreferences();
    if (key === 'sound') {
      if (this.startPreferences.sound) {
        playTitleSong();
        this.playUiPing(getBootUiPingConfig('sound-on'));
      } else {
        stopTitleSong();
        stopBattleSong();
        this.silenceUiAudioContext();
      }
    } else {
      this.playUiPing(getBootUiPingConfig('fullscreen-toggle'));
    }
    this.updatePreferenceLabels();
  }

  adjustLevelPreference(key, direction) {
    const nextPreferences = adjustBootPreferenceLevel(this.startPreferences, key, direction);
    if (nextPreferences === this.startPreferences) {
      return;
    }

    this.startPreferences = nextPreferences;
    this.startPreferences = saveLaunchPreferences(this.startPreferences);
    this.applyAudioMixPreferences();
    if (this.startPreferences.sound && this.startPreferences.sfxVolume > 0) {
      this.playUiPing(getBootUiPingConfig('default'));
    } else if (key === 'sfxVolume' && this.startPreferences.sfxVolume <= 0) {
      this.silenceUiAudioContext();
    }
    this.updatePreferenceLabels();
  }

  updatePreferenceLabels() {
    const model = getBootPreferenceViewModel(this.startPreferences);

    this.fullscreenText.setText(model.fullscreenText);
    this.soundText.setText(model.soundText);
    this.musicText.setText(model.musicText);
    this.sfxText.setText(model.sfxText);

    this.fullscreenButton.setFillStyle(model.fullscreenFill, 0.9);
    this.fullscreenButton.setStrokeStyle(1.5, 0x7fe7dc, model.fullscreenStrokeAlpha);
    this.soundButton.setFillStyle(model.soundFill, 0.9);
    this.soundButton.setStrokeStyle(1.5, 0xf2b84b, model.soundStrokeAlpha);
    this.musicButton.setFillStyle(model.musicFill, 0.9);
    this.musicButton.setStrokeStyle(1.5, 0x8fe3bf, model.musicStrokeAlpha);
    this.sfxButton.setFillStyle(model.sfxFill, 0.9);
    this.sfxButton.setStrokeStyle(1.5, 0xffcf8a, model.sfxStrokeAlpha);
    this.fullscreenText.setColor(model.fullscreenTextColor);
    this.soundText.setColor(model.soundTextColor);
    this.musicText.setColor(model.musicTextColor);
    this.sfxText.setColor(model.sfxTextColor);
  }

  getViewportSize() {
    const parent = this.scale?.parentSize;
    if (typeof window === 'undefined') {
      return {
        width: parent?.width ?? GAME_WIDTH,
        height: parent?.height ?? GAME_HEIGHT
      };
    }
    const viewport = window.visualViewport;
    return {
      width: parent?.width ?? viewport?.width ?? window.innerWidth ?? GAME_WIDTH,
      height: parent?.height ?? viewport?.height ?? window.innerHeight ?? GAME_HEIGHT
    };
  }

  bindViewportWatchers() {
    if (typeof window === 'undefined') {
      return;
    }
    this.handleViewportChange = () => this.updateLaunchAvailability();
    window.addEventListener('resize', this.handleViewportChange);
    window.addEventListener('orientationchange', this.handleViewportChange);
    this.scale?.on('resize', this.handleViewportChange);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unbindViewportWatchers());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.unbindViewportWatchers());
  }

  unbindViewportWatchers() {
    if (!this.handleViewportChange || typeof window === 'undefined') {
      return;
    }
    window.removeEventListener('resize', this.handleViewportChange);
    window.removeEventListener('orientationchange', this.handleViewportChange);
    this.scale?.off('resize', this.handleViewportChange);
    this.handleViewportChange = null;
  }

  updateLaunchAvailability() {
    this.bootOrientationState = getBootOrientationState({
      isTouchDevice: Boolean(this.sys.game.device.input.touch),
      ...this.getViewportSize()
    });

    if (!this.orientationHint) {
      return;
    }

    const blocked = this.bootOrientationState.startBlocked;
    this.orientationHint.setText(this.bootOrientationState.hint);
    this.orientationHint.setVisible(blocked);
    this.orientationHint.setAlpha(blocked ? 1 : 0);
    this.layoutBootOverlay();
    this.startButton.setFillStyle(0xf2b84b, blocked ? 0.14 : 0.32);
    this.startButton.setStrokeStyle(2, 0xf2b84b, blocked ? 0.22 : 0.64);
    this.startLabel.setColor(blocked ? '#b6a58b' : '#fff3d1');
    this.startLabel.setAlpha(blocked ? 0.78 : 1);
    this.hotkeyStart?.setAlpha(blocked ? 0.5 : 1);
  }

  pulseOrientationHint() {
    if (!this.orientationHint?.visible) {
      return;
    }
    this.tweens.killTweensOf(this.orientationHint);
    this.orientationHint.setAlpha(0.7);
    this.tweens.add({
      targets: this.orientationHint,
      alpha: 1,
      duration: 120,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.InOut'
    });
  }

  startFromBoot() {
    this.updateLaunchAvailability();
    if (this.bootOrientationState?.startBlocked) {
      this.playUiPing(getBootUiPingConfig('blocked-start'));
      this.pulseOrientationHint();
      return;
    }

    this.startPreferences = saveLaunchPreferences(this.startPreferences);
    this.playUiPing(getBootUiPingConfig('start'));

    // Transition effect: Fade out all BootScene elements
    this.cameras.main.fadeOut(400, 5, 9, 15);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (this.startPreferences.sound) {
        playTitleSong();
      } else {
        stopTitleSong();
        stopBattleSong();
        this.silenceUiAudioContext();
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
    const ready = isBootGameSceneReady(gameScene);
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
    gameScene.setStartPreference?.('musicVolume', this.startPreferences.musicVolume);
    gameScene.setStartPreference?.('sfxVolume', this.startPreferences.sfxVolume);
    gameScene.applyStartPreferences?.({ requestFullscreen: false });
    gameScene.syncHud?.();
    this.scene.remove(SCENE_KEYS.BOOT);
  }

  applyAudioMixPreferences() {
    setTitleSongVolumeLevel(this.startPreferences?.musicVolume);
    setBattleSongVolumeLevel(this.startPreferences?.musicVolume);
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

  playUiPing({ frequency = 500, duration = 0.05, gain = 0.012, type = 'triangle' } = {}) {
    if (!shouldPlayBootUiPing(this.startPreferences)) {
      this.silenceUiAudioContext();
      return;
    }
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

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startAt);
    amp.gain.setValueAtTime(0.0001, startAt);
    const scaledGain = gain * (this.startPreferences?.sfxVolume ?? 1);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, scaledGain), startAt + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    osc.connect(amp);
    amp.connect(context.destination);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.02);
  }

  silenceUiAudioContext() {
    if (!this.uiAudioContext || this.uiAudioContext.state === 'closed') {
      return;
    }
    if (this.uiAudioContext.state === 'running') {
      this.uiAudioContext.suspend().catch(() => {});
    }
  }
}
