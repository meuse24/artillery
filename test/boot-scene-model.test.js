import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getBootOrientationState,
  getBootPreferenceViewModel,
  isBootGameSceneReady,
  toggleBootPreference
} from '../src/game/scenes/bootSceneModel.js';

test('boot scene model toggles known preferences and ignores unknown keys', () => {
  const prefs = { fullscreen: true, sound: false };

  assert.deepEqual(toggleBootPreference(prefs, 'fullscreen'), {
    fullscreen: false,
    sound: false
  });
  assert.equal(toggleBootPreference(prefs, 'missing'), prefs);
});

test('boot scene model derives the correct UI labels and styles', () => {
  assert.deepEqual(
    getBootPreferenceViewModel({ fullscreen: true, sound: false }),
    {
      fullscreenText: '(F) Fullscreen: ON',
      soundText: '(S) Sound: OFF',
      fullscreenFill: 0x183e53,
      fullscreenStrokeAlpha: 0.34,
      soundFill: 0x1f252c,
      soundStrokeAlpha: 0.16,
      fullscreenTextColor: '#dff9f5',
      soundTextColor: '#acaba1'
    }
  );
});

test('boot scene model blocks game start on phone-like touch devices in portrait only', () => {
  assert.deepEqual(
    getBootOrientationState({
      isTouchDevice: true,
      viewportWidth: 430,
      viewportHeight: 932
    }),
    {
      phoneLikeTouch: true,
      isLandscape: false,
      startBlocked: true,
      hint: 'Smartphone erkannt: bitte ins Querformat drehen, dann START drücken.'
    }
  );

  assert.deepEqual(
    getBootOrientationState({
      isTouchDevice: true,
      viewportWidth: 932,
      viewportHeight: 430
    }),
    {
      phoneLikeTouch: true,
      isLandscape: true,
      startBlocked: false,
      hint: ''
    }
  );

  assert.equal(
    getBootOrientationState({
      isTouchDevice: false,
      viewportWidth: 430,
      viewportHeight: 932
    }).startBlocked,
    false
  );
});

test('boot scene model recognizes when the launched game scene is ready for preferences', () => {
  assert.equal(
    isBootGameSceneReady({
      players: [{ name: 'Amber' }],
      setStartPreference() {},
      applyStartPreferences() {}
    }),
    true
  );
  assert.equal(isBootGameSceneReady(null), false);
  assert.equal(
    isBootGameSceneReady({
      players: null,
      setStartPreference() {},
      applyStartPreferences() {}
    }),
    false
  );
});
