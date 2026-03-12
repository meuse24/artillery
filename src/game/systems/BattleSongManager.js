let sourceUrl = '';
let battleSong = null;

function ensureBattleSong() {
  if (!sourceUrl) {
    return null;
  }
  if (!battleSong) {
    battleSong = new Audio(sourceUrl);
    battleSong.loop = true;
    battleSong.preload = 'auto';
    battleSong.volume = 0.06;
  }
  return battleSong;
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
