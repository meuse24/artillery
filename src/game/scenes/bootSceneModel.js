export function toggleBootPreference(preferences, key) {
  if (!preferences || !(key in preferences)) {
    return preferences;
  }

  return {
    ...preferences,
    [key]: !preferences[key]
  };
}

export function getBootOrientationState({ isTouchDevice = false, viewportWidth = 0, viewportHeight = 0 } = {}) {
  const width = Number.isFinite(viewportWidth) ? viewportWidth : 0;
  const height = Number.isFinite(viewportHeight) ? viewportHeight : 0;
  const shortestSide = Math.min(width, height);
  const phoneLikeTouch = Boolean(isTouchDevice) && shortestSide > 0 && shortestSide <= 500;
  const isLandscape = width >= height;
  const startBlocked = phoneLikeTouch && !isLandscape;

  return {
    phoneLikeTouch,
    isLandscape,
    startBlocked,
    hint: startBlocked
      ? 'Smartphone erkannt: bitte ins Querformat drehen, dann START drücken.'
      : ''
  };
}

export function getBootPreferenceViewModel(preferences) {
  const fullscreenOn = Boolean(preferences?.fullscreen);
  const soundOn = Boolean(preferences?.sound);

  return {
    fullscreenText: `(F) Fullscreen: ${fullscreenOn ? 'ON' : 'OFF'}`,
    soundText: `(S) Sound: ${soundOn ? 'ON' : 'OFF'}`,
    fullscreenFill: fullscreenOn ? 0x183e53 : 0x17222c,
    fullscreenStrokeAlpha: fullscreenOn ? 0.34 : 0.16,
    soundFill: soundOn ? 0x3f311e : 0x1f252c,
    soundStrokeAlpha: soundOn ? 0.34 : 0.16,
    fullscreenTextColor: fullscreenOn ? '#dff9f5' : '#a0b4bf',
    soundTextColor: soundOn ? '#ffe3b2' : '#acaba1'
  };
}

export function shouldPlayBootUiPing(preferences) {
  return Boolean(preferences?.sound);
}

export function getBootUiPingConfig(kind = 'default') {
  switch (kind) {
    case 'sound-on':
      return { frequency: 560, duration: 0.04, gain: 0.006, type: 'triangle' };
    case 'fullscreen-toggle':
      return { frequency: 430, duration: 0.04, gain: 0.006, type: 'triangle' };
    case 'blocked-start':
      return { frequency: 250, duration: 0.045, gain: 0.005, type: 'triangle' };
    case 'start':
      return { frequency: 400, duration: 0.025, gain: 0.0007, type: 'sine' };
    case 'default':
    default:
      return { frequency: 500, duration: 0.04, gain: 0.006, type: 'triangle' };
  }
}

export function isBootGameSceneReady(gameScene) {
  return Boolean(
    gameScene &&
    gameScene.players &&
    typeof gameScene.setStartPreference === 'function' &&
    typeof gameScene.applyStartPreferences === 'function'
  );
}
