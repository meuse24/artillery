import { clampAudioLevel, DEFAULT_AUDIO_LEVEL } from './audioMixConfig.js';

export const LAUNCH_PREFERENCES_STORAGE_KEY = 'crater-command.launch-preferences';

export const DEFAULT_LAUNCH_PREFERENCES = Object.freeze({
  fullscreen: true,
  sound: true,
  musicVolume: DEFAULT_AUDIO_LEVEL,
  sfxVolume: DEFAULT_AUDIO_LEVEL
});

function normalizeBoolean(value, fallback) {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeAudioLevel(value, fallback) {
  return Number.isFinite(value) ? clampAudioLevel(value, fallback) : fallback;
}

export function normalizeLaunchPreferences(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    fullscreen: normalizeBoolean(source.fullscreen, DEFAULT_LAUNCH_PREFERENCES.fullscreen),
    sound: normalizeBoolean(source.sound, DEFAULT_LAUNCH_PREFERENCES.sound),
    musicVolume: normalizeAudioLevel(source.musicVolume, DEFAULT_LAUNCH_PREFERENCES.musicVolume),
    sfxVolume: normalizeAudioLevel(source.sfxVolume, DEFAULT_LAUNCH_PREFERENCES.sfxVolume)
  };
}

export function loadLaunchPreferences() {
  const fallback = { ...DEFAULT_LAUNCH_PREFERENCES };
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }

  try {
    const serialized = window.localStorage.getItem(LAUNCH_PREFERENCES_STORAGE_KEY);
    if (!serialized) {
      return fallback;
    }
    return normalizeLaunchPreferences(JSON.parse(serialized));
  } catch {
    return fallback;
  }
}

export function saveLaunchPreferences(preferences) {
  const normalized = normalizeLaunchPreferences(preferences);
  if (typeof window === 'undefined' || !window.localStorage) {
    return normalized;
  }

  try {
    window.localStorage.setItem(LAUNCH_PREFERENCES_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Ignore quota/privacy mode write failures and keep runtime preferences.
  }
  return normalized;
}
