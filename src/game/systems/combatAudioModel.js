function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function bumpCombatEnergy(current, amount) {
  return clamp((current ?? 0) + amount, 0, 1.35);
}

export function decayCombatEnergy(current, dt) {
  return Math.max(0, (current ?? 0) - dt * 0.58);
}

export function resolveCombatAudioIntensity({
  soundEnabled = true,
  overlayActive = false,
  gameOver = false,
  combatEnergy = 0,
  projectileStates = [],
  resolving = false,
  turnPhase = 'move',
  wind = 0
} = {}) {
  if (!soundEnabled || overlayActive || gameOver) {
    return 0;
  }

  const projectileMomentum = projectileStates.reduce((total, projectile) => {
    const speed = clamp((projectile?.speed ?? 0) / 520, 0, 1);
    const age = clamp((projectile?.age ?? 0) / 0.35, 0, 1);
    return total + speed * (0.45 + age * 0.55);
  }, 0);

  const projectileLayer = clamp(projectileMomentum * 0.16, 0, 0.48);
  const projectileCountBoost = clamp(projectileStates.length * 0.05, 0, 0.2);
  const resolvingBoost = resolving ? 0.18 : 0;
  const phaseBoost = turnPhase === 'aim' ? 0.08 : 0.03;
  const windBoost = clamp(Math.abs(wind) / 50, 0, 1) * 0.07;

  return clamp(
    0.05 +
      clamp(combatEnergy, 0, 1.2) * 0.56 +
      projectileLayer +
      projectileCountBoost +
      resolvingBoost +
      phaseBoost +
      windBoost,
    0,
    1
  );
}

function getDistanceToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSq = abx * abx + aby * aby;

  if (lengthSq <= Number.EPSILON) {
    const dx = px - ax;
    const dy = py - ay;
    return { distance: Math.hypot(dx, dy), x: ax, y: ay };
  }

  const projection = clamp(((px - ax) * abx + (py - ay) * aby) / lengthSq, 0, 1);
  const x = ax + abx * projection;
  const y = ay + aby * projection;
  return {
    distance: Math.hypot(px - x, py - y),
    x,
    y
  };
}

export function getProjectileFlybyData({
  previousX,
  previousY,
  x,
  y,
  observerX,
  observerY,
  speed,
  age,
  alreadyTriggered,
  threshold = 118
} = {}) {
  if (alreadyTriggered || (age ?? 0) < 0.12 || (speed ?? 0) < 210) {
    return { triggered: false, proximity: 0, pan: 0 };
  }

  const closest = getDistanceToSegment(observerX, observerY, previousX, previousY, x, y);
  if (closest.distance > threshold) {
    return { triggered: false, proximity: 0, pan: 0 };
  }

  const proximity = clamp(1 - closest.distance / threshold, 0, 1);
  const pan = clamp((closest.x - observerX) / threshold, -0.95, 0.95);

  return {
    triggered: true,
    proximity,
    pan
  };
}
