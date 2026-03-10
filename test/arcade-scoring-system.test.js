import test from 'node:test';
import assert from 'node:assert/strict';

import { ARCADE_CONFIG } from '../src/game/arcade/arcadeConfig.js';
import { ARCADE_EVENTS } from '../src/game/arcade/events.js';
import { ArcadeScoringSystem } from '../src/game/systems/ArcadeScoringSystem.js';
import { ArcadeEventBus } from '../src/game/systems/ArcadeEventBus.js';

function createScoringSystem() {
  const eventBus = new ArcadeEventBus();
  const config = structuredClone(ARCADE_CONFIG);
  const system = new ArcadeScoringSystem({ eventBus, config });
  system.resetRound(['Amber']);
  return { eventBus, system };
}

test('ArcadeScoringSystem awards damage, skillshots and cleans turn state after an explosion', () => {
  const { eventBus, system } = createScoringSystem();
  const skillshots = [];

  eventBus.on(ARCADE_EVENTS.SKILLSHOT_AWARDED, (payload) => {
    skillshots.push(payload.skillshot);
  });

  eventBus.emit(ARCADE_EVENTS.SHOT_FIRED, {
    shooterName: 'Amber',
    turnNumber: 1,
    weaponId: 'shell',
    x: 100,
    y: 200,
    turnTimer: 2
  });
  eventBus.emit(ARCADE_EVENTS.PROJECTILE_BOUNCED, {
    ownerName: 'Amber',
    turnNumber: 1
  });
  eventBus.emit(ARCADE_EVENTS.DAMAGE_APPLIED, {
    ownerName: 'Amber',
    turnNumber: 1,
    damage: 10,
    distance: 10
  });
  eventBus.emit(ARCADE_EVENTS.EXPLOSION_RESOLVED, {
    ownerName: 'Amber',
    turnNumber: 1,
    impactDistanceFromShooter: 500
  });

  const player = system.getSnapshot().players.Amber;
  assert.equal(player.shots, 1);
  assert.equal(player.bounces, 1);
  assert.equal(player.hits, 1);
  assert.equal(player.directHits, 1);
  assert.equal(player.damage, 10);
  assert.equal(player.score, 525);
  assert.deepEqual(player.skillshots, {
    directHit: 1,
    bankShot: 1,
    longShot: 1,
    lastSecond: 1
  });
  assert.deepEqual(skillshots.sort(), ['bankShot', 'directHit', 'lastSecond', 'longShot']);
  assert.equal(system.shotMetaByTurn.size, 0);
  assert.equal(system.bouncesByTurn.size, 0);
  assert.equal(system.damageRegisteredByTurn.size, 0);
  assert.equal(system.awardedSkillshotsByTurn.size, 0);
});

test('ArcadeScoringSystem increases the combo multiplier on chained scoring turns only once per turn', () => {
  const { eventBus, system } = createScoringSystem();
  const comboUpdates = [];

  eventBus.on(ARCADE_EVENTS.COMBO_UPDATED, (payload) => {
    comboUpdates.push(payload);
  });

  eventBus.emit(ARCADE_EVENTS.SHOT_FIRED, {
    shooterName: 'Amber',
    turnNumber: 1,
    weaponId: 'shell',
    x: 0,
    y: 0,
    turnTimer: 5
  });
  eventBus.emit(ARCADE_EVENTS.DAMAGE_APPLIED, {
    ownerName: 'Amber',
    turnNumber: 1,
    damage: 10,
    distance: 40
  });
  eventBus.emit(ARCADE_EVENTS.EXPLOSION_RESOLVED, {
    ownerName: 'Amber',
    turnNumber: 1,
    impactDistanceFromShooter: 100
  });

  eventBus.emit(ARCADE_EVENTS.SHOT_FIRED, {
    shooterName: 'Amber',
    turnNumber: 3,
    weaponId: 'shell',
    x: 0,
    y: 0,
    turnTimer: 5
  });
  eventBus.emit(ARCADE_EVENTS.DAMAGE_APPLIED, {
    ownerName: 'Amber',
    turnNumber: 3,
    damage: 10,
    distance: 40
  });
  eventBus.emit(ARCADE_EVENTS.DAMAGE_APPLIED, {
    ownerName: 'Amber',
    turnNumber: 3,
    damage: 10,
    distance: 40
  });
  eventBus.emit(ARCADE_EVENTS.EXPLOSION_RESOLVED, {
    ownerName: 'Amber',
    turnNumber: 3,
    impactDistanceFromShooter: 100
  });

  const player = system.getSnapshot().players.Amber;
  assert.equal(player.multiplier, 1.25);
  assert.equal(player.bestMultiplier, 1.25);
  assert.equal(player.score, 350);
  assert.deepEqual(comboUpdates, [{ playerName: 'Amber', multiplier: 1.25 }]);
});

test('ArcadeScoringSystem deduplicates skillshot awards within the same turn', () => {
  const { eventBus, system } = createScoringSystem();
  const skillshots = [];

  eventBus.on(ARCADE_EVENTS.SKILLSHOT_AWARDED, (payload) => {
    skillshots.push(payload.skillshot);
  });

  eventBus.emit(ARCADE_EVENTS.SHOT_FIRED, {
    shooterName: 'Amber',
    turnNumber: 6,
    weaponId: 'split',
    x: 50,
    y: 50,
    turnTimer: 2
  });
  eventBus.emit(ARCADE_EVENTS.DAMAGE_APPLIED, {
    ownerName: 'Amber',
    turnNumber: 6,
    damage: 10,
    distance: 5
  });
  eventBus.emit(ARCADE_EVENTS.DAMAGE_APPLIED, {
    ownerName: 'Amber',
    turnNumber: 6,
    damage: 10,
    distance: 5
  });
  eventBus.emit(ARCADE_EVENTS.EXPLOSION_RESOLVED, {
    ownerName: 'Amber',
    turnNumber: 6,
    impactDistanceFromShooter: 500
  });

  const player = system.getSnapshot().players.Amber;
  assert.equal(player.hits, 2);
  assert.equal(player.directHits, 2);
  assert.equal(player.score, 505);
  assert.deepEqual(player.skillshots, {
    directHit: 1,
    bankShot: 0,
    longShot: 1,
    lastSecond: 1
  });
  assert.deepEqual(skillshots.sort(), ['directHit', 'lastSecond', 'longShot']);
});
