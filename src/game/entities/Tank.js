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
    this.baseTrackY = 6;
    this.baseBodyY = 0;
    this.baseCockpitY = -4;
    this.baseBarrelY = -3;
    this.baseShadowY = 16;
    this.baseFlagX = -10;
    this.baseFlagY = -17;
    this.baseSkirtY = 4;
    this.baseBodyBevelY = -7;
    this.baseArmorY = -2;
    this.baseRivetY = 2;
    this.baseExhaustPipeY = -2;
    this.baseExhaustCapY = -6;

    const trackFrameColor = 0x141b22;
    const beltColor = 0x202932;
    const linkColor = 0x2f3942;
    const wheelRim = 0x9aa6af;
    const teamDark = darkenColor(this.color, 0.34);
    const teamMid = darkenColor(this.color, 0.16);
    const teamLight = lightenColor(this.color, 0.2);
    const teamGlow = lightenColor(this.color, 0.42);

    this.track = scene.add.container(0, this.baseTrackY);
    this.trackFrame = scene.add.rectangle(0, 0, TANK_TRACK_WIDTH + 4, TANK_TRACK_HEIGHT + 6, trackFrameColor, 0.97);
    this.trackFrame.setStrokeStyle(1, 0xffffff, 0.1);
    this.trackBelt = scene.add.rectangle(0, 0, TANK_TRACK_WIDTH, TANK_TRACK_HEIGHT, beltColor, 0.95);
    this.trackTopRail = scene.add.rectangle(0, -2.8, TANK_TRACK_WIDTH - 4, 1.5, 0x7f8c95, 0.2);
    this.trackBottomRail = scene.add.rectangle(0, 2.8, TANK_TRACK_WIDTH - 4, 1.5, 0x090c10, 0.58);

    this.trackLinks = [];
    for (let x = -16; x <= 16; x += 5.5) {
      const topLink = scene.add.rectangle(x, -2.9, 4.2, 1.25, linkColor, 0.9);
      const botLink = scene.add.rectangle(x, 2.9, 4.2, 1.25, linkColor, 0.9);
      this.trackLinks.push(topLink, botLink);
    }

    this.trackWheels = [];
    this.trackWheels.push(this.createTrackWheel(-18, 0, 4.4, wheelRim));
    this.trackWheels.push(this.createTrackWheel(18, 0, 4.4, wheelRim));
    [-12, -6, 0, 6, 12].forEach((wheelX) => {
      this.trackWheels.push(this.createTrackWheel(wheelX, 0.7, 2.9, wheelRim));
    });

    this.track.add([
      this.trackFrame,
      this.trackBelt,
      ...this.trackLinks,
      ...this.trackWheels,
      this.trackTopRail,
      this.trackBottomRail
    ]);

    this.body = scene.add.rectangle(0, 0, TANK_BODY_WIDTH, TANK_BODY_HEIGHT, teamMid, 1);
    this.body.setStrokeStyle(2, 0xffffff, 0.24);
    this.sideSkirt = scene.add.rectangle(0, this.baseSkirtY, TANK_BODY_WIDTH - 6, 6, teamDark, 0.95);
    this.bodyBevel = scene.add.rectangle(0, this.baseBodyBevelY, TANK_BODY_WIDTH - 10, 4, teamLight, 0.45);
    this.armorPlate = scene.add.rectangle(0, this.baseArmorY, TANK_BODY_WIDTH - 12, 6, teamLight, 0.32);
    this.armorPlate.setStrokeStyle(1, 0xffffff, 0.1);
    this.rivets = [-11, -5, 1, 7, 13].map((x) => scene.add.circle(x, this.baseRivetY, 0.95, teamGlow, 0.65));

    this.cockpitRing = scene.add.circle(4, this.baseCockpitY, 8, darkenColor(this.color, 0.46), 0.82);
    this.cockpit = scene.add.circle(4, this.baseCockpitY, 5.6, 0xf4f1df, 0.9);
    this.hatch = scene.add.rectangle(4, this.baseCockpitY - 1.8, 7.5, 2.5, 0x1a222a, 0.86);
    this.sensor = scene.add.rectangle(10, this.baseCockpitY - 2.4, 3.5, 1.8, 0x8ef3eb, 0.86);

    this.barrel = scene.add.container(0, this.baseBarrelY);
    this.barrelTube = scene.add.rectangle(0, 0, BARREL_LENGTH, 6, 0x111417, 1);
    this.barrelTube.setOrigin(0.08, 0.5);
    this.barrelTube.setStrokeStyle(1, 0xffffff, 0.18);
    this.barrelSleeve = scene.add.rectangle(BARREL_LENGTH * 0.48, 0, 8, 6.8, 0x1d2731, 0.95);
    this.muzzleBrake = scene.add.rectangle(BARREL_LENGTH - 2, 0, 5.5, 8, 0x0b1016, 1);
    this.muzzleBrake.setStrokeStyle(1, 0xffffff, 0.1);
    this.barrel.add([this.barrelTube, this.barrelSleeve, this.muzzleBrake]);

    const exhaustX = -this.facing * 12;
    this.exhaustPipe = scene.add.rectangle(exhaustX, this.baseExhaustPipeY, 3.6, 8, 0x252d35, 0.92);
    this.exhaustCap = scene.add.circle(exhaustX, this.baseExhaustCapY, 1.7, 0x0e1318, 1);
    this.shadow = scene.add.ellipse(0, 16, 36, 10, 0x000000, 0.22);
    this.flagPole = scene.add.rectangle(-10, -17, 2, 20, 0xe7e0c8, 0.9);
    this.flag = scene.add.triangle(-1, -21, 0, 0, 16, 4, 0, 8, this.color, 0.95);
    this.flag.setOrigin(0.08, 0.5);

    this.add([
      this.shadow,
      this.track,
      this.body,
      this.sideSkirt,
      this.bodyBevel,
      this.armorPlate,
      ...this.rivets,
      this.exhaustPipe,
      this.exhaustCap,
      this.cockpitRing,
      this.cockpit,
      this.hatch,
      this.sensor,
      this.barrel,
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
    tire.setStrokeStyle(1, 0xffffff, 0.12);
    const spokeA = this.scene.add.rectangle(0, 0, radius * 1.2, 1.25, 0x1c242b, 0.9);
    const spokeB = this.scene.add.rectangle(0, 0, 1.25, radius * 1.2, 0x1c242b, 0.9);
    const hub = this.scene.add.circle(0, 0, Math.max(1.1, radius * 0.38), rimColor, 0.95);
    wheel.add([tire, spokeA, spokeB, hub]);
    return wheel;
  }

  syncToTerrain(terrain) {
    const left = terrain.getSurfaceY(Math.round(this.x - 12));
    const center = terrain.getSurfaceY(Math.round(this.x));
    const right = terrain.getSurfaceY(Math.round(this.x + 12));
    const slope = Phaser.Math.Clamp((right - left) / 28, -0.55, 0.55);

    this.y = center - 10;
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

    const bob = Math.sin(this.motionTime) * this.driveBlend * 1.7;
    const bodySway = Math.sin(this.motionTime * 0.7 + this.facing) * 0.6;
    const idleLift = Math.sin(this.motionTime * 0.45 + this.facing) * (1 - this.driveBlend) * 0.35;
    const windSway = Phaser.Math.Clamp(windDrift * 0.003, -0.45, 0.45);

    const bodyY = this.baseBodyY - bob + idleLift;
    const cockpitY = this.baseCockpitY - bob * 1.15 + idleLift;

    this.track.y = this.baseTrackY + bob * 0.22;
    this.body.y = bodyY;
    this.sideSkirt.y = bodyY + this.baseSkirtY;
    this.bodyBevel.y = bodyY + this.baseBodyBevelY;
    this.armorPlate.y = bodyY + this.baseArmorY;
    this.rivets.forEach((rivet) => {
      rivet.y = bodyY + this.baseRivetY;
    });
    this.cockpitRing.y = cockpitY;
    this.cockpit.y = cockpitY;
    this.hatch.y = cockpitY - 1.8;
    this.sensor.y = cockpitY - 2.4;
    this.barrel.y = this.baseBarrelY - bob * 0.35 + windSway;
    this.exhaustPipe.y = bodyY + this.baseExhaustPipeY + windSway * 0.2;
    this.exhaustCap.y = bodyY + this.baseExhaustCapY + windSway * 0.35;
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
    this.flagPole.rotation = windSway * 0.14;
    this.flag.x = this.baseFlagX + 8 + Math.cos(this.motionTime * 1.8) * 1.4 + windSway * 5;
    this.flag.y = this.baseFlagY + Math.sin(this.motionTime * 2.3) * 1.2;
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
