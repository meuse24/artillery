import test from 'node:test';
import assert from 'node:assert/strict';

import { GAME_SCENE_EVENTS } from '../src/game/config/sceneContracts.js';
import { OverlayStateSystem } from '../src/game/systems/OverlayStateSystem.js';

function createScene(overrides = {}) {
  const emitted = [];
  const delayedCalls = [];
  const scene = {
    highscores: { Amber: 2, Cyan: 1 },
    currentMode: 'cpu',
    overlayState: null,
    events: {
      emit(eventName, payload) {
        emitted.push({ eventName, payload });
      }
    },
    syncTitleMusicState(payload) {
      scene.lastSyncedOverlay = payload;
    },
    getModeLabel() {
      return this.currentMode === 'cpu' ? 'Solo vs CPU' : 'Local Duel';
    },
    getActivePlayer() {
      return { name: 'Amber' };
    },
    isCpuControlledPlayer() {
      return false;
    },
    showTurnBanner(label) {
      scene.lastTurnBanner = label;
    },
    audioManager: {
      playTurn() {
        scene.turnSoundPlayed = true;
      }
    },
    syncHud() {
      scene.hudSyncCount = (scene.hudSyncCount ?? 0) + 1;
    },
    startCpuTurn() {
      scene.cpuTurnStarted = true;
    },
    time: {
      delayedCall(delay, callback) {
        delayedCalls.push({ delay, callback });
      }
    },
    ...overrides
  };

  return { scene, emitted, delayedCalls };
}

test('OverlayStateSystem builds the demo/start screen overlay', () => {
  const { scene, emitted } = createScene();
  const overlay = new OverlayStateSystem(scene);

  overlay.showStartOverlay();

  assert.equal(scene.overlayState.type, 'start');
  assert.equal(scene.overlayState.title, 'CRATER COMMAND');
  assert.equal(scene.overlayState.prompt, 'PRESS BUTTON TO START GAME');
  assert.equal(scene.overlayState.modeKey, 'cpu');
  assert.equal(scene.overlayState.scores.length, 2);
  assert.equal(emitted[0].eventName, GAME_SCENE_EVENTS.OVERLAY_UPDATE);
  assert.equal(scene.lastSyncedOverlay, scene.overlayState);
});

test('OverlayStateSystem schedules CPU player handoff on turn overlays', () => {
  const { scene, delayedCalls } = createScene({
    isCpuControlledPlayer() {
      return true;
    }
  });
  const overlay = new OverlayStateSystem(scene);

  overlay.presentTurnOverlay();

  assert.equal(scene.overlayState.type, 'turn');
  assert.equal(scene.overlayState.prompt, 'CPU thinking...');
  assert.equal(scene.lastTurnBanner, 'Amber move phase');
  assert.equal(scene.turnSoundPlayed, true);
  assert.equal(delayedCalls[0].delay, 900);

  delayedCalls[0].callback();

  assert.equal(scene.overlayState, null);
  assert.equal(scene.cpuTurnStarted, true);
  assert.equal(scene.hudSyncCount, 2);
});
