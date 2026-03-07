import Phaser from 'phaser';
import './style.css';
import { BootScene } from './game/scenes/BootScene.js';
import { GameScene } from './game/scenes/GameScene.js';
import { UIScene } from './game/scenes/UIScene.js';
import { GAME_HEIGHT, GAME_WIDTH } from './game/constants.js';

const config = {
  type: Phaser.AUTO,
  parent: 'app',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#10242f',
  audio: {
    noAudio: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    expandParent: true
  },
  scene: [BootScene, GameScene, UIScene]
};

new Phaser.Game(config);
