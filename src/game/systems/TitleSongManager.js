let sourceUrl = '';
let titleSong = null;

function ensureTitleSong() {
  if (!sourceUrl) {
    return null;
  }
  if (!titleSong) {
    titleSong = new Audio(sourceUrl);
    titleSong.loop = true;
    titleSong.preload = 'auto';
    titleSong.volume = 0.18;
  }
  return titleSong;
}

export function setTitleSongSource(url) {
  if (!url || sourceUrl === url) {
    return;
  }

  const wasPlaying = Boolean(titleSong && !titleSong.paused);
  if (titleSong) {
    titleSong.pause();
    titleSong = null;
  }
  sourceUrl = url;

  if (wasPlaying) {
    playTitleSong();
  }
}

export function playTitleSong({ restart = false } = {}) {
  const song = ensureTitleSong();
  if (!song) {
    return;
  }

  if (restart) {
    try {
      song.currentTime = 0;
    } catch {
      // Ignore currentTime write issues on some browsers.
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

export function stopTitleSong({ reset = false } = {}) {
  if (!titleSong) {
    return;
  }
  titleSong.pause();
  if (reset) {
    try {
      titleSong.currentTime = 0;
    } catch {
      // Ignore currentTime write issues on some browsers.
    }
  }
}
