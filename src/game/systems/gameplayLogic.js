export function getNextWeaponIndex(currentIndex, direction, weapons, getAmmoForWeaponId) {
  let nextIndex = currentIndex;

  for (let i = 0; i < weapons.length; i += 1) {
    nextIndex = ((nextIndex + direction) % weapons.length + weapons.length) % weapons.length;
    if (getAmmoForWeaponId(weapons[nextIndex].id) > 0) {
      return nextIndex;
    }
  }

  return currentIndex;
}

export function getNextActivePlayerIndex(players, currentIndex) {
  if (!Array.isArray(players) || !players.length) {
    return currentIndex;
  }

  for (let step = 1; step <= players.length; step += 1) {
    const candidateIndex = (currentIndex + step) % players.length;
    const candidate = players[candidateIndex];
    const alive = typeof candidate?.isAlive === 'function'
      ? candidate.isAlive()
      : Boolean(candidate?.alive);

    if (alive) {
      return candidateIndex;
    }
  }

  return currentIndex;
}
