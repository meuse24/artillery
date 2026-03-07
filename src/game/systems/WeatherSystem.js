import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../constants.js';

// WeatherSystem manages one optional weather condition per match.
// Conditions: 'none', 'rain', 'fog', 'storm'
// - rain:  gravity slightly increased, rain particle overlay
// - fog:   semi-transparent overlay shrinks visible range
// - storm: wind changes each shot turn
export class WeatherSystem {
  static CONDITIONS = ['none', 'none', 'rain', 'fog', 'storm']; // 'none' weighted twice

  constructor(scene) {
    this.scene = scene;
    this.condition = 'none';
    this.rainDrops = [];
    this.fogOverlay = null;
    this.rainAccumulator = 0;
    this.rainStep = 1 / 30;
  }

  rollCondition() {
    this.condition = WeatherSystem.CONDITIONS[
      Phaser.Math.Between(0, WeatherSystem.CONDITIONS.length - 1)
    ];
    return this.condition;
  }

  activate() {
    this.clearVisuals();

    if (this.condition === 'rain') {
      this.createRainLayer();
    } else if (this.condition === 'fog') {
      this.createFogLayer();
    }
    // storm has no persistent visual — wind indicator already communicates it
  }

  createRainLayer() {
    this.rainDrops = Array.from({ length: 60 }, () => {
      const drop = this.scene.add.rectangle(
        Phaser.Math.Between(0, GAME_WIDTH),
        Phaser.Math.Between(-GAME_HEIGHT, 0),
        1,
        Phaser.Math.Between(8, 18),
        0xadd8f7,
        Phaser.Math.FloatBetween(0.18, 0.38)
      );
      drop.setDepth(65);
      drop.vel = Phaser.Math.FloatBetween(340, 520); // px/s downward
      drop.drift = Phaser.Math.FloatBetween(-18, 18); // px/s horizontal
      return drop;
    });
  }

  createFogLayer() {
    this.fogOverlay = this.scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xb8ccd8, 0.28)
      .setOrigin(0, 0)
      .setDepth(62);
  }

  clearVisuals() {
    this.rainDrops.forEach((d) => d.destroy());
    this.rainDrops = [];
    if (this.fogOverlay) {
      this.fogOverlay.destroy();
      this.fogOverlay = null;
    }
  }

  // Update called by GameScene; dt in seconds
  update(dt, wind) {
    if (this.condition !== 'rain' || !this.rainDrops.length) {
      return;
    }

    this.rainAccumulator = Math.min(this.rainAccumulator + dt, this.rainStep * 3);
    while (this.rainAccumulator >= this.rainStep) {
      this.tickRain(this.rainStep, wind);
      this.rainAccumulator -= this.rainStep;
    }
  }

  tickRain(dt, wind) {
    const windPush = wind * 0.12;
    this.rainDrops.forEach((drop) => {
      drop.x += (drop.drift + windPush) * dt;
      drop.y += drop.vel * dt;
      if (drop.y > GAME_HEIGHT + 20) {
        drop.y = Phaser.Math.Between(-60, -8);
        drop.x = Phaser.Math.Between(0, GAME_WIDTH);
      }
      if (drop.x > GAME_WIDTH + 10) drop.x = -10;
      if (drop.x < -10) drop.x = GAME_WIDTH + 10;
    });
  }

  // Returns gravity multiplier for this weather
  gravityModifier() {
    return this.condition === 'rain' ? 1.12 : 1;
  }

  // Called by GameScene when the wind is re-rolled each turn
  // Storm weather re-randomises wind even harder
  applyStormWind(currentWind, windLimit) {
    if (this.condition !== 'storm') {
      return currentWind;
    }
    // Storm: random full-range wind each turn
    return Phaser.Math.FloatBetween(-windLimit, windLimit);
  }

  getLabel() {
    const labels = { none: '', rain: 'Rain', fog: 'Fog', storm: 'Storm' };
    return labels[this.condition] ?? '';
  }

  destroy() {
    this.clearVisuals();
  }
}
