import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_LAUNCH_PREFERENCES,
  LAUNCH_PREFERENCES_STORAGE_KEY,
  loadLaunchPreferences,
  normalizeLaunchPreferences,
  saveLaunchPreferences
} from '../src/game/systems/LaunchPreferencesStore.js';
import { installMockWindow } from '../test-support/browserEnv.js';

test('normalizeLaunchPreferences keeps only boolean values and falls back otherwise', () => {
  assert.deepEqual(
    normalizeLaunchPreferences({ fullscreen: false, sound: 'yes', musicVolume: 0.45, sfxVolume: 7 }),
    { fullscreen: false, sound: true, musicVolume: 0.45, sfxVolume: 1 }
  );
  assert.deepEqual(normalizeLaunchPreferences(null), DEFAULT_LAUNCH_PREFERENCES);
});

test('loadLaunchPreferences returns defaults when storage is missing or invalid', () => {
  const env = installMockWindow({
    [LAUNCH_PREFERENCES_STORAGE_KEY]: 'not-json'
  });

  try {
    assert.deepEqual(loadLaunchPreferences(), DEFAULT_LAUNCH_PREFERENCES);
    env.localStorage.removeItem(LAUNCH_PREFERENCES_STORAGE_KEY);
    assert.deepEqual(loadLaunchPreferences(), DEFAULT_LAUNCH_PREFERENCES);
  } finally {
    env.restore();
  }
});

test('loadLaunchPreferences reads and normalizes persisted preferences', () => {
  const env = installMockWindow({
    [LAUNCH_PREFERENCES_STORAGE_KEY]: JSON.stringify({
      fullscreen: false,
      sound: 'maybe',
      musicVolume: 0.4,
      sfxVolume: -2
    })
  });

  try {
    assert.deepEqual(loadLaunchPreferences(), {
      fullscreen: false,
      sound: true,
      musicVolume: 0.4,
      sfxVolume: 0
    });
  } finally {
    env.restore();
  }
});

test('saveLaunchPreferences persists normalized preferences and returns them', () => {
  const env = installMockWindow();

  try {
    assert.deepEqual(
      saveLaunchPreferences({ fullscreen: 'nope', sound: false, musicVolume: 0.35, sfxVolume: 0.9 }),
      { fullscreen: true, sound: false, musicVolume: 0.35, sfxVolume: 0.9 }
    );
    assert.equal(
      env.localStorage.getItem(LAUNCH_PREFERENCES_STORAGE_KEY),
      JSON.stringify({ fullscreen: true, sound: false, musicVolume: 0.35, sfxVolume: 0.9 })
    );
  } finally {
    env.restore();
  }
});
