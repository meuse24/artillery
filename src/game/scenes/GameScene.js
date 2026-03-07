import Phaser from 'phaser';
import {
  AIM_SPEED,
  BARREL_LENGTH,
  GAME_HEIGHT,
  GAME_WIDTH,
  GRAVITY,
  MAX_PITCH,
  MIN_PITCH,
  MOVE_PER_TURN,
  MOVE_SPEED,
  PLAYER_COLORS,
  PLAYER_NAMES,
  POWER_STEP,
  TURN_TIME_LIMIT,
  WIND_LIMIT
} from '../constants.js';
import { Tank } from '../entities/Tank.js';
import { AudioManager } from '../systems/AudioManager.js';
import { ScoreStore } from '../systems/ScoreStore.js';
import { Terrain } from '../systems/Terrain.js';
import { WEAPONS, getWeapon } from '../weapons.js';
import { WeatherSystem } from '../systems/WeatherSystem.js';

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
    super('game');
  }

  create() {
    this.createBackdrop();

    this.audioManager = new AudioManager();
    this.scoreStore = new ScoreStore(PLAYER_NAMES);
    this.highscores = this.scoreStore.load();
    this.currentMode = 'cpu';
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

    this.prediction = this.add.graphics().setDepth(45);
    this.muzzleFlash = this.add.circle(0, 0, 8, 0xffd98c, 0).setDepth(55);
    this.windRibbon = this.add.graphics().setDepth(7);
    this.impactFlash = this.add
      .rectangle(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5, GAME_WIDTH, GAME_HEIGHT, 0xffe1a6, 0)
      .setDepth(95);
    this.impactFlash.setBlendMode(Phaser.BlendModes.ADD);

    this.inputKeys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      j: Phaser.Input.Keyboard.KeyCodes.J,
      l: Phaser.Input.Keyboard.KeyCodes.L,
      q: Phaser.Input.Keyboard.KeyCodes.Q,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      h: Phaser.Input.Keyboard.KeyCodes.H,
      m: Phaser.Input.Keyboard.KeyCodes.M,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      r: Phaser.Input.Keyboard.KeyCodes.R
    });

    // Mouse / pointer input
    this.mouseMoveTarget = null;
    this.touchAimState = null;
    this.mobileFullscreenRequested = false;

    this.input.on('pointermove', (pointer) => {
      if (this.overlayState || this.gameOver || this.resolving || this.isCpuControlledPlayer()) return;
      if (this.turnPhase !== 'aim') return;

      if (this.touchAimState && this.isTouchPointer(pointer) && pointer.id === this.touchAimState.pointerId) {
        this.mouseAim(pointer);
        const player = this.getActivePlayer();
        const deltaY = this.touchAimState.startY - pointer.worldY;
        player.setPower(this.touchAimState.basePower + deltaY * 1.2);
        this.touchAimState.moved =
          this.touchAimState.moved ||
          Math.abs(pointer.worldX - this.touchAimState.startX) > 6 ||
          Math.abs(deltaY) > 6;
        this.markPredictionDirty();
        this.syncHud();
        return;
      }

      this.mouseAim(pointer);
    });

    this.input.on('pointerdown', (pointer) => {
      const touchPointer = this.isTouchPointer(pointer);
      if (touchPointer) {
        this.ensureMobileFullscreen();
      }
      if (!touchPointer && !pointer.leftButtonDown()) return;
      if (this.overlayState || this.gameOver || this.resolving || this.isCpuControlledPlayer()) return;
      if (this.turnPhase === 'aim') {
        if (touchPointer) {
          const player = this.getActivePlayer();
          this.touchAimState = {
            pointerId: pointer.id,
            startX: pointer.worldX,
            startY: pointer.worldY,
            basePower: player.power,
            moved: false
          };
          this.mouseAim(pointer);
          this.syncHud();
          return;
        }
        this.mouseAim(pointer);
        this.fireActiveWeapon();
        this.syncHud();
      } else if (this.turnPhase === 'move') {
        const player = this.getActivePlayer();
        const tapDistance = Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, player.x, player.y);
        if (tapDistance < 44) {
          this.mouseMoveTarget = null;
          this.enterAimPhase();
          return;
        }
        this.mouseMoveTarget = Phaser.Math.Clamp(pointer.worldX, 48, GAME_WIDTH - 48);
      }
    });

    this.input.on('pointerup', (pointer) => {
      if (!this.touchAimState) return;
      if (!this.isTouchPointer(pointer)) return;
      if (pointer.id !== this.touchAimState.pointerId) return;

      const canResolve =
        !this.overlayState &&
        !this.gameOver &&
        !this.resolving &&
        !this.isCpuControlledPlayer() &&
        this.turnPhase === 'aim';
      if (canResolve) {
        this.mouseAim(pointer);
        this.fireActiveWeapon();
        this.syncHud();
      }
      this.touchAimState = null;
    });

    this.input.on('wheel', (_ptr, _objs, _dx, deltaY) => {
      if (this.overlayState || this.gameOver || this.resolving || this.isCpuControlledPlayer()) return;
      if (this.turnPhase !== 'aim') return;
      const player = this.getActivePlayer();
      const dir = deltaY > 0 ? -1 : 1;
      player.setPower(player.power + dir * POWER_STEP * 0.22);
      this.markPredictionDirty();
      this.syncHud();
    });

    this.installAudioUnlock();

    this.startMatch({ showTurnOverlay: false });
    this.showStartOverlay();

    this.scale.on('resize', () => {
      this.renderWindRibbon();
      this.drawArcadeGrade();
      this.syncHud();
    });
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

  triggerHitStop(duration = 0.06) {
    this.hitStopTimer = Math.max(this.hitStopTimer, duration);
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
    let next = player.weaponIndex;
    for (let i = 0; i < WEAPONS.length; i += 1) {
      next = ((next + direction) % WEAPONS.length + WEAPONS.length) % WEAPONS.length;
      if (player.getAmmo(WEAPONS[next].id) > 0) {
        player.setWeaponIndex(next);
        return;
      }
    }
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
    this.cpuState = null;
    this.cpuLastMiss = null;

    this.turnIndex = Phaser.Math.Between(0, 1);
    this.remainingMove = MOVE_PER_TURN;
    this.turnPhase = 'move';
    this.turnTimer = TURN_TIME_LIMIT;
    this.resolving = false;
    this.turnPending = false;
    this.gameOver = false;
    this.winner = null;
    this.wind = this.rollWind();
    this.weather.rollCondition();
    this.weather.activate();
    this.ambientAccumulator = 0;
    this.stabilityAccumulator = 0;
    this.clearOverlay();
    this.stabilityActive = true;
    this.resetCameraFocus(1);
    this.audioManager.setWind(this.wind);
    this.renderWindRibbon();
    this.markPredictionDirty();
    this.syncHud();

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

  positionWindsock() {
    const x = GAME_WIDTH * 0.5;
    const y = this.terrain.getSurfaceY(x);
    this.windsockPole.setPosition(x, y - 34);
    this.windsock.setPosition(x + 2, y - 62);
    this.windsockStripe.setPosition(x + 14, y - 62);
  }

  overlayActive() {
    return Boolean(this.overlayState);
  }

  showOverlay(payload) {
    this.overlayState = payload;
    this.events.emit('overlay:update', payload);
  }

  clearOverlay() {
    this.overlayState = null;
    this.events.emit('overlay:update', null);
  }

  showStartOverlay() {
    this.showOverlay({
      type: 'start',
      title: 'CRATER COMMAND',
      body: [
        'Wind bends every shot.',
        'Crater the hill. Finish the tank.'
      ].join('\n'),
      scoreboard: PLAYER_NAMES.map((name) => `${name}: ${this.highscores[name] ?? 0} wins`).join('\n'),
      scores: PLAYER_NAMES.map((name) => ({
        name,
        wins: this.highscores[name] ?? 0
      })),
      kicker: 'ARCADE TANK DUEL',
      tagline: 'Read the wind. Break the hill. Every map is different.',
      modeLabel: this.getModeLabel(),
      modeKey: this.currentMode,
      hint: 'Click/Tap start  |  H/Help  |  M or Switch Mode link',
      prompt: 'Click/Tap, Space or Enter to start'
    });
  }

  presentTurnOverlay() {
    const player = this.getActivePlayer();
    this.showTurnBanner(`${player.name} move phase`);
    this.audioManager.playTurn();
    this.showOverlay({
      type: 'turn',
      title: `${player.name} Turn`,
      body: [
        this.isCpuControlledPlayer()
          ? 'CPU is checking wind, terrain and shot power.'
          : 'Pass the device to the next player.',
        '',
        'Phase 1: Move with keys or click/tap ground.',
        'Phase 2: Aim, set power, choose weapon, then fire.'
      ].join('\n'),
      scoreboard: this.buildScoreboardText(),
      prompt: this.isCpuControlledPlayer()
        ? 'CPU thinking...'
        : 'Click/Tap, Space or Enter when ready  |  H or Help button'
    });
    this.syncHud();

    if (this.isCpuControlledPlayer()) {
      this.time.delayedCall(900, () => {
        if (this.overlayState?.type === 'turn' && this.isCpuControlledPlayer()) {
          this.clearOverlay();
          this.startCpuTurn();
          this.syncHud();
        }
      });
    }
  }

  showGameOverOverlay() {
    const winnerLine = this.winner ? `${this.winner.name} wins the round.` : 'The round ends in a draw.';
    this.showOverlay({
      type: 'gameover',
      title: 'Round Over',
      body: [
        winnerLine,
        this.getModeLabel(),
        '',
        'Objective',
        OBJECTIVE_TEXT,
        '',
        'Round Stats',
        this.getRoundStatsText()
      ].join('\n'),
      scoreboard: this.buildScoreboardText(),
      prompt: 'Click/Tap, Space, Enter or R for a new round  |  M/switch mode link  |  H/Help'
    });
  }

  buildScoreboardText() {
    return [
      'Highscore',
      ...PLAYER_NAMES.map((name) => `${name}: ${this.highscores[name] ?? 0} wins`)
    ].join('\n');
  }

  buildHelpBody() {
    return [
      'Objective',
      'Bring the enemy tank down to 0 HP before yours is destroyed.',
      '',
      'Round Flow',
      '1. Move Phase: use Left/Right or click/tap ground to move.',
      '2. End Move early with Space or click/tap your own tank.',
      '3. Aim Phase: use mouse/touch drag or keys, adjust power, then fire.',
      '4. The projectile resolves, the terrain deforms and the turn changes.',
      '',
      'Damage',
      'Explosions deal more damage near the center and less at the edge.',
      'Cratered terrain changes future lines of fire and can expose tanks.'
    ].join('\n');
  }

  buildHelpSidebar() {
    return [
      'Controls',
      'Move: Left/Right or click/tap ground',
      'Skip Move: Space or click/tap own tank',
      'Aim: mouse/touch drag or Up/Down',
      'Power: mouse wheel, drag vertical, or A/D / J/L',
      'Fire: click, touch release, or Space',
      'Weapon: Q/E or mobile Weapon button',
      'Overlay confirm: click/tap, Space, or Enter',
      'Help: H, Esc, or mobile Help button',
      'Restart: R or click/tap on game-over',
      '',
      'Weapons',
      'Basic Shell: balanced standard shot',
      'Heavy Mortar: slower shell, bigger blast',
      'Split Shot: breaks into 3 bomblets mid-air',
      'Bouncer: bounces up to 3x off terrain',
      '',
      'Tips',
      'Watch the wind before every shot.',
      'Use craters to create direct hits next turn.',
      'Move only enough to improve the angle.',
      '',
      'Modes',
      `${this.getModeLabel()} active`,
      'Switch mode via M or the Switch Mode link on start/round-over.'
    ].join('\n');
  }

  showHelpOverlay() {
    this.showOverlay({
      type: 'help',
      previousOverlay: this.overlayState ? { ...this.overlayState } : null,
      title: 'Help',
      body: this.buildHelpBody(),
      scoreboard: this.buildHelpSidebar(),
      prompt: 'Click/Tap, Esc, H, Space or Enter to close help'
    });
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

    // Bouncer: never used by CPU (bounce simulation not implemented)
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

    const gravMod = this.weather.gravityModifier();
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
          const weaponBonus = weaponIndex === 1 && Math.abs(target.x - player.x) < 200 ? -20 : 0;
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
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.inputKeys.h)) {
      this.showHelpOverlay();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.inputKeys.r)) {
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
      this.clearOverlay();
      this.presentTurnOverlay();
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
        (this.inputKeys.d.isDown || this.inputKeys.l.isDown ? 1 : 0) -
        (this.inputKeys.a.isDown || this.inputKeys.j.isDown ? 1 : 0);
      if (powerAxis !== 0) {
        player.setPower(player.power + powerAxis * POWER_STEP * dt);
        this.markPredictionDirty();
        hudDirty = true;
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

      if (Phaser.Input.Keyboard.JustDown(this.inputKeys.space)) {
        this.fireActiveWeapon();
        hudDirty = true;
      }
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

    this.turnTimer = Math.max(0, this.turnTimer - dt);
    this.events.emit('timer:update', this.turnTimer, TURN_TIME_LIMIT);

    if (this.turnTimer <= 0) {
      if (this.turnPhase === 'move') {
        this.enterAimPhase();
      } else {
        // Auto-fire when aim timer runs out
        this.fireActiveWeapon();
      }
    }
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
    this.markPredictionDirty();
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
    const sprite = this.add.circle(config.x, config.y, config.radius, config.color, 1).setDepth(50);
    sprite.setStrokeStyle(2, 0xffffff, 0.55);
    sprite.setBlendMode(Phaser.BlendModes.ADD);
    const trail = this.add.graphics().setDepth(49);

    this.projectiles.push({
      ...config,
      sprite,
      trail,
      trailPoints: [],
      bouncesLeft: config.weapon.maxBounces ?? 0
    });
  }

  spawnBounceFlash(x, y, weapon) {
    const flash = this.add.circle(x, y, 5, weapon.color, 0.72).setDepth(58);
    this.tweens.add({
      targets: flash,
      radius: 13,
      alpha: 0,
      duration: 130,
      onComplete: () => flash.destroy()
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
      projectile.vy += GRAVITY * projectile.weapon.gravityScale * this.weather.gravityModifier() * dt;
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.trailPoints.push({ x: projectile.x, y: projectile.y, age: projectile.age });
      if (projectile.trailPoints.length > projectile.weapon.trailLength) {
        projectile.trailPoints.shift();
      }
      this.drawProjectileTrail(projectile);

      if (projectile.weapon.id === 'split' && !projectile.didSplit && projectile.age >= projectile.weapon.splitDelay) {
        this.splitProjectile(projectile, i);
        continue;
      }

      const collision = this.traceProjectile(previousX, previousY, projectile.x, projectile.y, projectile);
      projectile.sprite.setPosition(projectile.x, projectile.y);

      if (collision) {
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
          this.spawnBounceFlash(collision.x, collision.y, projectile.weapon);
          continue;
        }

        this.explode(collision.x, collision.y, projectile.weapon, projectile.owner);
        projectile.trail.destroy();
        projectile.sprite.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }

      if (projectile.x < -40 || projectile.x > GAME_WIDTH + 40 || projectile.y > GAME_HEIGHT + 60) {
        projectile.trail.destroy();
        projectile.sprite.destroy();
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

      if (projectile.weapon.id.startsWith('split') && i === trailPoints.length - 1) {
        trail.fillStyle(projectile.color, alpha * 0.2);
        trail.fillCircle(to.x, to.y, 3 + alpha * 2);
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
    projectile.trail.destroy();
    projectile.sprite.destroy();
    this.projectiles.splice(index, 1);
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
    this.cameras.main.shake(180, 0.004 + weapon.blastRadius / 40000);
    this.playArcadeImpactFx(x, y, weapon);
    this.terrain.deformCircle(crater.x, crater.y, weapon.blastRadius, { profile: 'crater' });
    // A shallow secondary carve guarantees visible surface damage on direct ground hits.
    this.terrain.deformCircle(crater.x, skimY, skimRadius, { drawRim: false, profile: 'scoop' });
    this.terrain.stampImpactDecal(crater.x, crater.y, weapon.blastRadius, weapon);
    this.stabilityActive = true;
    this.markPredictionDirty();
    this.spawnCraterDebris(crater.x, crater.y, weapon.blastRadius);

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

    for (const tank of this.players) {
      tank.syncToTerrain(this.terrain);
      const distance = Phaser.Math.Distance.Between(x, y, tank.x, tank.y - 2);
      const maxDistance = weapon.blastRadius + 28;
      if (distance <= maxDistance) {
        const damage = Math.round(weapon.damage * (1 - distance / maxDistance));
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

    this.checkWinState();
    this.renderWindRibbon();
    this.syncHud();
    if (!this.gameOver) {
      this.time.delayedCall(260, () => this.resetCameraFocus());
    }
  }

  playArcadeImpactFx(x, y, weapon) {
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
    outer.setStrokeStyle(4, weapon.explosionRing, 0.92);
    outer.setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: outer,
      radius: weapon.blastRadius * 2.05,
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

    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8 + Phaser.Math.FloatBetween(-0.24, 0.24);
      const shard = this.add.rectangle(
        x + Math.cos(angle) * 8,
        y + Math.sin(angle) * 8,
        Phaser.Math.Between(10, 18),
        Phaser.Math.Between(2, 4),
        Phaser.Math.RND.pick([weapon.explosionCore, weapon.explosionRing, 0xfff1bf]),
        0.86
      );
      shard.rotation = angle;
      shard.setDepth(58);
      shard.setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * Phaser.Math.Between(44, 86),
        y: y + Math.sin(angle) * Phaser.Math.Between(44, 86),
        alpha: 0,
        scaleX: 0.4,
        duration: Phaser.Math.Between(170, 240),
        ease: 'Cubic.Out',
        onComplete: () => shard.destroy()
      });
    }
  }

  spawnImpactCallout(x, y, label, color) {
    const callout = this.add
      .text(x, y, label, {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '28px',
        fontStyle: 'bold',
        color
      })
      .setOrigin(0.5)
      .setDepth(74)
      .setStroke('#1a1208', 5);
    callout.setShadow(0, 3, '#000000', 8, true, true);
    this.tweens.add({
      targets: callout,
      y: y - 24,
      alpha: 0,
      scale: 1.15,
      duration: 520,
      ease: 'Back.Out',
      onComplete: () => callout.destroy()
    });
  }

  spawnCraterDebris(x, y, radius) {
    const count = Phaser.Math.Clamp(Math.round(radius / 4), 8, 18);
    for (let i = 0; i < count; i += 1) {
      const chip = this.add.rectangle(
        x + Phaser.Math.Between(-radius * 0.4, radius * 0.4),
        y - Phaser.Math.Between(2, 10),
        Phaser.Math.Between(3, 8),
        Phaser.Math.Between(2, 5),
        Phaser.Math.RND.pick([0xd7e9aa, 0x91aa6e, 0x6f8250, 0x8a6a4b]),
        0.9
      );
      chip.setDepth(57);
      chip.rotation = Phaser.Math.FloatBetween(-0.4, 0.4);

      this.tweens.add({
        targets: chip,
        x: chip.x + Phaser.Math.Between(-radius, radius),
        y: chip.y + Phaser.Math.Between(-18, 14),
        angle: Phaser.Math.Between(-120, 120),
        alpha: 0,
        duration: Phaser.Math.Between(320, 520),
        ease: 'Quad.Out',
        onComplete: () => chip.destroy()
      });
    }
  }

  spawnDamageText(x, y, damage, color) {
    if (damage <= 0) {
      return;
    }

    const bigHit = damage >= 26;
    const text = this.add
      .text(x, y, `-${damage}`, {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: bigHit ? '28px' : '22px',
        fontStyle: 'bold',
        color
      })
      .setOrigin(0.5)
      .setDepth(70)
      .setStroke('#1a1208', bigHit ? 5 : 3);
    text.setShadow(0, 2, '#000000', 6, true, true);

    this.tweens.add({
      targets: text,
      y: y - (bigHit ? 34 : 26),
      alpha: 0,
      scale: bigHit ? 1.26 : 1.15,
      duration: bigHit ? 620 : 520,
      ease: bigHit ? 'Back.Out' : 'Cubic.Out',
      onComplete: () => text.destroy()
    });
  }

  checkWinState() {
    const living = this.players.filter((tank) => tank.isAlive());
    if (living.length > 1) {
      return;
    }

    this.gameOver = true;
    this.resolving = false;
    this.turnPending = false;
    this.winner = living[0] ?? null;
    if (this.winner) {
      this.highscores = this.scoreStore.recordWin(this.winner.name);
    }
    const banner = this.winner ? `${this.winner.name} wins` : 'Draw';
    this.showTurnBanner(banner);
    this.showGameOverOverlay();
    this.syncHud();
  }

  advanceTurn() {
    this.turnPending = false;
    if (this.gameOver) {
      return;
    }

    this.turnIndex = (this.turnIndex + 1) % this.players.length;
    if (!this.getActivePlayer().isAlive()) {
      this.turnIndex = (this.turnIndex + 1) % this.players.length;
    }

    this.remainingMove = MOVE_PER_TURN;
    this.turnPhase = 'move';
    this.turnTimer = TURN_TIME_LIMIT;
    this.wind = this.weather.applyStormWind(this.rollWind(), WIND_LIMIT);
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
      vy += GRAVITY * weapon.gravityScale * step;
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
    this.events.emit('turn:banner', text);
  }

  syncHud() {
    this.events.emit('hud:update', this.getHudState());
  }

  getHudState() {
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
      remainingMove: this.remainingMove,
      players: this.players.map((player) => {
        const w = getWeapon(player.weaponIndex);
        const ammoCount = player.getAmmo(w.id);
        const ammoText = w.ammo === null ? '' : ` (${ammoCount === Infinity ? '∞' : ammoCount})`;
        return {
          name: player.name,
          hp: player.hp,
          pitch: Math.round(player.pitch),
          power: Math.round(player.power),
          weapon: w.label + ammoText,
          wins: this.highscores[player.name] ?? 0
        };
      }),
      gameOver: this.gameOver,
      winner: this.winner?.name ?? null,
      turnTimer: Math.ceil(this.turnTimer ?? TURN_TIME_LIMIT),
      isCpuTurn: this.isCpuControlledPlayer(),
      weather: this.weather?.getLabel() ?? ''
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
