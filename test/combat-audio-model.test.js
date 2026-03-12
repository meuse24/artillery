import test from 'node:test';
import assert from 'node:assert/strict';

import {
  bumpCombatEnergy,
  decayCombatEnergy,
  getProjectileFlybyData,
  resolveCombatAudioIntensity
} from '../src/game/systems/combatAudioModel.js';

test('combat audio intensity falls silent when sound should not play', () => {
  assert.equal(
    resolveCombatAudioIntensity({
      soundEnabled: false,
      combatEnergy: 1,
      projectileStates: [{ speed: 500, age: 0.2 }],
      resolving: true
    }),
    0
  );

  assert.equal(
    resolveCombatAudioIntensity({
      soundEnabled: true,
      overlayActive: true,
      combatEnergy: 1,
      projectileStates: [{ speed: 500, age: 0.2 }]
    }),
    0
  );
});

test('combat audio intensity rises with energy, active shells and resolving pressure', () => {
  const intensity = resolveCombatAudioIntensity({
    soundEnabled: true,
    combatEnergy: 0.72,
    projectileStates: [
      { speed: 470, age: 0.22 },
      { speed: 360, age: 0.14 }
    ],
    resolving: true,
    turnPhase: 'aim',
    wind: 28
  });

  assert.equal(intensity > 0.8, true);
  assert.equal(intensity <= 1, true);
});

test('combat energy helpers accumulate and decay within expected bounds', () => {
  assert.equal(bumpCombatEnergy(0.9, 0.8), 1.35);
  assert.equal(decayCombatEnergy(0.5, 0.5) < 0.5, true);
  assert.equal(decayCombatEnergy(0.1, 1), 0);
});

test('projectile flyby data triggers for a fast shell passing close to the listener', () => {
  const result = getProjectileFlybyData({
    previousX: 520,
    previousY: 300,
    x: 710,
    y: 315,
    observerX: 640,
    observerY: 320,
    speed: 440,
    age: 0.22,
    alreadyTriggered: false
  });

  assert.deepEqual(
    {
      triggered: result.triggered,
      loudEnough: result.proximity > 0.35,
      panRight: result.pan > 0
    },
    {
      triggered: true,
      loudEnough: true,
      panRight: true
    }
  );
});

test('projectile flyby data ignores slow, young or already triggered projectiles', () => {
  assert.equal(
    getProjectileFlybyData({
      previousX: 560,
      previousY: 300,
      x: 650,
      y: 300,
      observerX: 640,
      observerY: 300,
      speed: 180,
      age: 0.3,
      alreadyTriggered: false
    }).triggered,
    false
  );

  assert.equal(
    getProjectileFlybyData({
      previousX: 560,
      previousY: 300,
      x: 650,
      y: 300,
      observerX: 640,
      observerY: 300,
      speed: 380,
      age: 0.08,
      alreadyTriggered: false
    }).triggered,
    false
  );

  assert.equal(
    getProjectileFlybyData({
      previousX: 560,
      previousY: 300,
      x: 650,
      y: 300,
      observerX: 640,
      observerY: 300,
      speed: 380,
      age: 0.3,
      alreadyTriggered: true
    }).triggered,
    false
  );
});
