import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(6, 6, 6);
    graphics.generateTexture('particle-dot', 12, 12);
    graphics.destroy();

    if (!this.scene.isActive('game')) {
      this.scene.launch('game');
    }
    if (!this.scene.isActive('ui')) {
      this.scene.launch('ui');
    }
  }
}
