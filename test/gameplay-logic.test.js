import test from 'node:test';
import assert from 'node:assert/strict';

import { getNextActivePlayerIndex, getNextWeaponIndex } from '../src/game/systems/gameplayLogic.js';

test('gameplay logic skips empty weapons and wraps around the arsenal', () => {
  const weapons = [
    { id: 'shell' },
    { id: 'mortar' },
    { id: 'split' }
  ];
  const ammo = { shell: 0, mortar: 0, split: 2 };

  assert.equal(
    getNextWeaponIndex(0, 1, weapons, (weaponId) => ammo[weaponId] ?? 0),
    2
  );
  assert.equal(
    getNextWeaponIndex(2, -1, weapons, (weaponId) => ammo[weaponId] ?? 0),
    2
  );
});

test('gameplay logic advances to the next alive player and wraps correctly', () => {
  const players = [
    { isAlive: () => true },
    { isAlive: () => false },
    { isAlive: () => true }
  ];

  assert.equal(getNextActivePlayerIndex(players, 0), 2);
  assert.equal(getNextActivePlayerIndex(players, 2), 0);
});
