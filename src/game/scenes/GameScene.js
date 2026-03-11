import Phaser from 'phaser';
import battleSongUrl from '../../../main.ogg?url';
import {
  AIM_TIME_LIMIT,
  AIM_SPEED,
  BARREL_LENGTH,
  GAME_HEIGHT,
  GAME_WIDTH,
  GRAVITY,
  MAX_PITCH,
  MIN_PITCH,
  MOVE_PER_TURN,
  MOVE_TIME_LIMIT,
  MOVE_SPEED,
  PLAYER_COLORS,
  PLAYER_NAMES,
  POWER_STEP,
  WIND_LIMIT
} from '../constants.js';
import { Tank } from '../entities/Tank.js';
import { ARCADE_CONFIG } from '../arcade/arcadeConfig.js';
import { ARCADE_EVENTS } from '../arcade/events.js';
import { AudioManager } from '../systems/AudioManager.js';
import { ArcadeEventBus } from '../systems/ArcadeEventBus.js';
import { ArcadeScoringSystem } from '../systems/ArcadeScoringSystem.js';
import { MutatorSystem } from '../systems/MutatorSystem.js';
import { OverlayStateSystem } from '../systems/OverlayStateSystem.js';
import { ScoreStore } from '../systems/ScoreStore.js';
import { Terrain } from '../systems/Terrain.js';
import { TelemetrySystem } from '../systems/TelemetrySystem.js';
import { playBattleSong, setBattleSongSource, stopBattleSong } from '../systems/BattleSongManager.js';
import { loadLaunchPreferences, saveLaunchPreferences } from '../systems/LaunchPreferencesStore.js';
import { playTitleSong, stopTitleSong } from '../systems/TitleSongManager.js';
import { InputController } from '../systems/InputController.js';
import { VisualFxPool } from '../systems/VisualFxPool.js';
import {
  getNextActivePlayerIndex,
  getNextWeaponIndex,
  shouldRailDrill,
  shouldSplitProjectile
} from '../systems/gameplayLogic.js';
import { WEAPONS, getWeapon } from '../weapons.js';
import { WeatherSystem } from '../systems/WeatherSystem.js';
import { GAME_SCENE_EVENTS, SCENE_KEYS } from '../config/sceneContracts.js';
import { resolveBackgroundMusicState } from './backgroundMusicModel.js';

const OBJECTIVE_TEXT = 'Reduce the enemy tank to 0 HP. Use wind and craters to create better shots.';
const ROUND_STAT_TEMPLATE = () => ({
  shots: 0,
  hits: 0,
  directHits: 0,
  damageDealt: 0,
  bestHit: 0
});

export class GameScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.GAME);
  }

  create() {
    this.createBackdrop();
    this.setupCoreSystems();
    this.setupRuntimeState();
    this.createFxLayers();
    this.setupInputHandlers();
    this.setupSceneLifecycle();
  }

  setupCoreSystems() {
    this.audioManager = new AudioManager();
    setBattleSongSource(battleSongUrl);
    this.scoreStore = new ScoreStore(PLAYER_NAMES);
    this.highscores = this.scoreStore.load();
    this.arcadeConfig = ARCADE_CONFIG;
    this.arcadeEvents = new ArcadeEventBus();
    this.arcadeScoring = new ArcadeScoringSystem({
      eventBus: this.arcadeEvents,
      config: this.arcadeConfig
    });
    this.mutatorSystem = new MutatorSystem({
      eventBus: this.arcadeEvents,
      config: this.arcadeConfig
    });
    this.telemetrySystem = new TelemetrySystem({
      eventBus: this.arcadeEvents
    });
    this.overlaySystem = new OverlayStateSystem(this, { objectiveText: OBJECTIVE_TEXT });
    this.fxPool = new VisualFxPool(this);
    this.installArcadeFeedback();
  }

  setupRuntimeState() {
    this.reducedMotion = this.arcadeConfig.accessibility.reducedMotionDefault;
    this.currentMode = 'cpu';
    this.startPreferences = loadLaunchPreferences();
    this.fullscreenEnabled = this.startPreferences.fullscreen;
    this.audioEnabled = this.startPreferences.sound;
    this.roundStats = this.createRoundStats();
    this.cpuState = null;
    this.ambientTime = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this.ambientAccumulator = 0;
    this.ambientStep = 1 / 30;
    this.stabilityAccumulator = 0;
    this.stabilityStep = 1 / 45;
    this.stabilityActive = true;
    this.activeTankDriving = false;
    this.moveDustCooldown = 0;
    this.predictionDirty = true;
    this.predictionVisible = false;
    this.cameraFocusTween = null;
    this.hitStopTimer = 0;
    this.terrain = new Terrain(this, GAME_WIDTH, GAME_HEIGHT);
    this.weather = new WeatherSystem(this);
    this.projectiles = [];
    this.mouseMoveTarget = null;
    this.touchAimState = null;
    this.mobileFullscreenRequested = false;
    this.pointerInputBlockUntil = 0;
    this.battleMusicActive = false;
  }

  blockPointerInput(durationMs = 160) {
    const now = this.time?.now ?? 0;
    this.pointerInputBlockUntil = Math.max(this.pointerInputBlockUntil ?? 0, now + durationMs);
  }

  createFxLayers() {
    // One emitter handles muzzle burst, split burst and explosion sparks.
    this.particles = this.add.particles(0, 0, 'particle-dot', {
      lifespan: 420,
      speed: { min: 30, max: 180 },
      scale: { start: 0.8, end: 0 },
      quantity: 0,
      emitting: false,
      blendMode: 'ADD'
    });
    this.particles.setDepth(60);
    this.fireParticles = this.add.particles(0, 0, 'particle-dot', {
      lifespan: { min: 150, max: 320 },
      speed: { min: 80, max: 280 },
      scale: { start: 1.4, end: 0 },
      quantity: 0,
      emitting: false,
      blendMode: 'ADD',
      tint: [0xfff0b8, 0xffb347, 0xff6b2e]
    });
    this.fireParticles.setDepth(60);
    this.emberParticles = this.add.particles(0, 0, 'particle-dot', {
      lifespan: { min: 280, max: 620 },
      speed: { min: 60, max: 240 },
      scale: { start: 0.9, end: 0 },
      quantity: 0,
      emitting: false,
      blendMode: 'ADD',
      tint: [0xffd089, 0xff9342, 0xff5c3a]
    });
    this.emberParticles.setDepth(59);
    this.smokeParticles = this.add.particles(0, 0, 'particle-dot', {
      lifespan: { min: 480, max: 900 },
      speed: { min: 18, max: 110 },
      scale: { start: 1.3, end: 2.3 },
      alpha: { start: 0.3, end: 0 },
      quantity: 0,
      emitting: false,
      blendMode: 'NORMAL',
      tint: [0x2b2320, 0x42332d, 0x5b4a3f]
    });
    this.smokeParticles.setDepth(56);

    this.prediction = this.add.graphics().setDepth(45);
    this.muzzleFlash = this.add.circle(0, 0, 8, 0xffd98c, 0).setDepth(55);
    this.windRibbon = this.add.graphics().setDepth(7);
    this.impactFlash = this.add
      .rectangle(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5, GAME_WIDTH, GAME_HEIGHT, 0xffe1a6, 0)
      .setDepth(95);
    this.impactFlash.setBlendMode(Phaser.BlendModes.ADD);
  }

  setupInputHandlers() {
    this.inputController = new InputController(this);
    this.inputController.bind();
  }

  setupSceneLifecycle() {
    this.installAudioUnlock();
    this.startMatch({ showTurnOverlay: false });
    this.showStartOverlay();

    this.scale.on('resize', () => {
      this.renderWindRibbon();
      this.drawArcadeGrade();
      this.syncHud();
    });
    this.events.once('shutdown', () => this.destroyArcadeSystems());
    this.events.once('destroy', () => this.destroyArcadeSystems());
  }

  destroyArcadeSystems() {
    this.audioManager?.setDrive(false, 0);
    if (this.inputController) {
      this.inputController.destroy();
      this.inputController = null;
    }
    if (this.arcadeFeedbackUnsubscribers) {
      this.arcadeFeedbackUnsubscribers.forEach((off) => off());
      this.arcadeFeedbackUnsubscribers = null;
    }
    if (this.arcadeScoring) {
      this.arcadeScoring.destroy();
      this.arcadeScoring = null;
    }
    if (this.mutatorSystem) {
      this.mutatorSystem.destroy();
      this.mutatorSystem = null;
    }
    if (this.telemetrySystem) {
      this.telemetrySystem.destroy();
      this.telemetrySystem = null;
    }
    if (this.arcadeEvents) {
      this.arcadeEvents.destroy();
      this.arcadeEvents = null;
    }
    if (this.fxPool) {
      this.fxPool.destroy();
      this.fxPool = null;
    }
    stopBattleSong();
    this.overlaySystem = null;
  }

  installArcadeFeedback() {
    if (!this.arcadeEvents) {
      return;
    }

    this.arcadeFeedbackUnsubscribers = [
      this.arcadeEvents.on(ARCADE_EVENTS.SKILLSHOT_AWARDED, ({ playerName, label }) => {
        this.showTurnBanner(`${playerName} ${label}`);
      }),
      this.arcadeEvents.on(ARCADE_EVENTS.COMBO_UPDATED, ({ playerName, multiplier }) => {
        if (multiplier > 1) {
          this.showTurnBanner(`${playerName} combo x${multiplier.toFixed(2)}`);
          if (multiplier >= 1.5) {
            this.spawnImpactCallout(
              GAME_WIDTH * 0.5,
              172,
              `${playerName} COMBO x${multiplier.toFixed(2)}`,
              '#fff0bf'
            );
          }
        }
      }),
      this.arcadeEvents.on(ARCADE_EVENTS.TURN_STARTED, ({ mutator }) => {
        if (mutator) {
          this.showTurnBanner(mutator);
        }
      })
    ];
  }

  isTouchPointer(pointer) {
    return Boolean(
      pointer?.wasTouch ||
      pointer?.pointerType === 'touch' ||
      pointer?.event?.pointerType === 'touch' ||
      pointer?.event?.type?.startsWith('touch')
    );
  }

  ensureMobileFullscreen() {
    if (this.mobileFullscreenRequested) return;
    if (!this.sys.game.device.input.touch) return;
    if (!this.fullscreenEnabled) return;
    this.mobileFullscreenRequested = true;

    if (!this.scale.isFullscreen) {
      try {
        this.scale.startFullscreen();
      } catch {
        // ignore fullscreen rejections (e.g. browser policy)
      }
    }

    try {
      if (screen.orientation?.lock) {
        const lockResult = screen.orientation.lock('landscape');
        if (lockResult?.catch) {
          lockResult.catch(() => {});
        }
      }
    } catch {
      // ignore orientation lock errors on unsupported browsers
    }
  }

  getMotionScale() {
    return this.reducedMotion ? this.arcadeConfig.accessibility.reducedMotionScale : 1;
  }

  toggleReducedMotion() {
    this.reducedMotion = !this.reducedMotion;
    this.showTurnBanner(this.reducedMotion ? 'Reduced motion ON' : 'Reduced motion OFF');
    this.syncHud();
  }

  triggerHitStop(duration = 0.06) {
    const scaledDuration = duration * this.getMotionScale();
    this.hitStopTimer = Math.max(this.hitStopTimer, scaledDuration);
  }

  installAudioUnlock() {
    this.audioUnlockHandler = () => {
      const unlocked = this.audioManager.unlock();
      if (!unlocked) {
        return;
      }

      window.removeEventListener('pointerdown', this.audioUnlockHandler, true);
      window.removeEventListener('mousedown', this.audioUnlockHandler, true);
      window.removeEventListener('touchstart', this.audioUnlockHandler, true);
      window.removeEventListener('keydown', this.audioUnlockHandler, true);
    };

    window.addEventListener('pointerdown', this.audioUnlockHandler, true);
    window.addEventListener('mousedown', this.audioUnlockHandler, true);
    window.addEventListener('touchstart', this.audioUnlockHandler, true);
    window.addEventListener('keydown', this.audioUnlockHandler, true);
  }

  focusCameraOn(x, y, duration = 280, zoom = 1.04) {
    const camera = this.cameras.main;
    if (this.cameraFocusTween) {
      this.cameraFocusTween.remove();
    }

    this.cameraFocusTween = this.tweens.addCounter({
      from: 0,
      to: 1,
      duration,
      ease: 'Sine.Out',
      onUpdate: (tween) => {
        const value = tween.getValue();
        camera.scrollX = Phaser.Math.Linear(camera.scrollX, Phaser.Math.Clamp(x - camera.width * 0.5, -24, 24), value);
        camera.scrollY = Phaser.Math.Linear(camera.scrollY, Phaser.Math.Clamp(y - camera.height * 0.5, -18, 18), value);
        camera.zoom = Phaser.Math.Linear(camera.zoom, zoom, value);
      }
    });
  }

  resetCameraFocus(duration = 360) {
    const camera = this.cameras.main;
    if (this.cameraFocusTween) {
      this.cameraFocusTween.remove();
    }

    this.cameraFocusTween = this.tweens.addCounter({
      from: 0,
      to: 1,
      duration,
      ease: 'Quad.Out',
      onUpdate: (tween) => {
        const value = tween.getValue();
        camera.scrollX = Phaser.Math.Linear(camera.scrollX, 0, value);
        camera.scrollY = Phaser.Math.Linear(camera.scrollY, 0, value);
        camera.zoom = Phaser.Math.Linear(camera.zoom, 1, value);
      }
    });
  }

  markPredictionDirty() {
    this.predictionDirty = true;
  }

  clearPrediction() {
    if (!this.predictionVisible && !this.predictionDirty) {
      return;
    }

    this.prediction.clear();
    this.predictionVisible = false;
    this.predictionDirty = false;
  }

  getModeLabel() {
    return this.currentMode === 'cpu' ? 'Solo vs CPU' : 'Local Duel';
  }

  getStartPreferences() {
    return { ...this.startPreferences };
  }

  setAudioEnabled(enabled) {
    this.audioEnabled = Boolean(enabled);
    this.audioManager?.setMuted(!this.audioEnabled);
    if (this.audioEnabled) {
      this.audioManager?.unlock();
      this.audioManager?.setWind(this.wind ?? 0);
      this.syncTitleMusicState(this.overlayState);
    } else {
      this.audioManager?.setDrive(false, 0);
      stopTitleSong();
      stopBattleSong();
    }
  }

  setFullscreenEnabled(enabled) {
    this.fullscreenEnabled = Boolean(enabled);
    if (!this.fullscreenEnabled && this.scale?.isFullscreen) {
      try {
        this.scale.stopFullscreen();
      } catch {
        // ignore fullscreen exit failures
      }
    }
  }

  setStartPreference(key, value) {
    if (!this.startPreferences || !(key in this.startPreferences)) {
      return;
    }

    const normalized = Boolean(value);
    this.startPreferences[key] = normalized;
    this.startPreferences = saveLaunchPreferences(this.startPreferences);
    if (key === 'sound') {
      this.setAudioEnabled(normalized);
    } else if (key === 'fullscreen') {
      this.setFullscreenEnabled(normalized);
    }
    if (this.overlayState?.type === 'start') {
      this.showStartOverlay();
    }
  }

  toggleStartPreference(key) {
    if (!this.startPreferences || !(key in this.startPreferences)) {
      return;
    }
    this.setStartPreference(key, !this.startPreferences[key]);
  }

  applyStartPreferences({ requestFullscreen = false } = {}) {
    this.setAudioEnabled(this.startPreferences.sound);
    this.setFullscreenEnabled(this.startPreferences.fullscreen);

    if (
      requestFullscreen &&
      this.startPreferences.fullscreen &&
      this.scale &&
      !this.scale.isFullscreen
    ) {
      let fullscreenHandled = false;
      const rejectFullscreen = () => {
        if (fullscreenHandled) {
          return;
        }
        fullscreenHandled = true;
        this.startPreferences.fullscreen = false;
        this.startPreferences = saveLaunchPreferences(this.startPreferences);
        this.setFullscreenEnabled(false);
        this.showTurnBanner('Fullscreen blocked by browser. Continue in window mode.');
      };

      try {
        const request = this.scale.startFullscreen();
        if (request?.catch) {
          request.catch(() => rejectFullscreen());
        }
      } catch {
        rejectFullscreen();
      }

      this.time?.delayedCall(220, () => {
        if (!this.scale?.isFullscreen) {
          rejectFullscreen();
        }
      });
    }
  }

  setMode(mode) {
    if (mode !== 'cpu' && mode !== 'local') {
      return;
    }

    this.currentMode = mode;
    this.cpuState = null;
  }

  toggleMode() {
    this.setMode(this.currentMode === 'cpu' ? 'local' : 'cpu');
  }

  isCpuControlledPlayer(index = this.turnIndex) {
    return this.currentMode === 'cpu' && index === 1;
  }

  cycleWeapon(player, direction) {
    player.setWeaponIndex(
      getNextWeaponIndex(
        player.weaponIndex,
        direction,
        WEAPONS,
        (weaponId) => player.getAmmo(weaponId)
      )
    );
  }

  createRoundStats() {
    return Object.fromEntries(PLAYER_NAMES.map((name) => [name, ROUND_STAT_TEMPLATE()]));
  }

  getRoundStatsText() {
    return PLAYER_NAMES.map((name) => {
      const stats = this.roundStats[name];
      return [
        `${name}`,
        `Shots ${stats.shots}  Hits ${stats.hits}`,
        `Damage ${stats.damageDealt}  Best ${stats.bestHit}`
      ].join('\n');
    }).join('\n\n');
  }

  updateAmbient(dt) {
    this.ambientTime += dt;

    const sunX = GAME_WIDTH * 0.28 + Math.sin(this.ambientTime * 0.08) * 46;
    const sunY = GAME_HEIGHT * 0.2 + Math.cos(this.ambientTime * 0.06) * 18;
    const glowPulse = 1 + Math.sin(this.ambientTime * 0.95) * 0.04;

    this.sunGlow.setPosition(sunX, sunY);
    this.sunCore.setPosition(sunX, sunY);
    this.sunHalo.setPosition(sunX, sunY);
    this.sunGlow.setScale(glowPulse);
    this.sunHalo.setScale(1 + Math.cos(this.ambientTime * 0.7) * 0.06);
    this.sunCore.setAlpha(0.84 + Math.sin(this.ambientTime * 0.55) * 0.06);

    this.haze.x = Math.sin(this.ambientTime * 0.035) * 24;
    this.mountains.x = Math.sin(this.ambientTime * 0.03) * 10;
    this.farMountains.x = Math.cos(this.ambientTime * 0.022) * 16;

    this.clouds.forEach((cloud, index) => {
      cloud.x += (5 + index * 2) * dt + this.wind * 0.015 * dt;
      cloud.y += Math.sin(this.ambientTime * 0.28 + index) * 0.08;
      if (cloud.x - cloud.width * 0.5 > GAME_WIDTH + 80) {
        cloud.x = -cloud.width * 0.5 - 60;
      }
    });

    this.groundDriftBands.forEach((band, index) => {
      band.x += (8 + index * 3) * dt * Math.sign(this.wind || 1);
      band.y = GAME_HEIGHT - 40 + Math.sin(this.ambientTime * (0.32 + index * 0.05) + index) * 4;
      band.alpha = 0.04 + Math.abs(this.wind) / 1200 + index * 0.01;

      if (band.x - band.width * 0.5 > GAME_WIDTH + 100) {
        band.x = -band.width * 0.5 - 80;
      } else if (band.x + band.width * 0.5 < -100) {
        band.x = GAME_WIDTH + band.width * 0.5 + 80;
      }
    });

    this.windSpecks.forEach((speck, index) => {
      speck.motion.wobble += dt * (1.6 + index * 0.03);
      speck.x += (speck.motion.speed + Math.abs(this.wind) * 1.4) * dt * Math.sign(this.wind || 1);
      speck.y += Math.sin(speck.motion.wobble) * dt * (10 + speck.motion.drift);
      speck.rotation = Math.sign(this.wind || 1) * 0.18;
      speck.scaleX = 0.65 + Math.abs(this.wind) / 70;
      speck.alpha = 0.05 + Math.abs(this.wind) / 600 + (Math.sin(speck.motion.wobble) + 1) * 0.03;

      if (speck.x > GAME_WIDTH + 30) {
        speck.x = -30;
        speck.y = Phaser.Math.Between(90, GAME_HEIGHT - 130);
      } else if (speck.x < -30) {
        speck.x = GAME_WIDTH + 30;
        speck.y = Phaser.Math.Between(90, GAME_HEIGHT - 130);
      }
    });

    const direction = Math.abs(this.wind) < 4 ? 0 : Math.sign(this.wind);
    const normalized = Phaser.Math.Clamp(Math.abs(this.wind) / WIND_LIMIT, 0, 1);
    const windsockAngle = direction === 0 ? 0 : direction * normalized * 0.72;
    const flutter = Math.sin(this.ambientTime * (6 + normalized * 4)) * (0.04 + normalized * 0.06);
    const droop = 1 - normalized * 0.22;

    this.windsock.rotation = windsockAngle + flutter;
    this.windsock.scaleX = 0.6 + normalized * 0.95;
    this.windsock.scaleY = droop;
    this.windsockStripe.rotation = windsockAngle + flutter * 1.1;
    this.windsockStripe.scaleX = 0.55 + normalized * 0.85;
    this.windsockStripe.scaleY = droop * 0.96;
    this.windsockStripe.x = this.windsockPole.x + direction * (16 + normalized * 8);
    this.windsockStripe.y = this.windsock.y;

    if (this.gradeOverlayAdd) {
      this.gradeOverlayAdd.alpha = 0.94 + Math.sin(this.ambientTime * 0.35) * 0.06;
    }
  }

  updateTankAnimations(dt) {
    if (!this.players) {
      return;
    }

    const activePlayer = this.getActivePlayer();
    this.players.forEach((tank) => {
      tank.setDriving(
        tank === activePlayer &&
        this.turnPhase === 'move' &&
        !this.overlayActive() &&
        !this.resolving &&
        this.activeTankDriving
      );
      tank.updateAnimation(dt, this.wind);
    });
  }

  updateDriveAudio() {
    if (!this.audioManager) {
      return;
    }

    const driving =
      !this.overlayActive() &&
      !this.resolving &&
      !this.gameOver &&
      this.turnPhase === 'move' &&
      this.activeTankDriving;
    const activePlayer = this.getActivePlayer();
    const slopeBoost = activePlayer ? Math.abs(activePlayer.terrainSlope) * 0.55 : 0;
    const intensity = Phaser.Math.Clamp(0.68 + slopeBoost, 0.65, 1);
    this.audioManager.setDrive(driving, intensity);
  }

  updateTankStability(dt) {
    if (!this.players || this.overlayActive() || !this.stabilityActive) {
      return;
    }

    const activePlayer = this.getActivePlayer();
    let keepActive = false;
    this.players.forEach((tank) => {
      if (!tank.isAlive()) {
        return;
      }

      const isDrivenThisFrame =
        tank === activePlayer &&
        this.turnPhase === 'move' &&
        !this.resolving &&
        this.activeTankDriving;

      if (isDrivenThisFrame) {
        tank.slideVelocity = 0;
        keepActive = true;
        return;
      }

      const slopePush = Phaser.Math.Clamp(tank.terrainSlope * 42, -20, 20);
      const shouldSlide = Math.abs(tank.terrainSlope) > 0.24;
      keepActive = keepActive || shouldSlide || Math.abs(tank.slideVelocity) > 0.6;
      const targetVelocity = shouldSlide ? slopePush : 0;
      tank.slideVelocity = Phaser.Math.Linear(tank.slideVelocity, targetVelocity, Math.min(1, dt * 4));

      if (Math.abs(tank.slideVelocity) < 1.2) {
        tank.slideVelocity = 0;
        return;
      }

      tank.x = Phaser.Math.Clamp(tank.x + tank.slideVelocity * dt, 48, GAME_WIDTH - 48);
      tank.syncToTerrain(this.terrain);
      if (tank === activePlayer && this.turnPhase === 'aim') {
        this.markPredictionDirty();
      }
      this.trySpawnMoveDust(tank, Math.sign(tank.slideVelocity) || 1, 0.16);
    });

    this.stabilityActive = keepActive;
  }

  createBackdrop() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x102433).setOrigin(0).setDepth(0);
    this.sunGlow = this.add.circle(GAME_WIDTH * 0.28, GAME_HEIGHT * 0.2, 132, 0xf4c471, 0.1).setDepth(1);
    this.sunCore = this.add.circle(GAME_WIDTH * 0.28, GAME_HEIGHT * 0.2, 54, 0xf7cf84, 0.9).setDepth(2);
    this.sunHalo = this.add.circle(GAME_WIDTH * 0.28, GAME_HEIGHT * 0.2, 84, 0xffefbf, 0.08).setDepth(1);

    this.haze = this.add.graphics().setDepth(2);
    this.haze.fillStyle(0xbfd2ca, 0.07);
    this.haze.fillEllipse(GAME_WIDTH * 0.22, GAME_HEIGHT * 0.82, 520, 160);
    this.haze.fillEllipse(GAME_WIDTH * 0.8, GAME_HEIGHT * 0.78, 680, 190);

    this.clouds = [
      this.add.ellipse(220, 145, 220, 56, 0xece4c9, 0.08).setDepth(2),
      this.add.ellipse(640, 118, 280, 72, 0xece4c9, 0.07).setDepth(2),
      this.add.ellipse(1040, 170, 240, 62, 0xece4c9, 0.06).setDepth(2)
    ];

    this.groundDriftBands = [
      this.add.ellipse(240, GAME_HEIGHT - 42, 440, 58, 0xd9c18d, 0.06).setDepth(5),
      this.add.ellipse(760, GAME_HEIGHT - 34, 520, 64, 0xe7d8ad, 0.05).setDepth(5),
      this.add.ellipse(1120, GAME_HEIGHT - 40, 360, 52, 0xd4b985, 0.05).setDepth(5)
    ];

    this.mountains = this.add.graphics().setDepth(3);
    this.mountains.fillStyle(0x1d3340, 0.92);
    this.mountains.beginPath();
    this.mountains.moveTo(0, GAME_HEIGHT);
    this.mountains.lineTo(0, 440);
    this.mountains.lineTo(180, 360);
    this.mountains.lineTo(360, 430);
    this.mountains.lineTo(520, 350);
    this.mountains.lineTo(760, 470);
    this.mountains.lineTo(930, 390);
    this.mountains.lineTo(1100, 450);
    this.mountains.lineTo(GAME_WIDTH, 390);
    this.mountains.lineTo(GAME_WIDTH, GAME_HEIGHT);
    this.mountains.closePath();
    this.mountains.fillPath();

    this.farMountains = this.add.graphics().setDepth(4);
    this.farMountains.fillStyle(0x254050, 0.7);
    this.farMountains.beginPath();
    this.farMountains.moveTo(0, GAME_HEIGHT);
    this.farMountains.lineTo(0, 510);
    this.farMountains.lineTo(160, 470);
    this.farMountains.lineTo(330, 530);
    this.farMountains.lineTo(520, 460);
    this.farMountains.lineTo(720, 550);
    this.farMountains.lineTo(900, 505);
    this.farMountains.lineTo(1140, 560);
    this.farMountains.lineTo(GAME_WIDTH, 520);
    this.farMountains.lineTo(GAME_WIDTH, GAME_HEIGHT);
    this.farMountains.closePath();
    this.farMountains.fillPath();

    this.windSpecks = Array.from({ length: 18 }, () => {
      const speck = this.add.rectangle(
        Phaser.Math.Between(0, GAME_WIDTH),
        Phaser.Math.Between(90, GAME_HEIGHT - 130),
        Phaser.Math.Between(10, 24),
        2,
        0xece4c9,
        Phaser.Math.FloatBetween(0.06, 0.18)
      );
      speck.setDepth(6);
      speck.motion = {
        speed: Phaser.Math.FloatBetween(34, 82),
        drift: Phaser.Math.FloatBetween(-12, 12),
        wobble: Phaser.Math.FloatBetween(0, Math.PI * 2)
      };
      return speck;
    });

    this.windsockPole = this.add.rectangle(0, 0, 4, 74, 0xd8d2bd, 0.95).setDepth(26);
    this.windsock = this.add.rectangle(0, 0, 34, 10, 0xf2b84b, 0.95).setDepth(27);
    this.windsock.setOrigin(0.08, 0.5);
    this.windsockStripe = this.add.rectangle(0, 0, 10, 10, 0x7fe7dc, 0.95).setDepth(28);
    this.windsockStripe.setOrigin(0.08, 0.5);

    this.gradeOverlay = this.add.graphics().setDepth(80);
    this.gradeOverlayAdd = this.add.graphics().setDepth(81).setBlendMode(Phaser.BlendModes.ADD);
    this.drawArcadeGrade();
  }

  drawArcadeGrade() {
    if (!this.gradeOverlay || !this.gradeOverlayAdd) {
      return;
    }

    this.gradeOverlay.clear();
    this.gradeOverlayAdd.clear();

    // Cinematic tint + vignette for stronger arcade readability.
    this.gradeOverlay.fillStyle(0x071018, 0.14);
    this.gradeOverlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.gradeOverlay.fillStyle(0x000000, 0.16);
    this.gradeOverlay.fillRect(0, 0, GAME_WIDTH, 42);
    this.gradeOverlay.fillRect(0, GAME_HEIGHT - 56, GAME_WIDTH, 56);
    this.gradeOverlay.fillStyle(0x000000, 0.1);
    this.gradeOverlay.fillRect(0, 0, 44, GAME_HEIGHT);
    this.gradeOverlay.fillRect(GAME_WIDTH - 44, 0, 44, GAME_HEIGHT);

    this.gradeOverlayAdd.fillStyle(0xf2b84b, 0.08);
    this.gradeOverlayAdd.fillCircle(GAME_WIDTH * 0.22, GAME_HEIGHT * 0.18, 230);
    this.gradeOverlayAdd.fillStyle(0x7fe7dc, 0.065);
    this.gradeOverlayAdd.fillCircle(GAME_WIDTH * 0.82, GAME_HEIGHT * 0.72, 260);
    this.gradeOverlayAdd.fillStyle(0xffffff, 0.03);
    this.gradeOverlayAdd.fillEllipse(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.52, 760, 290);
  }

  startMatch({ showTurnOverlay = true } = {}) {
    this.clearProjectiles();
    this.battleMusicActive = showTurnOverlay;
    stopBattleSong({ reset: true });

    if (this.players) {
      this.players.forEach((player) => player.destroy());
    }

    // A fresh terrain canvas doubles as render target and collision source.
    this.terrain.generate();
    this.players = this.createPlayers();
    this.players.forEach((player) => {
      player.syncToTerrain(this.terrain);
      player.initAmmo(WEAPONS);
    });
    this.positionWindsock();
    this.roundStats = this.createRoundStats();
    this.turnNumber = 1;
    this.cpuState = null;
    this.cpuLastMiss = null;
    this.arcadeScoring?.resetRound(this.players.map((player) => player.name));
    this.mutatorSystem?.resetForMatch();

    this.turnIndex = Phaser.Math.Between(0, 1);
    this.remainingMove = MOVE_PER_TURN;
    this.turnPhase = 'move';
    this.moveTimer = MOVE_TIME_LIMIT;
    this.aimTimer = AIM_TIME_LIMIT;
    this.resolving = false;
    this.turnPending = false;
    this.gameOver = false;
    this.winner = null;
    this.wind = this.rollWind();
    this.weather.rollCondition();
    this.weather.activate();
    const startTurnEffects = this.mutatorSystem?.onTurnStart({
      turnNumber: this.turnNumber,
      playerName: this.getActivePlayer()?.name ?? '',
      phase: this.turnPhase,
      wind: this.wind
    });
    if (typeof startTurnEffects?.windOverride === 'number') {
      this.wind = startTurnEffects.windOverride;
    }
    this.ambientAccumulator = 0;
    this.stabilityAccumulator = 0;
    this.clearOverlay();
    this.stabilityActive = true;
    this.resetCameraFocus(1);
    this.audioManager.setWind(this.wind);
    this.arcadeEvents?.emit(ARCADE_EVENTS.ROUND_STARTED, {
      mode: this.currentMode,
      weather: this.weather.getLabel(),
      turnNumber: this.turnNumber,
      firstPlayer: this.getActivePlayer()?.name ?? ''
    });
    this.renderWindRibbon();
    this.markPredictionDirty();
    this.syncHud();
    this.emitTimerUpdate();

    if (showTurnOverlay) {
      this.presentTurnOverlay();
    }
  }

  createPlayers() {
    const leftX = Phaser.Math.Between(150, 300);
    const rightX = Phaser.Math.Between(GAME_WIDTH - 300, GAME_WIDTH - 150);

    return [
      new Tank(this, {
        x: leftX,
        y: this.terrain.getSurfaceY(leftX),
        name: PLAYER_NAMES[0],
        color: PLAYER_COLORS[0],
        facing: 1
      }),
      new Tank(this, {
        x: rightX,
        y: this.terrain.getSurfaceY(rightX),
        name: PLAYER_NAMES[1],
        color: PLAYER_COLORS[1],
        facing: -1
      })
    ];
  }

  rollWind() {
    return Phaser.Math.FloatBetween(-WIND_LIMIT, WIND_LIMIT);
  }

  getActivePlayer() {
    if (!this.players || typeof this.turnIndex === 'undefined') {
      return null;
    }
    return this.players[this.turnIndex];
  }

  getWindDirectionLabel() {
    if (Math.abs(this.wind) < 4) {
      return 'CALM';
    }

    return this.wind > 0 ? 'RIGHT' : 'LEFT';
  }

  getWindStrengthLabel() {
    const magnitude = Math.abs(this.wind);
    if (magnitude < 4) {
      return 'Calm';
    }
    if (magnitude < 16) {
      return 'Light';
    }
    if (magnitude < 30) {
      return 'Breezy';
    }
    if (magnitude < 42) {
      return 'Strong';
    }
    return 'Gusting';
  }

  getWindEffectText() {
    if (Math.abs(this.wind) < 4) {
      return 'Barely affects shots';
    }

    return this.wind > 0 ? 'Pushes shots to the right' : 'Pushes shots to the left';
  }

  getGravityMultiplier() {
    const weatherMult = this.weather?.gravityModifier() ?? 1;
    const mutatorMult = this.mutatorSystem?.getGravityMultiplier() ?? 1;
    return weatherMult * mutatorMult;
  }

  positionWindsock() {
    const x = GAME_WIDTH * 0.5;
    const y = this.terrain.getSurfaceY(x);
    this.windsockPole.setPosition(x, y - 34);
    this.windsock.setPosition(x + 2, y - 62);
    this.windsockStripe.setPosition(x + 14, y - 62);
  }

  overlayActive() {
    return this.overlaySystem?.overlayActive() ?? false;
  }

  showOverlay(payload) {
    this.overlaySystem?.showOverlay(payload);
  }

  clearOverlay() {
    this.overlaySystem?.clearOverlay();
  }

  syncTitleMusicState(overlay = this.overlayState) {
    const musicState = resolveBackgroundMusicState({
      soundEnabled: Boolean(this.startPreferences?.sound),
      battleActive: this.battleMusicActive,
      gameOver: Boolean(this.gameOver),
      overlayType: overlay?.type ?? null,
      previousOverlayType: overlay?.previousOverlay?.type ?? null
    });

    if (musicState.title) {
      stopBattleSong();
      playTitleSong();
    } else if (musicState.battle) {
      stopTitleSong();
      playBattleSong();
    } else {
      stopTitleSong();
      stopBattleSong();
    }
  }

  startBattleFromStartOverlay() {
    this.battleMusicActive = true;
    stopBattleSong({ reset: true });
    this.clearOverlay();
    this.presentTurnOverlay();
    this.syncHud();
  }

  showStartOverlay() {
    this.overlaySystem?.showStartOverlay();
  }

  presentTurnOverlay() {
    this.overlaySystem?.presentTurnOverlay();
  }

  showGameOverOverlay() {
    this.overlaySystem?.showGameOverOverlay();
  }

  buildScoreboardText() {
    return this.overlaySystem?.buildScoreboardText() ?? '';
  }

  buildHelpBody() {
    return this.overlaySystem?.buildHelpBody() ?? '';
  }

  buildHelpSidebar() {
    return this.overlaySystem?.buildHelpSidebar() ?? '';
  }

  showHelpOverlay() {
    this.overlaySystem?.showHelpOverlay();
  }

  startCpuTurn() {
    const player = this.getActivePlayer();
    const target = this.players.find((tank, index) => index !== this.turnIndex && tank.isAlive());
    if (!player || !target) {
      return;
    }

    const bias = Phaser.Math.Clamp((target.x - player.x) * 0.1, -26, 26);
    const desiredMove = Phaser.Math.Clamp(
      bias + Phaser.Math.Between(-12, 12),
      -this.remainingMove * 0.8,
      this.remainingMove * 0.8
    );

    this.cpuState = {
      stage: 'move',
      targetX: Phaser.Math.Clamp(player.x + desiredMove, 48, GAME_WIDTH - 48),
      thinkTimer: 0.35,
      fireTimer: 0.22,
      plan: null
    };
  }

  // Returns the list of weapon indices the CPU may consider this turn.
  getCpuWeaponCandidates(player, target) {
    const dist = Math.abs(target.x - player.x);
    const candidates = [0]; // Basic Shell always available

    // Mortar preferred at medium+ range; don't waste if only 1 left
    if (player.getAmmo('mortar') > 0) {
      candidates.push(1);
    }

    // Split Shot: good when target is close enough that spread helps
    if (dist < 320 && player.getAmmo('split') > 0) {
      candidates.push(2);
    }

    // Rail Slug: better on longer, flatter lanes where precision matters.
    const railIndex = WEAPONS.findIndex((weapon) => weapon.id === 'rail');
    if (railIndex >= 0 && dist > 280 && player.getAmmo('rail') > 0) {
      candidates.push(railIndex);
    }

    // Storm Shards: short-to-mid range area denial.
    const splitStormIndex = WEAPONS.findIndex((weapon) => weapon.id === 'splitstorm');
    if (splitStormIndex >= 0 && dist < 360 && player.getAmmo('splitstorm') > 0) {
      candidates.push(splitStormIndex);
    }

    // Bouncer/Hopper: never used by CPU (bounce simulation not implemented)
    return candidates;
  }

  getFireOriginForPitch(player, pitch) {
    const pitchRad = Phaser.Math.DegToRad(pitch);
    const worldAngle = player.facing === 1 ? -pitchRad : -Math.PI + pitchRad;

    return {
      x: player.x + Math.cos(worldAngle) * (BARREL_LENGTH - 2),
      y: player.y - 3 + Math.sin(worldAngle) * (BARREL_LENGTH - 2),
      angle: worldAngle
    };
  }

  simulateWeaponImpact(player, target, pitch, power, weapon) {
    const launch = this.getFireOriginForPitch(player, pitch);
    let x = launch.x;
    let y = launch.y;
    let vx = Math.cos(launch.angle) * power * weapon.speedFactor;
    let vy = Math.sin(launch.angle) * power * weapon.speedFactor;

    const gravMod = this.getGravityMultiplier();
    for (let elapsed = 0; elapsed < 3.8; elapsed += 0.06) {
      vx += this.wind * weapon.windScale * 0.06;
      vy += GRAVITY * weapon.gravityScale * gravMod * 0.06;
      x += vx * 0.06;
      y += vy * 0.06;

      if (x < 0 || x > GAME_WIDTH || y > GAME_HEIGHT) {
        break;
      }

      if (this.terrain.isSolid(x, y)) {
        break;
      }

      if (Phaser.Math.Distance.Between(x, y, target.x, target.y - 2) <= 17 + weapon.projectileRadius) {
        return { x, y, distance: 0, directHit: true };
      }
    }

    const distance = Phaser.Math.Distance.Between(x, y, target.x, target.y - 2);
    return { x, y, distance, directHit: distance < weapon.blastRadius * 0.4 };
  }

  computeCpuShotPlan(player, target) {
    const candidates = this.getCpuWeaponCandidates(player, target);

    // Apply error correction from last shot if available.
    // cpuLastMiss.dx > 0 means shell landed right of target → reduce pitch or power slightly.
    const miss = this.cpuLastMiss;
    const pitchBias = miss ? Phaser.Math.Clamp(-miss.dx * 0.04, -6, 6) : 0;
    const powerBias = miss ? Phaser.Math.Clamp(-miss.dy * 0.18, -40, 40) : 0;

    let bestPlan = {
      weaponIndex: candidates[0],
      pitch: 48,
      power: 360,
      score: Number.POSITIVE_INFINITY
    };

    candidates.forEach((weaponIndex) => {
      const weapon = getWeapon(weaponIndex);
      // Narrow search around the bias when we have correction data
      const pitchMin = miss ? Phaser.Math.Clamp(18 + pitchBias, 14, 82) : 18;
      const pitchMax = miss ? Phaser.Math.Clamp(82 + pitchBias, 14, 82) : 82;
      const powerMin = miss ? Phaser.Math.Clamp(220 + powerBias, 180, 540) : 220;
      const powerMax = miss ? Phaser.Math.Clamp(520 + powerBias, 180, 540) : 520;

      for (let pitch = pitchMin; pitch <= pitchMax; pitch += 4) {
        for (let power = powerMin; power <= powerMax; power += 20) {
          const result = this.simulateWeaponImpact(player, target, pitch, power, weapon);
          const selfDistance = Phaser.Math.Distance.Between(result.x, result.y, player.x, player.y);
          const selfPenalty = selfDistance < weapon.blastRadius + 26 ? 280 : 0;
          const directBonus = result.directHit ? -120 : 0;
          // Prefer mortar when close (larger blast radius covers misses better)
          const weaponBonus =
            (weapon.id === 'mortar' && Math.abs(target.x - player.x) < 200 ? -20 : 0) +
            (weapon.id === 'rail' && Math.abs(target.x - player.x) > 280 ? -18 : 0) +
            (weapon.id === 'splitstorm' && Math.abs(target.x - player.x) < 280 ? -10 : 0);
          const score = result.distance + selfPenalty + directBonus + weaponBonus;

          if (score < bestPlan.score) {
            bestPlan = { weaponIndex, pitch, power, score };
          }
        }
      }
    });

    return bestPlan;
  }

  updateCpuTurn(dt) {
    if (!this.cpuState) {
      this.startCpuTurn();
      return;
    }

    const player = this.getActivePlayer();
    const target = this.players.find((tank, index) => index !== this.turnIndex && tank.isAlive());
    if (!player || !target) {
      this.cpuState = null;
      return;
    }

    if (this.cpuState.stage === 'move') {
      const deltaX = this.cpuState.targetX - player.x;
      if (Math.abs(deltaX) > 2 && this.remainingMove > 0) {
        const step = Math.min(Math.abs(deltaX), MOVE_SPEED * 0.7 * dt, this.remainingMove);
        const direction = Math.sign(deltaX);
        player.x = Phaser.Math.Clamp(player.x + direction * step, 48, GAME_WIDTH - 48);
        player.syncToTerrain(this.terrain);
        this.remainingMove = Math.max(0, this.remainingMove - step);
        this.activeTankDriving = true;
        this.stabilityActive = true;
        this.trySpawnMoveDust(player, direction, 0.18);
        this.syncHud();
        return;
      }

      this.enterAimPhase();
      this.cpuState.plan = this.computeCpuShotPlan(player, target);
      this.cpuState.stage = 'aim';
      return;
    }

    if (this.cpuState.stage === 'aim') {
      const plan = this.cpuState.plan;
      player.setWeaponIndex(plan.weaponIndex);
      player.setPitch(Phaser.Math.Linear(player.pitch, plan.pitch, Math.min(1, dt * 4)));
      player.setPower(Phaser.Math.Linear(player.power, plan.power, Math.min(1, dt * 4)));
      this.markPredictionDirty();
      this.syncHud();

      if (
        Math.abs(player.pitch - plan.pitch) < 1 &&
        Math.abs(player.power - plan.power) < 5
      ) {
        this.cpuState.stage = 'fire';
      }
      return;
    }

    if (this.cpuState.stage === 'fire') {
      this.cpuState.fireTimer -= dt;
      if (this.cpuState.fireTimer <= 0) {
        this.fireActiveWeapon();
        this.cpuState = null;
      }
    }
  }

  update(_time, delta) {
    const dt = Math.min(delta / 1000, 0.032);
    if (this.hitStopTimer > 0) {
      this.hitStopTimer = Math.max(0, this.hitStopTimer - dt);
      this.audioManager.setDrive(false, 0);
      return;
    }
    this.activeTankDriving = false;
    this.ambientAccumulator = Math.min(this.ambientAccumulator + dt, this.ambientStep * 3);
    while (this.ambientAccumulator >= this.ambientStep) {
      this.updateAmbient(this.ambientStep);
      this.ambientAccumulator -= this.ambientStep;
    }
    this.weather.update(dt, this.wind);

    if (this.overlayActive()) {
      this.handleOverlayInput();
      this.updateTankAnimations(dt);
      this.audioManager.setDrive(false, 0);
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.inputKeys.h)) {
      this.audioManager.setDrive(false, 0);
      this.showHelpOverlay();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.inputKeys.v)) {
      this.toggleReducedMotion();
    }

    if (Phaser.Input.Keyboard.JustDown(this.inputKeys.r)) {
      this.audioManager.setDrive(false, 0);
      this.startMatch();
      return;
    }

    if (this.isCpuControlledPlayer() && !this.resolving && !this.gameOver) {
      this.updateCpuTurn(dt);
      if (this.turnPhase === 'aim') {
        this.drawPrediction();
      } else {
        this.clearPrediction();
      }
      this.stabilityAccumulator = Math.min(this.stabilityAccumulator + dt, this.stabilityStep * 3);
      while (this.stabilityAccumulator >= this.stabilityStep) {
        this.updateTankStability(this.stabilityStep);
        this.stabilityAccumulator -= this.stabilityStep;
      }
      this.updateTankAnimations(dt);
      this.updateProjectiles(dt);
      this.updateDriveAudio();
      return;
    }

    if (!this.gameOver && !this.resolving) {
      this.handlePlayerInput(dt);
      this.updateTurnTimer(dt);
      if (this.turnPhase === 'aim') {
        this.drawPrediction();
      } else {
        this.clearPrediction();
      }
    } else {
      this.clearPrediction();
    }

    this.stabilityAccumulator = Math.min(this.stabilityAccumulator + dt, this.stabilityStep * 3);
    while (this.stabilityAccumulator >= this.stabilityStep) {
      this.updateTankStability(this.stabilityStep);
      this.stabilityAccumulator -= this.stabilityStep;
    }
    this.updateTankAnimations(dt);
    this.updateProjectiles(dt);
    this.updateDriveAudio();
  }

  handleOverlayInput() {
    const advance =
      Phaser.Input.Keyboard.JustDown(this.inputKeys.space) ||
      Phaser.Input.Keyboard.JustDown(this.inputKeys.enter);
    const help = Phaser.Input.Keyboard.JustDown(this.inputKeys.h);
    const modeToggle = Phaser.Input.Keyboard.JustDown(this.inputKeys.m);
    const closeHelp = help || advance || Phaser.Input.Keyboard.JustDown(this.inputKeys.esc);

    if (!this.overlayState) {
      return;
    }

    if (this.overlayState.type !== 'help' && help) {
      this.showHelpOverlay();
      return;
    }

    if (
      modeToggle &&
      (this.overlayState.type === 'start' || this.overlayState.type === 'gameover')
    ) {
      this.toggleMode();
      if (this.overlayState.type === 'start') {
        this.showStartOverlay();
      } else {
        this.showGameOverOverlay();
      }
      this.syncHud();
      return;
    }

    if (this.overlayState.type === 'help' && closeHelp) {
      const previousOverlay = this.overlayState.previousOverlay;
      if (previousOverlay) {
        this.showOverlay(previousOverlay);
      } else {
        this.clearOverlay();
        this.syncHud();
      }
      return;
    }

    if (this.overlayState.type === 'start' && advance) {
      this.startBattleFromStartOverlay();
      return;
    }

    if (this.overlayState.type === 'turn' && !this.isCpuControlledPlayer() && advance) {
      this.clearOverlay();
      this.syncHud();
      return;
    }

    if (
      this.overlayState.type === 'gameover' &&
      (advance || Phaser.Input.Keyboard.JustDown(this.inputKeys.r))
    ) {
      this.startMatch();
    }
  }

  handlePlayerInput(dt) {
    const player = this.getActivePlayer();
    let hudDirty = false;

    if (this.turnPhase === 'move') {
      const keyMoveAxis =
        (this.inputKeys.right.isDown ? 1 : 0) - (this.inputKeys.left.isDown ? 1 : 0);
      if (keyMoveAxis !== 0) {
        this.mouseMoveTarget = null;
      }

      let moveAxis = keyMoveAxis;
      if (moveAxis === 0 && this.mouseMoveTarget !== null) {
        const deltaToTarget = this.mouseMoveTarget - player.x;
        if (Math.abs(deltaToTarget) <= 1.5) {
          this.mouseMoveTarget = null;
        } else {
          moveAxis = Math.sign(deltaToTarget);
        }
      }

      if (moveAxis !== 0 && this.remainingMove > 0) {
        const targetLimit =
          this.mouseMoveTarget !== null
            ? Math.abs(this.mouseMoveTarget - player.x)
            : Number.POSITIVE_INFINITY;
        const amount = Math.min(this.remainingMove, MOVE_SPEED * dt, targetLimit);
        const nextX = Phaser.Math.Clamp(player.x + moveAxis * amount, 48, GAME_WIDTH - 48);
        const traveled = Math.abs(nextX - player.x);
        if (traveled > 0) {
          player.x = nextX;
          player.syncToTerrain(this.terrain);
          this.remainingMove = Math.max(0, this.remainingMove - traveled);
          this.stabilityActive = true;
          this.activeTankDriving = true;
          this.trySpawnMoveDust(player, moveAxis);
          if (this.mouseMoveTarget !== null && Math.abs(this.mouseMoveTarget - player.x) <= 1.5) {
            this.mouseMoveTarget = null;
          }
          hudDirty = true;
        }
      }

      if (this.remainingMove <= 0) {
        this.mouseMoveTarget = null;
        this.enterAimPhase();
        return;
      }

      if (Phaser.Input.Keyboard.JustDown(this.inputKeys.space)) {
        this.mouseMoveTarget = null;
        this.enterAimPhase();
        return;
      }
    } else {
      const pitchAxis =
        (this.inputKeys.up.isDown ? 1 : 0) - (this.inputKeys.down.isDown ? 1 : 0);
      if (pitchAxis !== 0) {
        player.setPitch(player.pitch + pitchAxis * AIM_SPEED * dt);
        this.markPredictionDirty();
        hudDirty = true;
      }

      const powerAxis =
        (this.inputKeys.right.isDown ? 1 : 0) - (this.inputKeys.left.isDown ? 1 : 0);
      if (powerAxis !== 0) {
        player.setPower(player.power + powerAxis * POWER_STEP * dt);
        this.markPredictionDirty();
        hudDirty = true;
      }

      if (Phaser.Input.Keyboard.JustDown(this.inputKeys.space)) {
        this.fireActiveWeapon();
        hudDirty = true;
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.inputKeys.q)) {
      this.cycleWeapon(player, -1);
      this.markPredictionDirty();
      hudDirty = true;
    }

    if (Phaser.Input.Keyboard.JustDown(this.inputKeys.e)) {
      this.cycleWeapon(player, 1);
      this.markPredictionDirty();
      hudDirty = true;
    }

    if (hudDirty) {
      this.syncHud();
    }
  }

  trySpawnMoveDust(player, direction, alpha = 0.28) {
    if (this.time.now < this.moveDustCooldown) {
      return;
    }

    this.moveDustCooldown = this.time.now + 75;
    const dust = this.add.circle(
      player.x - direction * 12,
      player.y + 12,
      Phaser.Math.Between(4, 7),
      0xd9c18d,
      alpha
    );
    dust.setDepth(28);

    this.tweens.add({
      targets: dust,
      x: dust.x - direction * Phaser.Math.Between(14, 28),
      y: dust.y - Phaser.Math.Between(8, 16),
      scale: Phaser.Math.FloatBetween(1.4, 1.9),
      alpha: 0,
      duration: Phaser.Math.Between(260, 360),
      ease: 'Sine.Out',
      onComplete: () => dust.destroy()
    });
  }

  updateTurnTimer(dt) {
    if (this.isCpuControlledPlayer() || this.overlayActive()) {
      return;
    }

    if (this.turnPhase === 'move') {
      this.moveTimer = Math.max(0, this.moveTimer - dt);
      this.emitTimerUpdate();
      if (this.moveTimer <= 0) {
        this.enterAimPhase();
      }
      return;
    }

    this.aimTimer = Math.max(0, this.aimTimer - dt);
    this.emitTimerUpdate();
    if (this.aimTimer <= 0) {
      // Auto-fire when aim timer runs out
      this.fireActiveWeapon();
    }
  }

  emitTimerUpdate() {
    this.events.emit(GAME_SCENE_EVENTS.TIMER_UPDATE, {
      phase: this.turnPhase,
      move: {
        remaining: this.moveTimer ?? MOVE_TIME_LIMIT,
        total: MOVE_TIME_LIMIT
      },
      aim: {
        remaining: this.aimTimer ?? AIM_TIME_LIMIT,
        total: AIM_TIME_LIMIT
      }
    });
  }

  mouseAim(pointer) {
    const player = this.getActivePlayer();
    if (!player) return;
    const dx = pointer.worldX - player.x;
    const dy = pointer.worldY - player.y;
    // Only aim in the direction the tank is facing
    if (player.facing === 1 ? dx > 0 : dx < 0) {
      const angleDeg = Phaser.Math.RadToDeg(Math.atan2(-dy, Math.abs(dx)));
      player.setPitch(Phaser.Math.Clamp(angleDeg, MIN_PITCH, MAX_PITCH));
      this.markPredictionDirty();
    }
  }

  enterAimPhase() {
    if (this.turnPhase === 'aim' || this.gameOver || this.resolving) {
      return;
    }

    this.touchAimState = null;
    this.mouseMoveTarget = null;
    this.turnPhase = 'aim';
    this.moveTimer = 0;
    this.markPredictionDirty();
    this.emitTimerUpdate();
    this.showTurnBanner(`${this.getActivePlayer().name} aim phase`);
    this.syncHud();
  }

  fireActiveWeapon() {
    if (this.resolving || this.gameOver) {
      return;
    }
    this.touchAimState = null;

    const player = this.getActivePlayer();
    const weapon = getWeapon(player.weaponIndex);

    if (weapon.ammo !== null && player.getAmmo(weapon.id) <= 0) {
      this.showTurnBanner('No ammo — switch weapon!');
      return;
    }
    const origin = player.getFireOrigin();
    const angle = player.getWorldAngle();
    const speed = player.power * weapon.speedFactor;
    this.focusCameraOn(origin.x, origin.y, 180, 1.03);

    this.roundStats[player.name].shots += 1;
    this.arcadeEvents?.emit(ARCADE_EVENTS.SHOT_FIRED, {
      turnNumber: this.turnNumber,
      shooterName: player.name,
      weaponId: weapon.id,
      x: origin.x,
      y: origin.y,
      turnTimer: this.aimTimer,
      wind: this.wind,
      weather: this.weather.getLabel()
    });
    this.audioManager.playShot(weapon);
    this.playWeaponMuzzle(origin.x, origin.y, weapon);
    this.spawnProjectile({
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: weapon.color,
      radius: weapon.projectileRadius,
      weapon,
      owner: player,
      age: 0
    });

    this.tweens.add({
      targets: player,
      x: player.x - Math.cos(angle) * 4,
      y: player.y - Math.sin(angle) * 3,
      yoyo: true,
      duration: 80
    });

    if (weapon.ammo !== null) {
      player.spendAmmo(weapon.id);
    }
    this.resolving = true;
    this.clearPrediction();
  }

  spawnProjectile(config) {
    const displayConfig = this.createProjectileDisplay(config);
    const trail = this.add.graphics().setDepth(49);

    this.projectiles.push({
      ...config,
      ...displayConfig,
      sprite: displayConfig.sprite,
      trail,
      trailPoints: [],
      bouncesLeft: config.weapon.maxBounces ?? 0,
      drilledTerrain: false
    });
  }

  createProjectileDisplay(config) {
    const style = config.weapon.projectileStyle ?? 'orb';
    const accent = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(config.color),
      Phaser.Display.Color.ValueToColor(0xffffff),
      100,
      42
    );
    const accentColor = Phaser.Display.Color.GetColor(accent.r, accent.g, accent.b);
    let sprite;
    let alignToVelocity = false;
    let rotationOffset = 0;
    let spinRate = 0;

    switch (style) {
      case 'heavy-orb':
        sprite = this.add.ellipse(config.x, config.y, config.radius * 2.8, config.radius * 2.2, config.color, 1);
        sprite.setStrokeStyle(3, 0x4d2200, 0.68);
        break;
      case 'diamond':
        sprite = this.add.rectangle(config.x, config.y, config.radius * 2.4, config.radius * 2.4, config.color, 1);
        sprite.setStrokeStyle(2, accentColor, 0.82);
        alignToVelocity = true;
        rotationOffset = Math.PI / 4;
        break;
      case 'chunk':
        sprite = this.add.rectangle(config.x, config.y, config.radius * 2.7, config.radius * 1.9, config.color, 1);
        sprite.setStrokeStyle(2, 0xf3ffd4, 0.74);
        spinRate = 0.18;
        break;
      case 'slug':
        sprite = this.add.rectangle(config.x, config.y, config.radius * 4.6, config.radius * 1.25, config.color, 1);
        sprite.setStrokeStyle(2, accentColor, 0.9);
        alignToVelocity = true;
        break;
      case 'shard':
        sprite = this.add.triangle(
          config.x,
          config.y,
          -config.radius * 1.8,
          config.radius * 0.95,
          config.radius * 2.4,
          0,
          -config.radius * 1.8,
          -config.radius * 0.95,
          config.color,
          1
        );
        sprite.setStrokeStyle(2, accentColor, 0.86);
        alignToVelocity = true;
        break;
      case 'block':
        sprite = this.add.rectangle(config.x, config.y, config.radius * 2.5, config.radius * 2.5, config.color, 1);
        sprite.setStrokeStyle(2, 0x3f2507, 0.72);
        spinRate = 0.11;
        break;
      case 'orb':
      default:
        sprite = this.add.circle(config.x, config.y, config.radius, config.color, 1);
        sprite.setStrokeStyle(2, 0xffffff, 0.55);
        break;
    }

    sprite.setDepth(50);
    sprite.setBlendMode(Phaser.BlendModes.ADD);

    return {
      sprite,
      alignToVelocity,
      rotationOffset,
      spinRate
    };
  }

  syncProjectileDisplay(projectile) {
    projectile.sprite.setPosition(projectile.x, projectile.y);
    if (projectile.alignToVelocity) {
      projectile.sprite.rotation = Math.atan2(projectile.vy, projectile.vx) + (projectile.rotationOffset ?? 0);
      return;
    }
    if (projectile.spinRate) {
      projectile.sprite.rotation += projectile.spinRate;
    }
  }

  destroyProjectile(projectile) {
    projectile.trail.destroy();
    projectile.sprite.destroy();
  }

  spawnBounceFlash(x, y, weapon, ownerName = null) {
    const flash = this.add.circle(x, y, 5, weapon.color, 0.72).setDepth(58);
    this.tweens.add({
      targets: flash,
      radius: 13,
      alpha: 0,
      duration: 130,
      onComplete: () => flash.destroy()
    });
    this.arcadeEvents?.emit(ARCADE_EVENTS.PROJECTILE_BOUNCED, {
      turnNumber: this.turnNumber,
      ownerName,
      weaponId: weapon.id,
      x,
      y
    });
    this.audioManager.playBounce();
  }

  playWeaponMuzzle(x, y, weapon) {
    this.muzzleFlash.setPosition(x, y);
    this.muzzleFlash.setFillStyle(weapon.muzzleColor, 1);
    this.muzzleFlash.setScale(1);
    this.muzzleFlash.setAlpha(0.92);
    this.tweens.add({
      targets: this.muzzleFlash,
      scale: weapon.flashScale,
      alpha: 0,
      duration: 140 + weapon.burstCount * 4
    });

    for (let i = 0; i < Math.ceil(weapon.burstCount / 2); i += 1) {
      const spark = this.add.circle(
        x + Phaser.Math.Between(-4, 4),
        y + Phaser.Math.Between(-4, 4),
        Phaser.Math.Between(2, 4),
        weapon.muzzleColor,
        0.8
      );
      spark.setDepth(56);
      this.tweens.add({
        targets: spark,
        x: spark.x + Phaser.Math.Between(-18, 18),
        y: spark.y + Phaser.Math.Between(-14, 14),
        alpha: 0,
        scale: Phaser.Math.FloatBetween(1.3, 2.1),
        duration: Phaser.Math.Between(120, 180),
        onComplete: () => spark.destroy()
      });
    }

    if (weapon.id === 'rail') {
      const streak = this.add.rectangle(x + 28, y, 58, 3, 0xd5f7ff, 0.92).setDepth(57);
      streak.setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: streak,
        scaleX: 2.2,
        alpha: 0,
        duration: 110,
        ease: 'Cubic.Out',
        onComplete: () => streak.destroy()
      });
    } else if (weapon.id === 'splitstorm') {
      for (let i = 0; i < 4; i += 1) {
        const shard = this.add.triangle(x, y, -8, 3, 10, 0, -8, -3, weapon.explosionCore, 0.9).setDepth(57);
        shard.rotation = (Math.PI * 2 * i) / 4;
        shard.setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: shard,
          scaleX: 1.8,
          scaleY: 1.25,
          alpha: 0,
          duration: 120,
          ease: 'Cubic.Out',
          onComplete: () => shard.destroy()
        });
      }
    } else if (weapon.id === 'hopper') {
      for (let i = 0; i < 3; i += 1) {
        const chunk = this.add.rectangle(
          x + Phaser.Math.Between(-4, 4),
          y + Phaser.Math.Between(-3, 3),
          Phaser.Math.Between(8, 14),
          Phaser.Math.Between(5, 8),
          weapon.explosionRing,
          0.88
        ).setDepth(57);
        chunk.rotation = Phaser.Math.FloatBetween(-0.5, 0.5);
        this.tweens.add({
          targets: chunk,
          x: chunk.x + Phaser.Math.Between(12, 24),
          y: chunk.y + Phaser.Math.Between(-10, 10),
          alpha: 0,
          angle: Phaser.Math.Between(-35, 35),
          duration: 140,
          onComplete: () => chunk.destroy()
        });
      }
    }
  }

  updateProjectiles(dt) {
    if (!this.projectiles.length) {
      return;
    }

    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i];
      const previousX = projectile.x;
      const previousY = projectile.y;

      projectile.age += dt;
      projectile.vx += this.wind * projectile.weapon.windScale * dt;
      projectile.vy += GRAVITY * projectile.weapon.gravityScale * this.getGravityMultiplier() * dt;
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.trailPoints.push({ x: projectile.x, y: projectile.y, age: projectile.age });
      if (projectile.trailPoints.length > projectile.weapon.trailLength) {
        projectile.trailPoints.shift();
      }
      this.drawProjectileTrail(projectile);

      if (shouldSplitProjectile(projectile.weapon, projectile.age, projectile.didSplit)) {
        this.splitProjectile(projectile, i);
        continue;
      }

      const collision = this.traceProjectile(previousX, previousY, projectile.x, projectile.y, projectile);
      this.syncProjectileDisplay(projectile);

      if (collision) {
        if (shouldRailDrill(projectile.weapon, collision, projectile.drilledTerrain)) {
          projectile.drilledTerrain = true;
          this.spawnRailDrillFx(collision.x, collision.y, projectile.weapon);
          this.terrain.deformCircle(collision.x, collision.y, 9, { drawRim: false, profile: 'scoop' });
          projectile.x = collision.x + Math.sign(projectile.vx || 1) * 10;
          projectile.y = collision.y - 2;
          projectile.vx *= 0.88;
          projectile.vy *= 0.82;
          this.syncProjectileDisplay(projectile);
          continue;
        }

        const canBounce =
          projectile.weapon.maxBounces &&
          projectile.bouncesLeft > 0 &&
          collision.type === 'terrain';

        if (canBounce) {
          const slopeL = this.terrain.getSurfaceY(collision.x - 2);
          const slopeR = this.terrain.getSurfaceY(collision.x + 2);
          const slope = (slopeR - slopeL) / 4;
          const len = Math.hypot(-slope, 1);
          const nx = -slope / len;
          const ny = 1 / len;
          const dot = projectile.vx * nx + projectile.vy * ny;
          const r = projectile.weapon.restitution;
          projectile.vx = (projectile.vx - 2 * dot * nx) * r;
          projectile.vy = (projectile.vy - 2 * dot * ny) * r;
          projectile.x = collision.x;
          projectile.y = collision.y - 5;
          projectile.bouncesLeft -= 1;
          this.syncProjectileDisplay(projectile);
          this.spawnBounceFlash(
            collision.x,
            collision.y,
            projectile.weapon,
            projectile.owner?.name ?? null
          );
          continue;
        }

        this.explode(collision.x, collision.y, projectile.weapon, projectile.owner);
        this.destroyProjectile(projectile);
        this.projectiles.splice(i, 1);
        continue;
      }

      if (projectile.x < -40 || projectile.x > GAME_WIDTH + 40 || projectile.y > GAME_HEIGHT + 60) {
        this.destroyProjectile(projectile);
        this.projectiles.splice(i, 1);
      }
    }

    if (this.resolving && !this.projectiles.length && !this.turnPending && !this.gameOver) {
      this.turnPending = true;
      this.time.delayedCall(650, () => this.advanceTurn());
    }
  }

  drawProjectileTrail(projectile) {
    const { trailPoints, trail } = projectile;
    trail.clear();
    if (trailPoints.length < 2) {
      return;
    }

    for (let i = 1; i < trailPoints.length; i += 1) {
      const from = trailPoints[i - 1];
      const to = trailPoints[i];
      const alpha = i / trailPoints.length;
      trail.lineStyle(
        projectile.weapon.trailWidth * alpha + 0.6,
        projectile.color,
        alpha * projectile.weapon.trailAlpha
      );
      trail.beginPath();
      trail.moveTo(from.x, from.y);
      trail.lineTo(to.x, to.y);
      trail.strokePath();

      if (projectile.weapon.id === 'rail') {
        trail.lineStyle(1.4, 0xffffff, alpha * 0.5);
        trail.beginPath();
        trail.moveTo(from.x, from.y);
        trail.lineTo(to.x, to.y);
        trail.strokePath();
      }

      if (projectile.weapon.id === 'hopper' && i === trailPoints.length - 1) {
        trail.fillStyle(projectile.color, alpha * 0.28);
        trail.fillRect(to.x - 4, to.y - 4, 8, 8);
      }

      if (projectile.weapon.id.startsWith('split') && i === trailPoints.length - 1) {
        trail.fillStyle(projectile.color, alpha * 0.2);
        if (projectile.weapon.projectileStyle === 'shard') {
          trail.fillTriangle(to.x - 7, to.y + 3, to.x + 8, to.y, to.x - 7, to.y - 3);
        } else {
          trail.fillCircle(to.x, to.y, 3 + alpha * 2);
        }
      }
    }

    const tip = trailPoints[trailPoints.length - 1];
    if (tip) {
      trail.fillStyle(projectile.color, 0.18);
      trail.fillCircle(tip.x, tip.y, projectile.radius + 2.4);
    }
  }

  splitProjectile(projectile, index) {
    projectile.didSplit = true;

    for (let step = 0; step < projectile.weapon.childCount; step += 1) {
      const spreadIndex = step - Math.floor(projectile.weapon.childCount / 2);
      const angleOffset = spreadIndex * projectile.weapon.childSpread;
      const baseAngle = Math.atan2(projectile.vy, projectile.vx) + angleOffset;
      const speed =
        Math.hypot(projectile.vx, projectile.vy) * projectile.weapon.childSpeedFactor;

      this.spawnProjectile({
        x: projectile.x,
        y: projectile.y,
        vx: Math.cos(baseAngle) * speed,
        vy: Math.sin(baseAngle) * speed + projectile.weapon.childLift,
        color: projectile.weapon.color,
        radius: projectile.weapon.projectileRadius,
        weapon: {
          ...projectile.weapon,
          id: `${projectile.weapon.id}-child`,
          splitDelay: null
        },
        owner: projectile.owner,
        age: 0
      });
    }

    this.particles.explode(16, projectile.x, projectile.y);
    this.destroyProjectile(projectile);
    this.projectiles.splice(index, 1);
  }

  spawnRailDrillFx(x, y, weapon) {
    const ring = this.add.circle(x, y, 6, weapon.explosionCore, 0.85).setDepth(58);
    ring.setStrokeStyle(2, weapon.explosionRing, 0.8);
    ring.setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: ring,
      radius: 18,
      alpha: 0,
      duration: 120,
      ease: 'Cubic.Out',
      onComplete: () => ring.destroy()
    });

    for (let i = 0; i < 5; i += 1) {
      const spark = this.add.rectangle(x, y, 10, 2, weapon.explosionCore, 0.9).setDepth(58);
      spark.rotation = Phaser.Math.FloatBetween(-0.8, 0.8);
      spark.setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: spark,
        x: x + Phaser.Math.Between(-12, 12),
        y: y + Phaser.Math.Between(-8, 8),
        alpha: 0,
        scaleX: Phaser.Math.FloatBetween(1.3, 2.2),
        duration: 110,
        onComplete: () => spark.destroy()
      });
    }
  }

  traceProjectile(x0, y0, x1, y1, projectile) {
    const distance = Phaser.Math.Distance.Between(x0, y0, x1, y1);
    const steps = Math.max(2, Math.ceil(distance / 4));

    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      const x = Phaser.Math.Linear(x0, x1, t);
      const y = Phaser.Math.Linear(y0, y1, t);

      if (this.terrain.isSolid(x, y)) {
        return { x, y, type: 'terrain' };
      }

      for (const tank of this.players) {
        if (!tank.isAlive()) {
          continue;
        }
        if (Phaser.Math.Distance.Between(x, y, tank.x, tank.y - 2) <= 17 + projectile.radius) {
          return { x, y, type: 'tank' };
        }
      }
    }

    return null;
  }

  getTerrainCraterPoint(x, y, radius, surfaceY = this.terrain.getSurfaceY(x)) {
    // Keep craters anchored to the actual impact while nudging them slightly into terrain.
    // This avoids "no visible crater" cases on grazing surface hits and cliff impacts.
    const minCraterY = surfaceY + radius * 0.08;
    const maxCraterY = surfaceY + radius * 0.72;
    const impactBiasedY = y + radius * 0.12;

    return {
      x,
      y: Phaser.Math.Clamp(impactBiasedY, minCraterY, maxCraterY)
    };
  }

  explode(x, y, weapon, owner = null) {
    const surfaceY = this.terrain.getSurfaceY(x);
    const crater = this.getTerrainCraterPoint(x, y, weapon.blastRadius, surfaceY);
    const skimRadius = Math.max(10, weapon.blastRadius * 0.56);
    const skimY = Phaser.Math.Clamp(surfaceY + weapon.blastRadius * 0.05, 0, GAME_HEIGHT - 1);

    this.focusCameraOn(x, y, 220, 1.07);
    this.audioManager.playExplosion(weapon);
    const motionScale = this.getMotionScale();
    if (motionScale > 0) {
      this.cameras.main.shake(
        Math.round(180 * motionScale),
        (0.004 + weapon.blastRadius / 40000) * motionScale
      );
    }
    this.playArcadeImpactFx(x, y, weapon);
    this.spawnFireballExplosion(x, y, weapon);
    this.terrain.deformCircle(crater.x, crater.y, weapon.blastRadius, { profile: 'crater' });
    // A shallow secondary carve guarantees visible surface damage on direct ground hits.
    this.terrain.deformCircle(crater.x, skimY, skimRadius, { drawRim: false, profile: 'scoop' });
    this.terrain.stampImpactDecal(crater.x, crater.y, weapon.blastRadius, weapon);
    this.stabilityActive = true;
    this.markPredictionDirty();
    this.spawnCraterDebris(crater.x, crater.y, weapon);

    const ring = this.add.circle(x, y, 8, weapon.explosionCore, 0.85).setDepth(58);
    ring.setStrokeStyle(3, weapon.explosionRing, 0.9);
    this.tweens.add({
      targets: ring,
      radius: weapon.blastRadius * 1.4,
      alpha: 0,
      duration: 260,
      onComplete: () => ring.destroy()
    });

    const bloom = this.add.circle(x, y, 12, weapon.explosionRing, 0.18).setDepth(57);
    this.tweens.add({
      targets: bloom,
      radius: weapon.blastRadius * 1.9,
      alpha: 0,
      duration: 320,
      ease: 'Sine.Out',
      onComplete: () => bloom.destroy()
    });

    this.particles.explode(Math.floor(weapon.blastRadius * 0.9), x, y);
    let bestHitDistance = Number.POSITIVE_INFINITY;
    const damageMultiplier = this.mutatorSystem?.getDamageMultiplier() ?? 1;

    for (const tank of this.players) {
      const wasAlive = tank.isAlive();
      tank.syncToTerrain(this.terrain);
      const distance = Phaser.Math.Distance.Between(x, y, tank.x, tank.y - 2);
      const maxDistance = weapon.blastRadius + 28;
      if (distance <= maxDistance) {
        const damage = Math.round(weapon.damage * (1 - distance / maxDistance) * damageMultiplier);
        tank.applyDamage(damage);
        this.spawnDamageText(tank.x, tank.y - 26, damage, weapon.damageText);
        this.audioManager.playHit(damage);
        if (damage > 0) {
          bestHitDistance = Math.min(bestHitDistance, distance);
        }
        if (owner && damage > 0) {
          const ownerStats = this.roundStats[owner.name];
          ownerStats.hits += 1;
          ownerStats.damageDealt += damage;
          ownerStats.bestHit = Math.max(ownerStats.bestHit, damage);
          if (distance < 16) {
            ownerStats.directHits += 1;
          }
        }
        this.arcadeEvents?.emit(ARCADE_EVENTS.DAMAGE_APPLIED, {
          turnNumber: this.turnNumber,
          ownerName: owner?.name ?? null,
          targetName: tank.name,
          weaponId: weapon.id,
          damage,
          distance
        });
      }
      if (wasAlive && !tank.isAlive()) {
        this.arcadeEvents?.emit(ARCADE_EVENTS.TANK_DESTROYED, {
          turnNumber: this.turnNumber,
          ownerName: owner?.name ?? null,
          targetName: tank.name,
          weaponId: weapon.id
        });
      }
    }
    if (bestHitDistance < 16) {
      this.triggerHitStop(0.072);
      this.spawnImpactCallout(x, y - 18, 'DIRECT HIT!', '#ffd97f');
    } else if (bestHitDistance < 28) {
      this.triggerHitStop(0.038);
      this.spawnImpactCallout(x, y - 18, 'SOLID HIT', '#ffe8a8');
    }

    // Record miss data for CPU error correction on the next turn
    if (owner && this.isCpuControlledPlayer(this.turnIndex)) {
      const target = this.players.find((t) => t !== owner && t.isAlive());
      if (target) {
        this.cpuLastMiss = { dx: x - target.x, dy: y - (target.y - 2) };
      }
    }

    this.arcadeEvents?.emit(ARCADE_EVENTS.EXPLOSION_RESOLVED, {
      turnNumber: this.turnNumber,
      ownerName: owner?.name ?? null,
      weaponId: weapon.id,
      x,
      y,
      bestHitDistance,
      impactDistanceFromShooter: owner
        ? Phaser.Math.Distance.Between(x, y, owner.x, owner.y - 2)
        : 0
    });

    this.checkWinState();
    this.renderWindRibbon();
    this.syncHud();
    if (!this.gameOver) {
      this.time.delayedCall(260, () => this.resetCameraFocus());
    }
  }

  spawnFireballExplosion(x, y, weapon) {
    const radius = weapon.blastRadius;
    const motionScale = this.getMotionScale();
    const profile = this.getExplosionFxProfile(weapon);
    const fireCore = this.add.circle(x, y, Math.max(10, radius * profile.coreRadiusScale), profile.coreColor, 0.97).setDepth(61);
    fireCore.setBlendMode(Phaser.BlendModes.ADD);
    const fireShell = this.add.circle(x, y, Math.max(16, radius * profile.shellRadiusScale), profile.shellColor, profile.shellAlpha).setDepth(60);
    fireShell.setBlendMode(Phaser.BlendModes.ADD);
    const smokeRing = this.add.circle(x, y, Math.max(14, radius * profile.smokeRadiusScale), profile.smokeColor, profile.smokeAlpha).setDepth(56);
    const afterGlow = this.add.circle(x, y, Math.max(8, radius * 0.18), profile.glowColor, 0.4).setDepth(59);
    afterGlow.setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: fireCore,
      radius: radius * profile.coreExpandScale,
      alpha: 0,
      duration: 180,
      ease: 'Cubic.Out',
      onComplete: () => fireCore.destroy()
    });
    this.tweens.add({
      targets: fireShell,
      radius: radius * profile.shellExpandScale,
      alpha: 0,
      duration: 240,
      ease: 'Quad.Out',
      onComplete: () => fireShell.destroy()
    });
    this.tweens.add({
      targets: smokeRing,
      radius: radius * 1.8,
      alpha: 0,
      duration: 520,
      ease: 'Sine.Out',
      onComplete: () => smokeRing.destroy()
    });
    this.tweens.add({
      targets: afterGlow,
      radius: radius * profile.glowExpandScale,
      alpha: 0,
      duration: 260,
      ease: 'Sine.Out',
      onComplete: () => afterGlow.destroy()
    });

    if (profile.secondaryBursts > 0) {
      for (let i = 0; i < profile.secondaryBursts; i += 1) {
        const angle = (Math.PI * 2 * i) / profile.secondaryBursts + Phaser.Math.FloatBetween(-0.18, 0.18);
        const burst = this.add.circle(
          x + Math.cos(angle) * radius * Phaser.Math.FloatBetween(0.12, 0.28),
          y + Math.sin(angle) * radius * Phaser.Math.FloatBetween(0.12, 0.28),
          Math.max(4, radius * 0.12),
          profile.burstColor,
          0.68
        ).setDepth(60);
        burst.setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: burst,
          radius: radius * Phaser.Math.FloatBetween(0.34, 0.58),
          alpha: 0,
          duration: Phaser.Math.Between(120, 190),
          onComplete: () => burst.destroy()
        });
      }
    }

    this.fireParticles.setConfig({ tint: profile.fireTint });
    this.emberParticles.setConfig({ tint: profile.emberTint });
    this.smokeParticles.setConfig({ tint: profile.smokeTint });
    this.fireParticles.explode(Math.floor(profile.fireCount + radius * 0.7 * motionScale), x, y);
    this.emberParticles.explode(Math.floor(profile.emberCount + radius * 0.55 * motionScale), x, y);
    this.smokeParticles.explode(Math.floor(profile.smokeCount + radius * 0.38 * motionScale), x, y);
  }

  playArcadeImpactFx(x, y, weapon) {
    const profile = this.getExplosionFxProfile(weapon);
    const flashAlpha = Phaser.Math.Clamp(0.1 + weapon.blastRadius / 180, 0.12, 0.28);
    this.tweens.killTweensOf(this.impactFlash);
    this.impactFlash.setAlpha(flashAlpha);
    this.tweens.add({
      targets: this.impactFlash,
      alpha: 0,
      duration: 150,
      ease: 'Quad.Out'
    });

    const outer = this.add.circle(x, y, weapon.blastRadius * 0.26, weapon.explosionRing, 0).setDepth(58);
    outer.setStrokeStyle(profile.ringStrokeWidth, weapon.explosionRing, 0.95);
    outer.setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: outer,
      radius: weapon.blastRadius * profile.outerRingScale,
      alpha: 0,
      duration: 260,
      ease: 'Cubic.Out',
      onComplete: () => outer.destroy()
    });

    const core = this.add.circle(x, y, 10, weapon.explosionCore, 0.95).setDepth(59);
    core.setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: core,
      radius: weapon.blastRadius * 0.9,
      alpha: 0,
      duration: 170,
      ease: 'Quad.Out',
      onComplete: () => core.destroy()
    });

    if (profile.innerRingScale > 0) {
      const inner = this.add.circle(x, y, weapon.blastRadius * 0.18, profile.glowColor, 0).setDepth(59);
      inner.setStrokeStyle(2, profile.burstColor, 0.86);
      inner.setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: inner,
        radius: weapon.blastRadius * profile.innerRingScale,
        alpha: 0,
        duration: 180,
        ease: 'Quad.Out',
        onComplete: () => inner.destroy()
      });
    }

    for (let i = 0; i < profile.shardCount; i += 1) {
      const angle =
        (Math.PI * 2 * i) / profile.shardCount + Phaser.Math.FloatBetween(-profile.shardAngleJitter, profile.shardAngleJitter);
      const shard = this.fxPool?.acquireImpactShard()
        ?? this.add.rectangle(0, 0, 4, 2, 0xffffff, 1).setDepth(58);
      shard.setPosition(
        x + Math.cos(angle) * 8,
        y + Math.sin(angle) * 8
      );
      shard.setSize(
        Phaser.Math.Between(profile.shardWidth[0], profile.shardWidth[1]),
        Phaser.Math.Between(profile.shardHeight[0], profile.shardHeight[1])
      );
      shard.setFillStyle(Phaser.Math.RND.pick(profile.shardPalette), profile.shardAlpha);
      shard.rotation = angle;
      shard.setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * Phaser.Math.Between(profile.shardDistance[0], profile.shardDistance[1]),
        y: y + Math.sin(angle) * Phaser.Math.Between(profile.shardDistance[0], profile.shardDistance[1]),
        alpha: 0,
        scaleX: 0.4,
        duration: Phaser.Math.Between(profile.shardDuration[0], profile.shardDuration[1]),
        ease: 'Cubic.Out',
        onComplete: () => this.releaseFxObject(shard)
      });
    }
  }

  getExplosionFxProfile(weapon) {
    const base = {
      coreColor: weapon.explosionCore,
      shellColor: weapon.explosionRing,
      smokeColor: 0x3f3028,
      glowColor: weapon.explosionCore,
      burstColor: 0xfff1bf,
      fireTint: [weapon.explosionCore, weapon.explosionRing, 0xffb347],
      emberTint: [weapon.explosionCore, weapon.explosionRing, 0xff9342],
      smokeTint: [0x2b2320, 0x42332d, 0x5b4a3f],
      coreRadiusScale: 0.24,
      shellRadiusScale: 0.36,
      smokeRadiusScale: 0.3,
      shellAlpha: 0.68,
      smokeAlpha: 0.34,
      coreExpandScale: 1.05,
      shellExpandScale: 1.45,
      glowExpandScale: 1.2,
      secondaryBursts: 0,
      fireCount: 12,
      emberCount: 8,
      smokeCount: 6,
      ringStrokeWidth: 4,
      outerRingScale: 2.05,
      innerRingScale: 0,
      shardCount: 8,
      shardWidth: [10, 18],
      shardHeight: [2, 4],
      shardPalette: [weapon.explosionCore, weapon.explosionRing, 0xfff1bf],
      shardAlpha: 0.88,
      shardDistance: [44, 86],
      shardDuration: [170, 240],
      shardAngleJitter: 0.24
    };

    switch (weapon.id) {
      case 'mortar':
        return {
          ...base,
          shellAlpha: 0.74,
          smokeAlpha: 0.44,
          coreExpandScale: 1.22,
          shellExpandScale: 1.72,
          glowExpandScale: 1.44,
          secondaryBursts: 2,
          fireCount: 16,
          emberCount: 11,
          smokeCount: 9,
          ringStrokeWidth: 5,
          outerRingScale: 2.2,
          innerRingScale: 0.82,
          shardCount: 10,
          shardWidth: [12, 22],
          shardHeight: [3, 6],
          shardDistance: [54, 110],
          smokeTint: [0x302622, 0x4f3a31, 0x684d40]
        };
      case 'split':
        return {
          ...base,
          glowColor: 0xdffef8,
          burstColor: 0xdffef8,
          secondaryBursts: 3,
          fireTint: [0xdffef8, weapon.explosionRing, 0x8ff7ef],
          emberTint: [0xcdfef4, weapon.explosionRing, 0x67dccc],
          innerRingScale: 0.72,
          shardCount: 9,
          shardWidth: [8, 16],
          shardHeight: [2, 3],
          shardDistance: [48, 90]
        };
      case 'bouncer':
        return {
          ...base,
          coreColor: 0xe8ffd8,
          shellColor: weapon.explosionRing,
          glowColor: 0xd2ffb2,
          smokeColor: 0x35412c,
          secondaryBursts: 2,
          fireTint: [0xe8ffd8, 0x8cff86, weapon.explosionRing],
          emberTint: [0xd8ffbe, 0x7be972, weapon.explosionRing],
          smokeTint: [0x243019, 0x3b4a28, 0x516638],
          innerRingScale: 0.64,
          shardWidth: [10, 16],
          shardHeight: [3, 5]
        };
      case 'rail':
        return {
          ...base,
          smokeAlpha: 0.18,
          glowColor: 0xffffff,
          burstColor: 0xdffbff,
          secondaryBursts: 1,
          fireTint: [0xffffff, 0xd5f7ff, weapon.explosionRing],
          emberTint: [0xf0fdff, 0xbcefff, weapon.explosionRing],
          smokeTint: [0x22313b, 0x31444f, 0x45606e],
          coreExpandScale: 0.86,
          shellExpandScale: 1.12,
          glowExpandScale: 1.46,
          ringStrokeWidth: 3,
          outerRingScale: 1.52,
          innerRingScale: 0.48,
          shardCount: 6,
          shardWidth: [18, 26],
          shardHeight: [2, 3],
          shardDistance: [50, 120],
          shardDuration: [130, 190],
          shardAngleJitter: 0.12
        };
      case 'splitstorm':
        return {
          ...base,
          glowColor: 0xf9f4ff,
          burstColor: 0xe7ddff,
          secondaryBursts: 5,
          fireTint: [0xf4efff, weapon.explosionRing, 0x92e7ff],
          emberTint: [0xe9ddff, 0xc1b0ff, 0x92e7ff],
          smokeTint: [0x261f37, 0x3b2f56, 0x56447b],
          coreExpandScale: 0.92,
          shellExpandScale: 1.22,
          glowExpandScale: 1.56,
          innerRingScale: 0.96,
          shardCount: 12,
          shardWidth: [10, 20],
          shardHeight: [2, 3],
          shardPalette: [weapon.explosionCore, weapon.explosionRing, 0x92e7ff, 0xf9f4ff],
          shardDistance: [46, 96],
          shardDuration: [150, 220]
        };
      case 'hopper':
        return {
          ...base,
          shellAlpha: 0.72,
          smokeAlpha: 0.4,
          glowColor: 0xfff0d5,
          burstColor: 0xffc982,
          secondaryBursts: 3,
          fireTint: [0xfff0d5, weapon.explosionRing, 0xffbb6c],
          emberTint: [0xffdda6, 0xffb563, weapon.explosionRing],
          smokeTint: [0x2d241e, 0x47362a, 0x644935],
          innerRingScale: 0.68,
          shardCount: 9,
          shardWidth: [8, 14],
          shardHeight: [4, 7],
          shardDistance: [40, 80]
        };
      case 'shell':
      default:
        return base;
    }
  }

  releaseFxObject(gameObject) {
    if (this.fxPool) {
      this.fxPool.release(gameObject);
      return;
    }
    gameObject.destroy();
  }

  spawnImpactCallout(x, y, label, color) {
    const callout = this.fxPool?.acquireImpactCallout()
      ?? this.add.text(0, 0, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color
      })
        .setOrigin(0.5)
        .setDepth(74);
    callout.setPosition(x, y);
    callout.setText(label);
    callout.setStyle({
      fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color
    });
    callout.setStroke('#1a1208', 5);
    callout.setShadow(0, 3, '#000000', 8, true, true);
    this.tweens.add({
      targets: callout,
      y: y - 24,
      alpha: 0,
      scale: 1.15,
      duration: 520,
      ease: 'Back.Out',
      onComplete: () => this.releaseFxObject(callout)
    });
  }

  spawnCraterDebris(x, y, weapon) {
    const radius = weapon.blastRadius;
    const profile = this.getDebrisFxProfile(weapon);
    const count = Phaser.Math.Clamp(Math.round(radius / 4) + profile.countOffset, 8, profile.maxCount);
    for (let i = 0; i < count; i += 1) {
      const chip = this.fxPool?.acquireDebrisChip()
        ?? this.add.rectangle(0, 0, 4, 2, 0xffffff, 1).setDepth(57);
      chip.setPosition(
        x + Phaser.Math.Between(-radius * profile.spawnSpread, radius * profile.spawnSpread),
        y - Phaser.Math.Between(profile.spawnLift[0], profile.spawnLift[1])
      );
      chip.setSize(
        Phaser.Math.Between(profile.width[0], profile.width[1]),
        Phaser.Math.Between(profile.height[0], profile.height[1])
      );
      chip.setFillStyle(Phaser.Math.RND.pick(profile.palette), profile.alpha);
      chip.rotation = Phaser.Math.FloatBetween(-profile.rotationJitter, profile.rotationJitter);

      this.tweens.add({
        targets: chip,
        x: chip.x + Phaser.Math.Between(-radius * profile.travelSpread, radius * profile.travelSpread),
        y: chip.y + Phaser.Math.Between(-profile.travelLift[0], profile.travelLift[1]),
        angle: Phaser.Math.Between(-120, 120),
        alpha: profile.fadeToAlpha,
        duration: Phaser.Math.Between(profile.duration[0], profile.duration[1]),
        ease: 'Quad.Out',
        onComplete: () => this.releaseFxObject(chip)
      });
    }
  }

  getDebrisFxProfile(weapon) {
    const base = {
      palette: [0xc9ba8f, 0xa18c63, 0x82684a, 0x67513e],
      alpha: 1,
      fadeToAlpha: 0.18,
      width: [4, 9],
      height: [3, 6],
      countOffset: 0,
      maxCount: 20,
      spawnSpread: 0.42,
      spawnLift: [2, 12],
      travelSpread: 1,
      travelLift: [18, 14],
      duration: [340, 560],
      rotationJitter: 0.65
    };

    switch (weapon.id) {
      case 'mortar':
        return {
          ...base,
          palette: [0x8f6d52, 0x6f523d, 0x544032, 0x3c2f25],
          width: [6, 12],
          height: [4, 8],
          countOffset: 3,
          maxCount: 24,
          duration: [380, 620]
        };
      case 'split':
        return {
          ...base,
          palette: [0xdbfff7, 0x97efe5, 0x68cbbf, 0x5d786f],
          width: [5, 11],
          height: [2, 4],
          countOffset: 1,
          rotationJitter: 1
        };
      case 'bouncer':
        return {
          ...base,
          palette: [0xd7e9aa, 0x91aa6e, 0x6f8250, 0x8a6a4b],
          width: [5, 10],
          height: [4, 7],
          countOffset: 1
        };
      case 'rail':
        return {
          ...base,
          palette: [0xeafcff, 0xb8e6f4, 0x87b6c4, 0x60727d],
          width: [8, 16],
          height: [1, 3],
          countOffset: -1,
          spawnSpread: 0.32,
          travelSpread: 1.3,
          rotationJitter: 1.2,
          duration: [260, 420]
        };
      case 'splitstorm':
        return {
          ...base,
          palette: [0xf2eaff, 0xc7b4ff, 0x92e7ff, 0x655c86],
          width: [7, 15],
          height: [2, 4],
          countOffset: 2,
          rotationJitter: 1.1
        };
      case 'hopper':
        return {
          ...base,
          palette: [0xffd29a, 0xffb367, 0xb57a45, 0x5f4637],
          width: [7, 13],
          height: [5, 9],
          countOffset: 2,
          maxCount: 22,
          duration: [360, 600]
        };
      case 'shell':
      default:
        return base;
    }
  }

  spawnDamageText(x, y, damage, color) {
    if (damage <= 0) {
      return;
    }

    const bigHit = damage >= 26;
    const text = this.fxPool?.acquireDamageText()
      ?? this.add.text(0, 0, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: bigHit ? '28px' : '22px',
        fontStyle: 'bold',
        color
      })
        .setOrigin(0.5)
        .setDepth(70);
    text.setPosition(x, y);
    text.setText(`-${damage}`);
    text.setStyle({
      fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
      fontSize: bigHit ? '28px' : '22px',
      fontStyle: 'bold',
      color
    });
    text.setStroke('#1a1208', bigHit ? 5 : 3);
    text.setShadow(0, 2, '#000000', 6, true, true);

    this.tweens.add({
      targets: text,
      y: y - (bigHit ? 34 : 26),
      alpha: 0,
      scale: bigHit ? 1.26 : 1.15,
      duration: bigHit ? 620 : 520,
      ease: bigHit ? 'Back.Out' : 'Cubic.Out',
      onComplete: () => this.releaseFxObject(text)
    });
  }

  playKoFinisher() {
    if (!this.winner) {
      return;
    }

    const loser = this.players.find((tank) => tank !== this.winner);
    const x = loser?.x ?? GAME_WIDTH * 0.5;
    const y = loser?.y ?? GAME_HEIGHT * 0.5;
    const motionScale = this.getMotionScale();

    this.triggerHitStop(0.1);
    if (motionScale > 0) {
      this.cameras.main.shake(Math.round(220 * motionScale), 0.006 * motionScale);
    }
    this.spawnImpactCallout(x, y - 54, 'K.O.', '#ffb45f');
    this.particles.explode(24, x, y - 10);

    const koText = this.add
      .text(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.32, 'FINISHER', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '52px',
        fontStyle: 'bold',
        color: '#ffdca0'
      })
      .setOrigin(0.5)
      .setDepth(96)
      .setStroke('#1a1208', 7);
    koText.setShadow(0, 3, '#000000', 10, true, true);
    this.tweens.add({
      targets: koText,
      alpha: 0,
      y: koText.y - 20,
      duration: 620,
      ease: 'Cubic.Out',
      onComplete: () => koText.destroy()
    });
  }

  checkWinState() {
    const living = this.players.filter((tank) => tank.isAlive());
    if (living.length > 1) {
      return;
    }

    this.gameOver = true;
    this.battleMusicActive = false;
    this.resolving = false;
    this.turnPending = false;
    this.winner = living[0] ?? null;
    if (this.winner) {
      this.highscores = this.scoreStore.recordWin(this.winner.name);
      this.playKoFinisher();
    }
    this.audioManager.playGameOver({ winner: Boolean(this.winner) });
    const banner = this.winner ? `${this.winner.name} wins` : 'Draw';
    this.showTurnBanner(banner);
    this.arcadeEvents?.emit(ARCADE_EVENTS.ROUND_ENDED, {
      turnNumber: this.turnNumber,
      winnerName: this.winner?.name ?? null,
      roundStats: this.roundStats
    });
    this.showGameOverOverlay();
    this.syncHud();
  }

  advanceTurn() {
    this.turnPending = false;
    if (this.gameOver) {
      return;
    }

    this.arcadeEvents?.emit(ARCADE_EVENTS.TURN_ENDED, {
      turnNumber: this.turnNumber,
      playerName: this.getActivePlayer()?.name ?? ''
    });

    this.turnNumber += 1;
    this.turnIndex = getNextActivePlayerIndex(this.players, this.turnIndex);

    this.remainingMove = MOVE_PER_TURN;
    this.turnPhase = 'move';
    this.moveTimer = MOVE_TIME_LIMIT;
    this.aimTimer = AIM_TIME_LIMIT;
    let nextWind = this.weather.applyStormWind(this.rollWind(), WIND_LIMIT);
    const mutatorEffect = this.mutatorSystem?.onTurnStart({
      turnNumber: this.turnNumber,
      playerName: this.getActivePlayer()?.name ?? '',
      phase: this.turnPhase,
      wind: nextWind
    });
    if (typeof mutatorEffect?.windOverride === 'number') {
      nextWind = mutatorEffect.windOverride;
    }
    this.wind = nextWind;
    this.resolving = false;
    this.stabilityActive = true;
    this.cpuState = null;
    // Clear miss memory when it's no longer the CPU's turn
    if (!this.isCpuControlledPlayer((this.turnIndex + 1) % this.players.length)) {
      this.cpuLastMiss = null;
    }

    this.players.forEach((tank) => tank.syncToTerrain(this.terrain));
    this.positionWindsock();
    this.audioManager.setWind(this.wind);
    this.renderWindRibbon();
    this.markPredictionDirty();
    this.emitTimerUpdate();
    this.presentTurnOverlay();
  }

  drawPrediction() {
    if (!this.predictionDirty) {
      return;
    }

    const player = this.getActivePlayer();
    const weapon = getWeapon(player.weaponIndex);
    const origin = player.getFireOrigin();
    const angle = player.getWorldAngle();
    let x = origin.x;
    let y = origin.y;
    let vx = Math.cos(angle) * player.power * weapon.speedFactor;
    let vy = Math.sin(angle) * player.power * weapon.speedFactor;
    const direction = Math.abs(this.wind) < 4 ? 0 : Math.sign(this.wind);
    const windColor = direction === 0 ? 0xf4f1df : direction > 0 ? 0xf2b84b : 0x7fe7dc;
    const alpha = 0.52 + Math.min(0.36, Math.abs(this.wind) / 140);

    this.prediction.clear();
    this.prediction.lineStyle(2, windColor, alpha);

    let started = false;
    const step = 0.065;
    for (let elapsed = 0; elapsed < weapon.predictionTime; elapsed += step) {
      vx += this.wind * weapon.windScale * step;
      vy += GRAVITY * weapon.gravityScale * this.getGravityMultiplier() * step;
      x += vx * step;
      y += vy * step;

      if (x < 0 || x > GAME_WIDTH || y > GAME_HEIGHT) {
        break;
      }

      if (this.terrain.isSolid(x, y)) {
        break;
      }

      if (!started) {
        this.prediction.beginPath();
        this.prediction.moveTo(x, y);
        started = true;
      } else {
        this.prediction.lineTo(x, y);
      }

      if (started && direction !== 0 && Math.floor(elapsed / (step * 3)) !== Math.floor((elapsed - step) / (step * 3))) {
        const tailX = x - direction * (6 + Math.abs(this.wind) / 12);
        this.prediction.moveTo(tailX, y - 3);
        this.prediction.lineTo(x, y);
        this.prediction.lineTo(tailX, y + 3);
      }
    }

    this.prediction.strokePath();

    // For bouncer: mark the first bounce point with a small ring
    if (weapon.maxBounces && started) {
      this.prediction.lineStyle(2, windColor, alpha * 0.8);
      this.prediction.strokeCircle(x, y, 6);
      this.prediction.lineStyle(1, windColor, alpha * 0.4);
      this.prediction.strokeCircle(x, y, 10);
    }

    this.predictionVisible = started;
    this.predictionDirty = false;
  }

  renderWindRibbon() {
    this.windRibbon.clear();
    // Keep the ribbon in its own lower HUD lane so center text stays unobstructed.
    const panelX = GAME_WIDTH * 0.5 - 170;
    const panelY = 112;
    const panelWidth = 340;
    const panelHeight = 20;
    const centerX = GAME_WIDTH * 0.5;
    const y = panelY + panelHeight * 0.5;
    const magnitude = Math.abs(this.wind);
    const normalized = Phaser.Math.Clamp(magnitude / WIND_LIMIT, 0, 1);
    const size = Phaser.Math.Clamp(normalized * 112, 0, 112);
    const direction = Math.abs(this.wind) < 4 ? 0 : Math.sign(this.wind);
    const color = direction >= 0 ? 0xf2b84b : 0x7fe7dc;

    this.windRibbon.fillStyle(0x08121a, 0.52);
    this.windRibbon.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 10);
    this.windRibbon.lineStyle(1, 0xffffff, 0.08);
    this.windRibbon.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 10);

    this.windRibbon.lineStyle(2, 0xffffff, 0.18);
    this.windRibbon.beginPath();
    this.windRibbon.moveTo(centerX, panelY + 4);
    this.windRibbon.lineTo(centerX, panelY + panelHeight - 4);
    this.windRibbon.strokePath();

    this.windRibbon.lineStyle(1, 0xffffff, 0.08);
    this.windRibbon.beginPath();
    this.windRibbon.moveTo(panelX + 14, y);
    this.windRibbon.lineTo(panelX + panelWidth - 14, y);
    this.windRibbon.strokePath();

    if (direction === 0) {
      this.windRibbon.fillStyle(0xf4f1df, 0.92);
      this.windRibbon.fillCircle(centerX, y, 3);
      return;
    }

    this.windRibbon.lineStyle(4, color, 0.95);
    this.windRibbon.beginPath();
    this.windRibbon.moveTo(centerX, y);
    this.windRibbon.lineTo(centerX + direction * size, y);
    this.windRibbon.strokePath();

    this.windRibbon.fillStyle(color, 0.98);
    this.windRibbon.beginPath();
    this.windRibbon.moveTo(centerX + direction * size, y);
    this.windRibbon.lineTo(centerX + direction * (size - 12), y - 6);
    this.windRibbon.lineTo(centerX + direction * (size - 12), y + 6);
    this.windRibbon.closePath();
    this.windRibbon.fillPath();
  }

  showTurnBanner(text) {
    this.events.emit(GAME_SCENE_EVENTS.TURN_BANNER, text);
  }

  syncHud() {
    this.events.emit(GAME_SCENE_EVENTS.HUD_UPDATE, this.getHudState());
  }

  getHudState() {
    const moveTimer = this.moveTimer ?? MOVE_TIME_LIMIT;
    const aimTimer = this.aimTimer ?? AIM_TIME_LIMIT;
    const activeTimer = this.turnPhase === 'move' ? moveTimer : aimTimer;
    const players = Array.isArray(this.players) ? this.players : [];

    return {
      activePlayerIndex: this.turnIndex,
      activePlayerName: this.getActivePlayer()?.name ?? '',
      phase: this.turnPhase,
      objective: OBJECTIVE_TEXT,
      mode: this.getModeLabel(),
      wind: this.wind,
      windDirection: this.getWindDirectionLabel(),
      windStrength: this.getWindStrengthLabel(),
      windEffect: this.getWindEffectText(),
      turnNumber: this.turnNumber ?? 1,
      remainingMove: this.remainingMove,
      players: players.map((player) => {
        const w = getWeapon(player.weaponIndex);
        const ammoCount = player.getAmmo(w.id);
        const ammoText = w.ammo === null ? '' : ` (${ammoCount === Infinity ? '∞' : ammoCount})`;
        const rarityText = w.rarity ? ` [${w.rarity.toUpperCase()}]` : '';
        return {
          name: player.name,
          hp: player.hp,
          pitch: Math.round(player.pitch),
          power: Math.round(player.power),
          weapon: w.label + rarityText + ammoText,
          weaponLabel: w.label,
          weaponRarity: w.rarity ?? null,
          wins: this.highscores[player.name] ?? 0
        };
      }),
      gameOver: this.gameOver,
      winner: this.winner?.name ?? null,
      turnTimer: Math.ceil(activeTimer),
      moveTimer: Math.ceil(moveTimer),
      aimTimer: Math.ceil(aimTimer),
      moveTimerTotal: MOVE_TIME_LIMIT,
      aimTimerTotal: AIM_TIME_LIMIT,
      isCpuTurn: this.isCpuControlledPlayer(),
      weather: this.weather?.getLabel() ?? '',
      mutator: this.mutatorSystem?.getHudLabel() ?? '',
      reducedMotion: this.reducedMotion,
      arcade: this.arcadeScoring?.getSnapshot() ?? { players: {} }
    };
  }

  getAutomationState() {
    const activePlayer = this.getActivePlayer();
    const hud = this.getHudState();

    return {
      coordinateSystem: 'origin top-left; +x right; +y down',
      scene: SCENE_KEYS.GAME,
      overlay: this.overlayState
        ? {
          type: this.overlayState.type ?? null,
          title: this.overlayState.title ?? '',
          prompt: this.overlayState.prompt ?? ''
        }
        : null,
      mode: this.currentMode,
      turn: {
        number: this.turnNumber ?? 0,
        phase: this.turnPhase ?? null,
        activePlayer: activePlayer?.name ?? null,
        isCpuTurn: this.isCpuControlledPlayer(),
        moveRemaining: this.remainingMove ?? 0,
        moveTimer: this.moveTimer ?? 0,
        aimTimer: this.aimTimer ?? 0
      },
      wind: {
        value: Number((this.wind ?? 0).toFixed(2)),
        direction: this.getWindDirectionLabel(),
        strength: this.getWindStrengthLabel(),
        effect: this.getWindEffectText()
      },
      weather: this.weather?.getLabel() ?? '',
      gameOver: Boolean(this.gameOver),
      winner: this.winner?.name ?? null,
      players: (this.players ?? []).map((player) => {
        const weapon = getWeapon(player.weaponIndex);
        const ammo = player.getAmmo(weapon.id);
        return {
          name: player.name,
          x: Number(player.x.toFixed(1)),
          y: Number(player.y.toFixed(1)),
          hp: player.hp,
          pitch: Number(player.pitch.toFixed(1)),
          power: Number(player.power.toFixed(1)),
          facing: player.facing,
          alive: player.isAlive(),
          weapon: weapon.id,
          ammo: ammo === Infinity ? 'infinity' : ammo
        };
      }),
      projectiles: (this.projectiles ?? []).map((projectile) => ({
        weapon: projectile.weapon.id,
        x: Number(projectile.x.toFixed(1)),
        y: Number(projectile.y.toFixed(1)),
        vx: Number(projectile.vx.toFixed(1)),
        vy: Number(projectile.vy.toFixed(1)),
        bouncesLeft: projectile.bouncesLeft ?? 0
      })),
      hud: {
        activePlayerName: hud.activePlayerName,
        objective: hud.objective,
        players: hud.players,
        mutator: hud.mutator,
        reducedMotion: hud.reducedMotion
      }
    };
  }

  clearProjectiles() {
    if (!this.projectiles) {
      return;
    }

    this.projectiles.forEach((projectile) => {
      projectile.trail?.destroy();
      projectile.sprite.destroy();
    });
    this.projectiles = [];
  }
}
