import test from 'node:test';
import assert from 'node:assert/strict';

import {
  playTitleSong,
  setTitleSongSource,
  stopTitleSong
} from '../src/game/systems/TitleSongManager.js';

test('TitleSongManager creates one audio instance per source and controls playback state', () => {
  const originalAudio = globalThis.Audio;
  const created = [];

  class FakeAudio {
    constructor(src) {
      this.src = src;
      this.loop = false;
      this.preload = '';
      this.volume = 1;
      this.paused = true;
      this.currentTime = 7;
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
    setTitleSongSource('track-a.ogg');
    playTitleSong();
    playTitleSong();

    assert.equal(created.length, 1);
    assert.equal(created[0].src, 'track-a.ogg');
    assert.equal(created[0].loop, true);
    assert.equal(created[0].preload, 'auto');
    assert.equal(created[0].volume, 0.18);
    assert.equal(created[0].paused, false);

    stopTitleSong({ reset: true });
    assert.equal(created[0].paused, true);
    assert.equal(created[0].currentTime, 0);

    setTitleSongSource('track-b.ogg');
    playTitleSong({ restart: true });

    assert.equal(created.length, 2);
    assert.equal(created[1].src, 'track-b.ogg');
    assert.equal(created[1].currentTime, 0);
    assert.equal(created[1].paused, false);
  } finally {
    stopTitleSong({ reset: true });
    if (originalAudio === undefined) {
      delete globalThis.Audio;
    } else {
      globalThis.Audio = originalAudio;
    }
  }
});
