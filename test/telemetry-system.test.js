import test from 'node:test';
import assert from 'node:assert/strict';

import { ARCADE_EVENTS } from '../src/game/arcade/events.js';
import { ArcadeEventBus } from '../src/game/systems/ArcadeEventBus.js';
import { TelemetrySystem } from '../src/game/systems/TelemetrySystem.js';
import { installMockWindow } from '../test-support/browserEnv.js';

const STORAGE_KEY = 'crater-command-telemetry-v1';

test('TelemetrySystem records rounds, direct hits and summary metrics', () => {
  const env = installMockWindow();
  const eventBus = new ArcadeEventBus();
  const telemetry = new TelemetrySystem({ eventBus, historyLimit: 4 });

  try {
    eventBus.emit(ARCADE_EVENTS.ROUND_STARTED, { turnNumber: 2 });
    eventBus.emit(ARCADE_EVENTS.SHOT_FIRED, {});
    eventBus.emit(ARCADE_EVENTS.DAMAGE_APPLIED, { damage: 24, distance: 10 });
    eventBus.emit(ARCADE_EVENTS.DAMAGE_APPLIED, { damage: 0, distance: 2 });
    eventBus.emit(ARCADE_EVENTS.ROUND_ENDED, { turnNumber: 5 });

    assert.deepEqual(telemetry.history, [
      { startTurn: 2, shots: 1, hits: 1, directHits: 1, damage: 24, turns: 4 }
    ]);
    assert.deepEqual(telemetry.getSummary(), {
      rounds: 1,
      avgTurns: 4,
      hitRate: 1,
      directHitRate: 1,
      avgDamage: 24
    });
    assert.match(telemetry.getSummaryText(), /Telemetry \(1 rounds\)/);
    assert.equal(
      env.localStorage.getItem(STORAGE_KEY),
      JSON.stringify([{ startTurn: 2, shots: 1, hits: 1, directHits: 1, damage: 24, turns: 4 }])
    );
  } finally {
    telemetry.destroy();
    env.restore();
  }
});

test('TelemetrySystem loads persisted history and enforces the history limit', () => {
  const env = installMockWindow({
    [STORAGE_KEY]: JSON.stringify([{ startTurn: 1, shots: 2, hits: 1, directHits: 0, damage: 12, turns: 3 }])
  });
  const eventBus = new ArcadeEventBus();
  const telemetry = new TelemetrySystem({ eventBus, historyLimit: 2 });

  try {
    eventBus.emit(ARCADE_EVENTS.ROUND_STARTED, { turnNumber: 4 });
    eventBus.emit(ARCADE_EVENTS.ROUND_ENDED, { turnNumber: 4 });
    eventBus.emit(ARCADE_EVENTS.ROUND_STARTED, { turnNumber: 5 });
    eventBus.emit(ARCADE_EVENTS.ROUND_ENDED, { turnNumber: 7 });

    assert.equal(telemetry.history.length, 2);
    assert.deepEqual(telemetry.history[0], {
      startTurn: 5,
      shots: 0,
      hits: 0,
      directHits: 0,
      damage: 0,
      turns: 3
    });
    assert.deepEqual(telemetry.history[1], {
      startTurn: 4,
      shots: 0,
      hits: 0,
      directHits: 0,
      damage: 0,
      turns: 1
    });
  } finally {
    telemetry.destroy();
    env.restore();
  }
});
