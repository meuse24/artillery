import test from 'node:test';
import assert from 'node:assert/strict';

import { ScoreStore } from '../src/game/systems/ScoreStore.js';
import { installMockWindow } from '../test-support/browserEnv.js';

const CURRENT_KEY = 'crater-command-highscores-v1';
const LEGACY_KEY = 'artillery-highscores-v1';

test('ScoreStore.load returns a zeroed fallback without a browser window', () => {
  const previousWindow = globalThis.window;
  delete globalThis.window;

  try {
    const store = new ScoreStore(['Amber', 'Cyan']);
    assert.deepEqual(store.load(), { Amber: 0, Cyan: 0 });
  } finally {
    if (previousWindow !== undefined) {
      globalThis.window = previousWindow;
    }
  }
});

test('ScoreStore.load merges persisted highscores from current or legacy storage', () => {
  const env = installMockWindow({
    [LEGACY_KEY]: JSON.stringify({ Amber: 3 })
  });

  try {
    const store = new ScoreStore(['Amber', 'Cyan']);
    assert.deepEqual(store.load(), { Amber: 3, Cyan: 0 });

    env.localStorage.setItem(CURRENT_KEY, JSON.stringify({ Cyan: 2 }));
    assert.deepEqual(store.load(), { Amber: 0, Cyan: 2 });
  } finally {
    env.restore();
  }
});

test('ScoreStore.recordWin increments and persists the new tally', () => {
  const env = installMockWindow({
    [CURRENT_KEY]: JSON.stringify({ Amber: 1, Cyan: 4 })
  });

  try {
    const store = new ScoreStore(['Amber', 'Cyan']);
    assert.deepEqual(store.recordWin('Amber'), { Amber: 2, Cyan: 4 });
    assert.equal(env.localStorage.getItem(CURRENT_KEY), JSON.stringify({ Amber: 2, Cyan: 4 }));
  } finally {
    env.restore();
  }
});

test('ScoreStore.load falls back safely when storage contains invalid JSON', () => {
  const env = installMockWindow({
    [CURRENT_KEY]: '{bad-json'
  });

  try {
    const store = new ScoreStore(['Amber', 'Cyan']);
    assert.deepEqual(store.load(), { Amber: 0, Cyan: 0 });
  } finally {
    env.restore();
  }
});
