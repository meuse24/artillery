export function shouldAdvanceTurnOverlayOnGlobalPointerDown({
  overlayType = null,
  isCpuTurn = false,
  now = 0,
  blockedUntil = 0,
  currentlyOver = []
} = {}) {
  if (overlayType !== 'turn' || isCpuTurn || now < blockedUntil) {
    return false;
  }

  return !currentlyOver.some((entry) => {
    const target = entry?.gameObject;
    return Boolean(target && target.input?.enabled);
  });
}
