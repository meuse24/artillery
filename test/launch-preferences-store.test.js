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
    normalizeLaunchPreferences({ fullscreen: false, sound: 'yes' }),
    { fullscreen: false, sound: true }
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
    [LAUNCH_PREFERENCES_STORAGE_KEY]: JSON.stringify({ fullscreen: false, sound: 'maybe' })
  });

  try {
    assert.deepEqual(loadLaunchPreferences(), { fullscreen: false, sound: true });
  } finally {
    env.restore();
  }
});

test('saveLaunchPreferences persists normalized preferences and returns them', () => {
  const env = installMockWindow();

  try {
    assert.deepEqual(
      saveLaunchPreferences({ fullscreen: 'nope', sound: false }),
      { fullscreen: true, sound: false }
    );
    assert.equal(
      env.localStorage.getItem(LAUNCH_PREFERENCES_STORAGE_KEY),
      JSON.stringify({ fullscreen: true, sound: false })
    );
  } finally {
    env.restore();
  }
});
