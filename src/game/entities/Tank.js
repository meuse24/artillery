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

    this.track = scene.add.rectangle(0, 6, TANK_TRACK_WIDTH, TANK_TRACK_HEIGHT, 0x1f252b, 0.95);
    this.body = scene.add.rectangle(0, 0, TANK_BODY_WIDTH, TANK_BODY_HEIGHT, this.color, 1);
    this.body.setStrokeStyle(2, 0xffffff, 0.24);
    this.cockpit = scene.add.circle(4, -4, 6, 0xf4f1df, 0.9);
    this.barrel = scene.add.rectangle(0, -3, BARREL_LENGTH, 6, 0x111417, 1);
    this.barrel.setOrigin(0.08, 0.5);
    this.shadow = scene.add.ellipse(0, 16, 36, 10, 0x000000, 0.22);
    this.flagPole = scene.add.rectangle(-10, -17, 2, 20, 0xe7e0c8, 0.9);
    this.flag = scene.add.triangle(-1, -21, 0, 0, 16, 4, 0, 8, this.color, 0.95);
    this.flag.setOrigin(0.08, 0.5);

    this.add([this.shadow, this.track, this.body, this.cockpit, this.barrel, this.flagPole, this.flag]);
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
      this.y - 3 + Math.sin(angle) * (BARREL_LENGTH - 2)
    );
  }

  setPitch(nextPitch) {
    this.pitch = Phaser.Math.Clamp(nextPitch, MIN_PITCH, MAX_PITCH);
    this.refreshVisuals();
  }

  setPower(nextPower) {
    this.power = Phaser.Math.Clamp(nextPower, MIN_POWER, MAX_POWER);
  }

  setWeaponIndex(index) {
    this.weaponIndex = index;
  }

  setDriving(isDriving) {
    this.isDriving = isDriving;
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
    this.scene.tweens.killTweensOf(this.body);
    this.scene.tweens.add({
      targets: [this.body, this.track, this.cockpit],
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

    this.track.y = this.baseTrackY + bob * 0.22;
    this.body.y = this.baseBodyY - bob + idleLift;
    this.cockpit.y = this.baseCockpitY - bob * 1.15 + idleLift;
    this.barrel.y = this.baseBarrelY - bob * 0.35 + windSway;
    this.shadow.y = this.baseShadowY + bob * 0.08;
    this.shadow.scaleX = 1 + this.driveBlend * 0.08 + Math.abs(windSway) * 0.05;
    this.shadow.scaleY = 1 - this.driveBlend * 0.05;
    this.body.rotation = bodySway * this.driveBlend * 0.03;
    this.track.rotation = bodySway * this.driveBlend * 0.02;
    this.cockpit.rotation = bodySway * this.driveBlend * 0.04;
    this.flagPole.rotation = windSway * 0.14;
    this.flag.x = this.baseFlagX + 8 + Math.cos(this.motionTime * 1.8) * 1.4 + windSway * 5;
    this.flag.y = this.baseFlagY + Math.sin(this.motionTime * 2.3) * 1.2;
    this.flag.rotation = windSway * 0.75 + Math.sin(this.motionTime * 2.2) * 0.08;
    this.flag.scaleX = 1 + Math.abs(windSway) * 0.6 + this.driveBlend * 0.08;
    this.flag.scaleY = 1 + Math.sin(this.motionTime * 2.1) * 0.05;

    this.refreshVisuals();
  }

  refreshVisuals() {
    this.barrel.rotation = this.getWorldAngle() - this.rotation;
    const hpRatio = this.hp / this.maxHp;
    this.shadow.alpha = 0.15 + (1 - hpRatio) * 0.18 + this.driveBlend * 0.04;
  }
}
