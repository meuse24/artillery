import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/sceneContracts.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.BOOT);
  }

  create() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(6, 6, 6);
    graphics.generateTexture('particle-dot', 12, 12);
    graphics.destroy();

    if (!this.scene.isActive(SCENE_KEYS.GAME)) {
      this.scene.launch(SCENE_KEYS.GAME);
    }
    if (!this.scene.isActive(SCENE_KEYS.UI)) {
      this.scene.launch(SCENE_KEYS.UI);
    }
    this.scene.stop(SCENE_KEYS.BOOT);
  }
}
