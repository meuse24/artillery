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
  dom: {
    createContainer: true
  },
  audio: {
    noAudio: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    expandParent: true,
    fullscreenTarget: 'app'
  },
  scene: [BootScene, GameScene, UIScene]
};

const game = new Phaser.Game(config);

function getScene(key) {
  try {
    return game.scene.getScene(key);
  } catch {
    return null;
  }
}

function getAutomationState() {
  const gameScene = getScene('game');
  const bootScene = getScene('boot');
  const bootActive = Boolean(bootScene?.scene?.isActive?.());

  if (bootActive) {
    return {
      coordinateSystem: 'origin top-left; +x right; +y down',
      scene: 'boot',
      bootActive: true,
      gameActive: Boolean(gameScene?.scene?.isActive?.())
    };
  }

  if (gameScene?.getAutomationState) {
    return gameScene.getAutomationState();
  }

  return {
    coordinateSystem: 'origin top-left; +x right; +y down',
    scene: null,
    bootActive,
    gameActive: Boolean(gameScene?.scene?.isActive?.())
  };
}

window.__PHASER_GAME__ = game;
window.render_game_to_text = () => JSON.stringify(getAutomationState());
window.advanceTime = (ms = 1000 / 60) => new Promise((resolve) => {
  const endAt = performance.now() + Math.max(ms, 0);

  const tick = () => {
    if (performance.now() >= endAt) {
      resolve();
      return;
    }
    window.requestAnimationFrame(tick);
  };

  window.requestAnimationFrame(tick);
});
