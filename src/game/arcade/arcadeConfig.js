export const ARCADE_CONFIG = Object.freeze({
  featureFlags: {
    scoringSystem: true,
    mutatorSystem: true,
    phase2Skillshots: true,
    phase2ComboMultiplier: true,
    phase3TurnMutators: false
  },
  scoring: {
    baseDamagePointFactor: 10,
    directHitBonus: 140,
    bankShotBonus: 120,
    longShotBonus: 90,
    lastSecondBonus: 75,
    comboStep: 0.25,
    comboMax: 3
  },
  skillshot: {
    directHitDistance: 16,
    longShotDistance: 420,
    lastSecondThreshold: 3
  },
  limits: {
    recentEvents: 120,
    feedItems: 6
  }
});
