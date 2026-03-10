export function resolveBackgroundMusicState({
  soundEnabled,
  battleActive,
  gameOver,
  overlayType = null,
  previousOverlayType = null
}) {
  if (!soundEnabled) {
    return { title: false, battle: false };
  }

  const titleOverlay =
    overlayType === 'start' ||
    overlayType === 'gameover' ||
    (overlayType === 'help' &&
      (previousOverlayType === 'start' || previousOverlayType === 'gameover'));

  if (titleOverlay) {
    return { title: true, battle: false };
  }

  return {
    title: false,
    battle: Boolean(battleActive) && !gameOver
  };
}
