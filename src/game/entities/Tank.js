import Phaser from 'phaser';
import {
  BARREL_LENGTH,
  BASE_HP,
  MAX_PITCH,
  MAX_POWER,
  MIN_PITCH,
  MIN_POWER,
  TANK_RADIUS,
  TANK_TRACK_HEIGHT,
  TANK_TRACK_WIDTH,
  TANK_BODY_HEIGHT,
  TANK_BODY_WIDTH
} from '../constants.js';

function blendColor(source, target, mix) {
  const t = Phaser.Math.Clamp(mix, 0, 1);
  const sr = (source >> 16) & 0xff;
  const sg = (source >> 8) & 0xff;
  const sb = source & 0xff;
  const tr = (target >> 16) & 0xff;
  const tg = (target >> 8) & 0xff;
  const tb = target & 0xff;
  const r = Math.round(sr + (tr - sr) * t);
  const g = Math.round(sg + (tg - sg) * t);
  const b = Math.round(sb + (tb - sb) * t);
  return (r << 16) | (g << 8) | b;
}

function lightenColor(color, amount) {
  return blendColor(color, 0xffffff, amount);
}

function darkenColor(color, amount) {
  return blendColor(color, 0x000000, amount);
}

export class Tank extends Phaser.GameObjects.Container {
  constructor(scene, config) {
    super(scene, config.x, config.y);

    this.scene = scene;
    this.name = config.name;
    this.color = config.color;
    this.facing = config.facing;
    this.maxHp = BASE_HP;
    this.hp = BASE_HP;
    this.pitch = 48;
    this.power = 360;
    this.weaponIndex = 0;
    this.ammo = {};
    this.slideVelocity = 0;
    this.terrainSlope = 0;
    this.motionTime = Phaser.Math.FloatBetween(0, Math.PI * 2);
    this.driveBlend = 0;
    this.isDriving = false;
    this.baseTrackY = 12;
    this.baseBodyY = 0;
    this.baseCockpitY = -8;
    this.baseBarrelY = -6;
    this.baseShadowY = 32;
    this.baseFlagX = -20;
    this.baseFlagY = -34;
    this.baseSkirtY = 8;
    this.baseBodyBevelY = -14;
    this.baseArmorY = -4;
    this.baseRivetY = 4;
    this.baseExhaustPipeY = -4;
    this.baseExhaustCapY = -12;

    const trackFrameColor = 0x141b22;
    const beltColor = 0x202932;
    const linkColor = 0x2f3942;
    const wheelRim = 0x9aa6af;
    const teamDark = darkenColor(this.color, 0.34);
    const teamMid = darkenColor(this.color, 0.16);
    const teamLight = lightenColor(this.color, 0.2);
    const teamGlow = lightenColor(this.color, 0.42);
    const steelDark = 0x1a222a;

    // ── Track assembly ──────────────────────────────────────────────
    this.track = scene.add.container(0, this.baseTrackY);
    this.trackFrame = scene.add.rectangle(0, 0, TANK_TRACK_WIDTH + 8, TANK_TRACK_HEIGHT + 12, trackFrameColor, 0.97);
    this.trackFrame.setStrokeStyle(1.5, 0xffffff, 0.1);
    this.trackBelt = scene.add.rectangle(0, 0, TANK_TRACK_WIDTH, TANK_TRACK_HEIGHT, beltColor, 0.95);
    this.trackTopRail = scene.add.rectangle(0, -5.6, TANK_TRACK_WIDTH - 8, 3, 0x7f8c95, 0.2);
    this.trackBottomRail = scene.add.rectangle(0, 5.6, TANK_TRACK_WIDTH - 8, 3, 0x090c10, 0.58);

    // Track links – dense for that heavy look
    this.trackLinks = [];
    for (let x = -36; x <= 36; x += 6) {
      const topLink = scene.add.rectangle(x, -5.8, 4.5, 2.5, linkColor, 0.9);
      const botLink = scene.add.rectangle(x, 5.8, 4.5, 2.5, linkColor, 0.9);
      // Track pad teeth (visible on bottom)
      const tooth = scene.add.rectangle(x, 7.2, 2.4, 1.6, 0x181f26, 0.7);
      this.trackLinks.push(topLink, botLink, tooth);
    }

    // Wheels
    this.trackWheels = [];
    this.trackWheels.push(this.createTrackWheel(-36, 0, 8.8, wheelRim));
    this.trackWheels.push(this.createTrackWheel(36, 0, 8.8, wheelRim));
    [-24, -12, 0, 12, 24].forEach((wheelX) => {
      this.trackWheels.push(this.createTrackWheel(wheelX, 1.4, 5.8, wheelRim));
    });

    this.track.add([
      this.trackFrame,
      this.trackBelt,
      ...this.trackLinks,
      ...this.trackWheels,
      this.trackTopRail,
      this.trackBottomRail
    ]);

    // ── Hull body ───────────────────────────────────────────────────
    this.body = scene.add.rectangle(0, 0, TANK_BODY_WIDTH, TANK_BODY_HEIGHT, teamMid, 1);
    this.body.setStrokeStyle(2, 0xffffff, 0.24);
    this.sideSkirt = scene.add.rectangle(0, this.baseSkirtY, TANK_BODY_WIDTH - 12, 12, teamDark, 0.95);
    this.bodyBevel = scene.add.rectangle(0, this.baseBodyBevelY, TANK_BODY_WIDTH - 20, 8, teamLight, 0.45);
    this.armorPlate = scene.add.rectangle(0, this.baseArmorY, TANK_BODY_WIDTH - 24, 12, teamLight, 0.32);
    this.armorPlate.setStrokeStyle(1, 0xffffff, 0.1);
    this.rivets = [-22, -10, 2, 14, 26].map((x) => scene.add.circle(x, this.baseRivetY, 1.9, teamGlow, 0.65));

    // Reactive armor blocks on hull side
    this.reactiveArmor = [];
    for (let x = -24; x <= 20; x += 11) {
      const block = scene.add.rectangle(x, this.baseArmorY + 1, 8, 5, teamDark, 0.55);
      block.setStrokeStyle(1, teamLight, 0.2);
      this.reactiveArmor.push(block);
    }

    // ── Track guards / fenders ──────────────────────────────────────
    this.trackGuardTop = scene.add.rectangle(0, this.baseTrackY - 10, TANK_TRACK_WIDTH + 6, 3, teamDark, 0.85);
    this.trackGuardTop.setStrokeStyle(1, 0xffffff, 0.08);

    // Mud flap at rear
    const flapX = -this.facing * 40;
    this.mudFlap = scene.add.rectangle(flapX, this.baseTrackY + 2, 4, 10, steelDark, 0.7);

    // ── Turret ──────────────────────────────────────────────────────
    this.cockpitRing = scene.add.circle(8, this.baseCockpitY, 16, darkenColor(this.color, 0.46), 0.82);
    this.cockpit = scene.add.circle(8, this.baseCockpitY, 11.2, 0xf4f1df, 0.9);
    this.hatch = scene.add.rectangle(8, this.baseCockpitY - 3.6, 15, 5, steelDark, 0.86);
    this.sensor = scene.add.rectangle(20, this.baseCockpitY - 4.8, 7, 3.6, 0x8ef3eb, 0.86);

    // Periscope block on turret
    this.periscope = scene.add.rectangle(8, this.baseCockpitY - 10, 6, 3, 0x5a6a78, 0.8);
    this.periscopeGlass = scene.add.rectangle(8, this.baseCockpitY - 10, 4, 1.8, 0x8ef3eb, 0.6);

    // ── Barrel ──────────────────────────────────────────────────────
    this.barrel = scene.add.container(0, this.baseBarrelY);
    this.barrelTube = scene.add.rectangle(0, 0, BARREL_LENGTH, 12, 0x111417, 1);
    this.barrelTube.setOrigin(0.08, 0.5);
    this.barrelTube.setStrokeStyle(1.5, 0xffffff, 0.18);
    // Barrel reinforcement rings
    this.barrelRing1 = scene.add.rectangle(BARREL_LENGTH * 0.3, 0, 3, 14, 0x1d2731, 0.7);
    this.barrelRing2 = scene.add.rectangle(BARREL_LENGTH * 0.6, 0, 3, 14, 0x1d2731, 0.7);
    this.barrelSleeve = scene.add.rectangle(BARREL_LENGTH * 0.48, 0, 16, 13.6, 0x1d2731, 0.95);
    this.muzzleBrake = scene.add.rectangle(BARREL_LENGTH - 4, 0, 11, 16, 0x0b1016, 1);
    this.muzzleBrake.setStrokeStyle(1.5, 0xffffff, 0.1);
    // Muzzle brake vents
    this.muzzleVent1 = scene.add.rectangle(BARREL_LENGTH - 8, -5, 4, 2, 0x000000, 0.5);
    this.muzzleVent2 = scene.add.rectangle(BARREL_LENGTH - 8, 5, 4, 2, 0x000000, 0.5);
    this.barrel.add([
      this.barrelTube, this.barrelRing1, this.barrelRing2,
      this.barrelSleeve, this.muzzleBrake,
      this.muzzleVent1, this.muzzleVent2
    ]);

    // ── Exhaust & details ───────────────────────────────────────────
    const exhaustX = -this.facing * 24;
    this.exhaustPipe = scene.add.rectangle(exhaustX, this.baseExhaustPipeY, 7.2, 16, 0x252d35, 0.92);
    this.exhaustCap = scene.add.circle(exhaustX, this.baseExhaustCapY, 3.4, 0x0e1318, 1);

    // Stowage box on rear hull
    const stowX = -this.facing * 30;
    this.stowageBox = scene.add.rectangle(stowX, -2, 10, 8, 0x3a4a3a, 0.75);
    this.stowageBox.setStrokeStyle(1, 0x000000, 0.3);

    // Antenna whip
    this.antennaBase = scene.add.rectangle(-this.facing * 16, -20, 2, 8, steelDark, 0.9);
    this.antennaWhip = scene.add.rectangle(-this.facing * 16, -32, 1.2, 20, 0xc8c0a8, 0.7);
    this.antennaTip = scene.add.circle(-this.facing * 16, -42, 1.4, 0xff4422, 0.85);

    this.shadow = scene.add.ellipse(0, 32, 72, 20, 0x000000, 0.22);
    this.flagPole = scene.add.rectangle(-20, -34, 4, 40, 0xe7e0c8, 0.9);
    this.flag = scene.add.triangle(-2, -42, 0, 0, 32, 8, 0, 16, this.color, 0.95);
    this.flag.setOrigin(0.08, 0.5);

    // ── Layer order: shadow → body → tracks (in front!) → turret → barrel → details ──
    this.add([
      this.shadow,
      // Hull body (behind tracks)
      this.body,
      this.sideSkirt,
      this.bodyBevel,
      this.armorPlate,
      ...this.reactiveArmor,
      ...this.rivets,
      this.stowageBox,
      this.exhaustPipe,
      this.exhaustCap,
      // Tracks rendered IN FRONT of hull for 3D depth
      this.track,
      this.trackGuardTop,
      this.mudFlap,
      // Turret on top
      this.cockpitRing,
      this.cockpit,
      this.hatch,
      this.periscope,
      this.periscopeGlass,
      this.sensor,
      this.barrel,
      this.antennaBase,
      this.antennaWhip,
      this.antennaTip,
      this.flagPole,
      this.flag
    ]);

    this.damageFlashTargets = [
      this.track,
      this.body,
      this.sideSkirt,
      this.armorPlate,
      this.cockpitRing,
      this.cockpit,
      this.hatch,
      this.barrel,
      this.exhaustPipe,
      ...this.trackWheels
    ];

    this.setSize(TANK_TRACK_WIDTH, TANK_RADIUS * 2);
    this.setDepth(30);
    scene.add.existing(this);

    this.refreshVisuals();
  }

  getWorldAngle() {
    const pitchRad = Phaser.Math.DegToRad(this.pitch);
    return this.facing === 1 ? -pitchRad : -Math.PI + pitchRad;
  }

  getFireOrigin() {
    const angle = this.getWorldAngle();
    return new Phaser.Math.Vector2(
      this.x + Math.cos(angle) * (BARREL_LENGTH - 2),
      this.y + this.barrel.y + Math.sin(angle) * (BARREL_LENGTH - 2)
    );
  }

  setPitch(nextPitch) {
    this.pitch = Phaser.Math.Clamp(nextPitch, MIN_PITCH, MAX_PITCH);
    this.refreshVisuals();
  }

  setPower(nextPower) {
    this.power = Phaser.Math.Clamp(nextPower, MIN_POWER, MAX_POWER);
  }

  initAmmo(weapons) {
    this.ammo = {};
    weapons.forEach((w) => {
      if (w.ammo !== null) {
        this.ammo[w.id] = w.ammo;
      }
    });
  }

  getAmmo(weaponId) {
    const val = this.ammo[weaponId];
    return val === undefined ? Infinity : val;
  }

  spendAmmo(weaponId) {
    if (this.ammo[weaponId] !== undefined) {
      this.ammo[weaponId] = Math.max(0, this.ammo[weaponId] - 1);
    }
  }

  setWeaponIndex(index) {
    this.weaponIndex = index;
  }

  setDriving(isDriving) {
    this.isDriving = isDriving;
  }

  createTrackWheel(x, y, radius, rimColor) {
    const wheel = this.scene.add.container(x, y);
    const tire = this.scene.add.circle(0, 0, radius, 0x2a323a, 0.97);
    tire.setStrokeStyle(1.5, 0xffffff, 0.12);
    const spokeA = this.scene.add.rectangle(0, 0, radius * 1.2, 2, 0x1c242b, 0.9);
    const spokeB = this.scene.add.rectangle(0, 0, 2, radius * 1.2, 0x1c242b, 0.9);
    const hub = this.scene.add.circle(0, 0, Math.max(2, radius * 0.38), rimColor, 0.95);
    // Bolt detail on hub
    const bolt = this.scene.add.circle(radius * 0.2, 0, 0.8, 0x555555, 0.7);
    wheel.add([tire, spokeA, spokeB, hub, bolt]);
    return wheel;
  }

  syncToTerrain(terrain) {
    const left = terrain.getSurfaceY(Math.round(this.x - 24));
    const center = terrain.getSurfaceY(Math.round(this.x));
    const right = terrain.getSurfaceY(Math.round(this.x + 24));
    const slope = Phaser.Math.Clamp((right - left) / 56, -0.55, 0.55);

    this.y = center - 20;
    this.terrainSlope = slope;
    this.rotation = slope;
    this.refreshVisuals();
  }

  applyDamage(amount) {
    if (amount <= 0 || this.hp <= 0) {
      return;
    }

    this.hp = Math.max(0, this.hp - amount);
    this.scene.tweens.killTweensOf(this.damageFlashTargets);
    this.scene.tweens.add({
      targets: this.damageFlashTargets,
      alpha: 0.35,
      yoyo: true,
      duration: 90,
      repeat: 1
    });
    this.scene.tweens.add({
      targets: this,
      scaleX: 0.94,
      scaleY: 1.08,
      yoyo: true,
      duration: 120
    });
  }

  isAlive() {
    return this.hp > 0;
  }

  updateAnimation(dt, windDrift = 0) {
    this.motionTime += dt * (this.isDriving ? 10 : 2.6);
    const targetBlend = this.isDriving ? 1 : 0;
    this.driveBlend = Phaser.Math.Linear(this.driveBlend, targetBlend, Math.min(1, dt * 10));

    const bob = Math.sin(this.motionTime) * this.driveBlend * 3.0;
    const bodySway = Math.sin(this.motionTime * 0.7 + this.facing) * 1.0;
    const idleLift = Math.sin(this.motionTime * 0.45 + this.facing) * (1 - this.driveBlend) * 0.6;
    const windSway = Phaser.Math.Clamp(windDrift * 0.003, -0.45, 0.45);

    // Track vibration when driving
    const trackVibrate = this.isDriving ? Math.sin(this.motionTime * 18) * 0.6 : 0;

    const bodyY = this.baseBodyY - bob + idleLift;
    const cockpitY = this.baseCockpitY - bob * 1.15 + idleLift;

    this.track.y = this.baseTrackY + bob * 0.22 + trackVibrate;
    this.trackGuardTop.y = this.baseTrackY - 10 + bob * 0.18 + trackVibrate * 0.5;
    this.mudFlap.y = this.baseTrackY + 2 + bob * 0.15;
    this.body.y = bodyY;
    this.sideSkirt.y = bodyY + this.baseSkirtY;
    this.bodyBevel.y = bodyY + this.baseBodyBevelY;
    this.armorPlate.y = bodyY + this.baseArmorY;
    this.reactiveArmor.forEach((block) => {
      block.y = bodyY + this.baseArmorY + 1;
    });
    this.rivets.forEach((rivet) => {
      rivet.y = bodyY + this.baseRivetY;
    });
    this.cockpitRing.y = cockpitY;
    this.cockpit.y = cockpitY;
    this.hatch.y = cockpitY - 3.6;
    this.periscope.y = cockpitY - 10;
    this.periscopeGlass.y = cockpitY - 10;
    this.sensor.y = cockpitY - 4.8;
    this.barrel.y = this.baseBarrelY - bob * 0.35 + windSway;
    this.exhaustPipe.y = bodyY + this.baseExhaustPipeY + windSway * 0.2;
    this.exhaustCap.y = bodyY + this.baseExhaustCapY + windSway * 0.35;
    this.stowageBox.y = bodyY - 2;
    this.shadow.y = this.baseShadowY + bob * 0.08;
    this.shadow.scaleX = 1 + this.driveBlend * 0.08 + Math.abs(windSway) * 0.05;
    this.shadow.scaleY = 1 - this.driveBlend * 0.05;
    this.body.rotation = bodySway * this.driveBlend * 0.03;
    this.sideSkirt.rotation = this.body.rotation * 1.08;
    this.bodyBevel.rotation = this.body.rotation * 0.86;
    this.armorPlate.rotation = this.body.rotation * 0.9;
    this.track.rotation = bodySway * this.driveBlend * 0.02;
    this.cockpit.rotation = bodySway * this.driveBlend * 0.04;
    this.cockpitRing.rotation = this.cockpit.rotation * 0.78;
    this.hatch.rotation = this.cockpit.rotation * 0.88;
    this.sensor.rotation = this.cockpit.rotation * 0.7 + windSway * 0.06;
    this.exhaustPipe.rotation = this.body.rotation * 0.52;
    this.exhaustCap.rotation = this.body.rotation * 0.4;

    // Antenna sway
    const antennaSway = windSway * 0.3 + Math.sin(this.motionTime * 3.2) * 0.06 * (1 + this.driveBlend * 2);
    this.antennaWhip.rotation = antennaSway;
    this.antennaTip.x = -this.facing * 16 + antennaSway * 14;
    this.antennaTip.y = -42 + Math.abs(antennaSway) * 3;

    this.flagPole.rotation = windSway * 0.14;
    this.flag.x = this.baseFlagX + 16 + Math.cos(this.motionTime * 1.8) * 2.8 + windSway * 10;
    this.flag.y = this.baseFlagY + Math.sin(this.motionTime * 2.3) * 2.4;
    this.flag.rotation = windSway * 0.75 + Math.sin(this.motionTime * 2.2) * 0.08;
    this.flag.scaleX = 1 + Math.abs(windSway) * 0.6 + this.driveBlend * 0.08;
    this.flag.scaleY = 1 + Math.sin(this.motionTime * 2.1) * 0.05;
    const wheelSpin = (this.isDriving ? this.facing * (dt * 8.5) : 0) + this.slideVelocity * dt * 0.15;
    this.trackWheels.forEach((wheel, index) => {
      const wheelFactor = index < 2 ? 0.6 : 1;
      wheel.rotation += wheelSpin * wheelFactor;
    });

    this.refreshVisuals();
  }

  refreshVisuals() {
    this.barrel.rotation = this.getWorldAngle() - this.rotation;
    const hpRatio = this.hp / this.maxHp;
    this.shadow.alpha = 0.15 + (1 - hpRatio) * 0.18 + this.driveBlend * 0.04;
  }
}
