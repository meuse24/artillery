import test from 'node:test';
import assert from 'node:assert/strict';

import { ARCADE_CONFIG } from '../src/game/arcade/arcadeConfig.js';
import { ARCADE_EVENTS } from '../src/game/arcade/events.js';
import { MutatorSystem } from '../src/game/systems/MutatorSystem.js';

function withMockedRandom(values, run) {
  const originalRandom = Math.random;
  let index = 0;
  Math.random = () => values[Math.min(index++, values.length - 1)];

  try {
    return run();
  } finally {
    Math.random = originalRandom;
  }
}

function createEventBusSpy() {
  const events = [];
  return {
    events,
    emit(eventName, payload) {
      events.push({ eventName, payload });
    }
  };
}

test('MutatorSystem emits a null mutator when the feature is disabled', () => {
  const config = structuredClone(ARCADE_CONFIG);
  config.featureFlags.mutatorSystem = false;
  const eventBus = createEventBusSpy();
  const system = new MutatorSystem({ eventBus, config });

  assert.deepEqual(system.onTurnStart({ turnNumber: 2, wind: 12 }), { windOverride: null });
  assert.deepEqual(eventBus.events, [
    {
      eventName: ARCADE_EVENTS.TURN_STARTED,
      payload: { turnNumber: 2, wind: 12, mutator: null }
    }
  ]);
});

test('MutatorSystem applies low gravity and sudden death at the configured turn', () => {
  const config = structuredClone(ARCADE_CONFIG);
  const eventBus = createEventBusSpy();
  const system = new MutatorSystem({ eventBus, config });

  withMockedRandom([0.1], () => {
    assert.deepEqual(system.onTurnStart({ turnNumber: 12, wind: 18 }), { windOverride: null });
  });

  assert.equal(system.getGravityMultiplier(), config.mutators.lowGravityMultiplier);
  assert.equal(system.getDamageMultiplier(), config.mutators.suddenDeathDamageMultiplier);
  assert.equal(system.getHudLabel(), 'Low Gravity + Sudden Death x1.25');
});

test('MutatorSystem falls back to a random wind pulse when amplified wind is too small', () => {
  const config = structuredClone(ARCADE_CONFIG);
  const eventBus = createEventBusSpy();
  const system = new MutatorSystem({ eventBus, config });

  const effects = withMockedRandom([0.9, 0.8], () =>
    system.onTurnStart({ turnNumber: 2, wind: 1 })
  );

  assert.deepEqual(effects, { windOverride: 30.000000000000004 });
  assert.equal(system.getGravityMultiplier(), 1);
  assert.equal(system.getHudLabel(), 'Wind Pulse');
});
