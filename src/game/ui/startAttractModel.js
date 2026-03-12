export function getNextStartAttractPhase(phase = 'start') {
  return phase === 'demo' ? 'start' : 'demo';
}

export function getStartAttractPhaseDuration(phase = 'start') {
  return phase === 'demo' ? 20000 : 5200;
}
