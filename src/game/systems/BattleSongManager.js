import {
  BASE_BATTLE_SONG_VOLUME,
  clampAudioLevel,
  DEFAULT_AUDIO_LEVEL,
  resolveSongVolume
} from './audioMixConfig.js';

let sourceUrl = '';
let battleSong = null;
let battleSongLevel = DEFAULT_AUDIO_LEVEL;

function getBattleSongVolume() {
  return resolveSongVolume(BASE_BATTLE_SONG_VOLUME, battleSongLevel);
}

function ensureBattleSong() {
  if (!sourceUrl) {
    return null;
  }
  if (!battleSong) {
    battleSong = new Audio(sourceUrl);
    battleSong.loop = true;
    battleSong.preload = 'auto';
    battleSong.volume = getBattleSongVolume();
  }
  return battleSong;
}

export function setBattleSongVolumeLevel(level) {
  battleSongLevel = clampAudioLevel(level, DEFAULT_AUDIO_LEVEL);
  if (battleSong) {
    battleSong.volume = getBattleSongVolume();
  }
}

export function setBattleSongSource(url) {
  if (!url || sourceUrl === url) {
    return;
  }

  const wasPlaying = Boolean(battleSong && !battleSong.paused);
  if (battleSong) {
    battleSong.pause();
    battleSong = null;
  }
  sourceUrl = url;

  if (wasPlaying) {
    playBattleSong();
  }
}

export function playBattleSong({ restart = false } = {}) {
  const song = ensureBattleSong();
  if (!song) {
    return;
  }

  if (restart) {
    try {
      song.currentTime = 0;
    } catch {
      // Ignore currentTime write failures.
    }
  }

  if (!song.paused) {
    return;
  }

  const playPromise = song.play();
  if (playPromise?.catch) {
    playPromise.catch(() => {});
  }
}

export function stopBattleSong({ reset = false } = {}) {
  if (!battleSong) {
    return;
  }
  battleSong.pause();
  if (reset) {
    try {
      battleSong.currentTime = 0;
    } catch {
      // Ignore currentTime write failures.
    }
  }
}
