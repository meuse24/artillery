import test from 'node:test';
import assert from 'node:assert/strict';

import {
  adjustBootPreferenceLevel,
  getBootUiPingConfig,
  getBootOrientationState,
  getBootPreferenceViewModel,
  isBootGameSceneReady,
  shouldPlayBootUiPing,
  toggleBootPreference
} from '../src/game/scenes/bootSceneModel.js';

test('boot scene model toggles known preferences and ignores unknown keys', () => {
  const prefs = { fullscreen: true, sound: false, musicVolume: 0.8, sfxVolume: 0.6 };

  assert.deepEqual(toggleBootPreference(prefs, 'fullscreen'), {
    fullscreen: false,
    sound: false,
    musicVolume: 0.8,
    sfxVolume: 0.6
  });
  assert.equal(toggleBootPreference(prefs, 'missing'), prefs);
});

test('boot scene model derives the correct UI labels and styles', () => {
  assert.deepEqual(
    getBootPreferenceViewModel({ fullscreen: true, sound: false, musicVolume: 0.4, sfxVolume: 0 }),
    {
      fullscreenText: '(F) Fullscreen: ON',
      soundText: '(S) Sound: OFF',
      musicText: '< Music 40% > (Q/W)',
      sfxText: '< SFX 0% > (A/D)',
      fullscreenFill: 0x183e53,
      fullscreenStrokeAlpha: 0.34,
      soundFill: 0x1f252c,
      soundStrokeAlpha: 0.16,
      musicFill: 0x17222c,
      musicStrokeAlpha: 0.12,
      sfxFill: 0x1f252c,
      sfxStrokeAlpha: 0.12,
      fullscreenTextColor: '#dff9f5',
      soundTextColor: '#acaba1',
      musicTextColor: '#9ca8a4',
      sfxTextColor: '#aaa39a'
    }
  );
});

test('boot scene model steps audio levels in 10 percent increments', () => {
  const prefs = { fullscreen: true, sound: true, musicVolume: 0.4, sfxVolume: 1 };

  assert.deepEqual(adjustBootPreferenceLevel(prefs, 'musicVolume', 1), {
    fullscreen: true,
    sound: true,
    musicVolume: 0.5,
    sfxVolume: 1
  });
  assert.deepEqual(adjustBootPreferenceLevel(prefs, 'sfxVolume', -1), {
    fullscreen: true,
    sound: true,
    musicVolume: 0.4,
    sfxVolume: 0.9
  });
});

test('boot scene model exposes the quieter start ping and blocks UI pings when sound is off', () => {
  assert.deepEqual(getBootUiPingConfig('sound-on'), {
    frequency: 560,
    duration: 0.04,
    gain: 0.006,
    type: 'triangle'
  });
  assert.deepEqual(getBootUiPingConfig('start'), {
    frequency: 400,
    duration: 0.025,
    gain: 0.0007,
    type: 'sine'
  });
  assert.deepEqual(getBootUiPingConfig('blocked-start'), {
    frequency: 250,
    duration: 0.045,
    gain: 0.005,
    type: 'triangle'
  });
  assert.equal(shouldPlayBootUiPing({ sound: true }), true);
  assert.equal(shouldPlayBootUiPing({ sound: false }), false);
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
