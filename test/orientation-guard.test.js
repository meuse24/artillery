import test from 'node:test';
import assert from 'node:assert/strict';

import { OrientationGuard } from '../src/game/ui/OrientationGuard.js';

function createVisibilityTarget() {
  return {
    values: [],
    setVisible(value) {
      this.values.push(value);
      this.visible = value;
    }
  };
}

test('OrientationGuard detects portrait mode, pauses the game and resumes on landscape', () => {
  const listeners = new Map();
  const previousWindow = globalThis.window;
  globalThis.window = {
    visualViewport: { width: 420, height: 860 },
    addEventListener(name, handler) {
      listeners.set(name, handler);
    },
    removeEventListener(name) {
      listeners.delete(name);
    }
  };

  const calls = [];
  const scene = {
    isTouchDevice: true,
    pausedForOrientation: false,
    orientationShade: createVisibilityTarget(),
    orientationTitle: createVisibilityTarget(),
    orientationBody: createVisibilityTarget(),
    gameScene: {
      scene: {
        pause() {
          calls.push('pause');
        },
        resume() {
          calls.push('resume');
        }
      }
    }
  };

  try {
    const guard = new OrientationGuard(scene);
    guard.bind();

    assert.equal(scene.orientationShade.visible, true);
    assert.equal(scene.pausedForOrientation, true);
    assert.deepEqual(calls, ['pause']);
    assert.equal(typeof listeners.get('orientationchange'), 'function');

    globalThis.window.visualViewport = { width: 860, height: 420 };
    guard.update();

    assert.equal(scene.orientationShade.visible, false);
    assert.equal(scene.orientationTitle.visible, false);
    assert.equal(scene.orientationBody.visible, false);
    assert.equal(scene.pausedForOrientation, false);
    assert.deepEqual(calls, ['pause', 'resume']);

    guard.destroy();
    assert.equal(listeners.has('orientationchange'), false);
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
});

test('OrientationGuard hides itself on non-touch scenes and falls back to inner viewport size', () => {
  const previousWindow = globalThis.window;
  globalThis.window = {
    innerWidth: 900,
    innerHeight: 700,
    addEventListener() {},
    removeEventListener() {}
  };

  const scene = {
    isTouchDevice: false,
    pausedForOrientation: false,
    orientationShade: createVisibilityTarget(),
    orientationTitle: createVisibilityTarget(),
    orientationBody: createVisibilityTarget(),
    gameScene: null
  };

  try {
    const guard = new OrientationGuard(scene);
    assert.equal(guard.isPortraitViewport(), false);
    guard.update();

    assert.equal(scene.orientationShade.visible, false);
    assert.equal(scene.orientationTitle.visible, false);
    assert.equal(scene.orientationBody.visible, false);
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
});
