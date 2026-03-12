export const DEFAULT_AUDIO_LEVEL = 1;
export const AUDIO_LEVEL_STEP = 0.1;
export const BASE_TITLE_SONG_VOLUME = 0.28;
export const BASE_BATTLE_SONG_VOLUME = 0.06;

export function clampAudioLevel(value, fallback = DEFAULT_AUDIO_LEVEL) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, value));
}

export function stepAudioLevel(value, direction, step = AUDIO_LEVEL_STEP) {
  const next = clampAudioLevel(value) + step * Math.sign(direction || 0);
  return clampAudioLevel(Math.round(next * 10) / 10);
}

export function formatAudioLevelPercent(value) {
  return `${Math.round(clampAudioLevel(value) * 100)}%`;
}

export function resolveSongVolume(baseVolume, level = DEFAULT_AUDIO_LEVEL) {
  return clampAudioLevel(level) * baseVolume;
}
