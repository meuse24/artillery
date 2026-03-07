export const ARCADE_CONFIG = Object.freeze({
  featureFlags: {
    scoringSystem: true,
    mutatorSystem: true,
    phase2Skillshots: true,
    phase2ComboMultiplier: true,
    phase3TurnMutators: true
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
  mutators: {
    turnInterval: 2,
    lowGravityMultiplier: 0.82,
    windPulseMultiplier: 1.3,
    suddenDeathTurn: 12,
    suddenDeathDamageMultiplier: 1.25
  },
  accessibility: {
    reducedMotionDefault: false,
    reducedMotionScale: 0.45
  },
  limits: {
    recentEvents: 120,
    feedItems: 6
  }
});
