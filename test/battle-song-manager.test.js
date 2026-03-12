import test from 'node:test';
import assert from 'node:assert/strict';

import {
  playBattleSong,
  setBattleSongSource,
  setBattleSongVolumeLevel,
  stopBattleSong
} from '../src/game/systems/BattleSongManager.js';

test('BattleSongManager creates one low-volume looping background track', () => {
  const originalAudio = globalThis.Audio;
  const created = [];

  class FakeAudio {
    constructor(src) {
      this.src = src;
      this.loop = false;
      this.preload = '';
      this.volume = 1;
      this.paused = true;
      this.currentTime = 5;
      created.push(this);
    }

    play() {
      this.paused = false;
      return Promise.resolve();
    }

    pause() {
      this.paused = true;
    }
  }

  globalThis.Audio = FakeAudio;

  try {
    setBattleSongSource('battle-a.ogg');
    playBattleSong();
    playBattleSong();

    assert.equal(created.length, 1);
    assert.equal(created[0].src, 'battle-a.ogg');
    assert.equal(created[0].loop, true);
    assert.equal(created[0].preload, 'auto');
    assert.equal(created[0].volume, 0.06);
    assert.equal(created[0].paused, false);

    setBattleSongVolumeLevel(0.5);
    assert.equal(created[0].volume, 0.03);

    stopBattleSong({ reset: true });
    assert.equal(created[0].paused, true);
    assert.equal(created[0].currentTime, 0);
  } finally {
    setBattleSongVolumeLevel(1);
    stopBattleSong({ reset: true });
    if (originalAudio === undefined) {
      delete globalThis.Audio;
    } else {
      globalThis.Audio = originalAudio;
    }
  }
});
