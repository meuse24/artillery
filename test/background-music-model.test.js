import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveBackgroundMusicState } from '../src/game/scenes/backgroundMusicModel.js';

test('background music model prefers title music on start and game over overlays', () => {
  assert.deepEqual(
    resolveBackgroundMusicState({
      soundEnabled: true,
      battleActive: false,
      gameOver: false,
      overlayType: 'start'
    }),
    { title: true, battle: false }
  );

  assert.deepEqual(
    resolveBackgroundMusicState({
      soundEnabled: true,
      battleActive: false,
      gameOver: false,
      overlayType: 'demo'
    }),
    { title: true, battle: false }
  );

  assert.deepEqual(
    resolveBackgroundMusicState({
      soundEnabled: true,
      battleActive: false,
      gameOver: true,
      overlayType: 'gameover'
    }),
    { title: true, battle: false }
  );
});

test('background music model keeps battle music through gameplay and turn/help overlays', () => {
  assert.deepEqual(
    resolveBackgroundMusicState({
      soundEnabled: true,
      battleActive: true,
      gameOver: false,
      overlayType: null
    }),
    { title: false, battle: true }
  );

  assert.deepEqual(
    resolveBackgroundMusicState({
      soundEnabled: true,
      battleActive: true,
      gameOver: false,
      overlayType: 'turn'
    }),
    { title: false, battle: true }
  );

  assert.deepEqual(
    resolveBackgroundMusicState({
      soundEnabled: true,
      battleActive: true,
      gameOver: false,
      overlayType: 'help',
      previousOverlayType: 'turn'
    }),
    { title: false, battle: true }
  );
});

test('background music model returns silence when sound is disabled', () => {
  assert.deepEqual(
    resolveBackgroundMusicState({
      soundEnabled: false,
      battleActive: true,
      gameOver: false,
      overlayType: 'turn'
    }),
    { title: false, battle: false }
  );
});
