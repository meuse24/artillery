import test from 'node:test';
import assert from 'node:assert/strict';

import { WEAPONS, getWeapon } from '../src/game/weapons.js';

test('getWeapon wraps positive and negative indices into the weapon list', () => {
  assert.equal(getWeapon(0).id, 'shell');
  assert.equal(getWeapon(WEAPONS.length).id, 'shell');
  assert.equal(getWeapon(-1).id, 'bouncer');
});

test('weapon definitions expose the expected arsenal metadata', () => {
  assert.deepEqual(
    WEAPONS.map((weapon) => weapon.id),
    ['shell', 'mortar', 'split', 'bouncer']
  );
  assert.equal(WEAPONS[0].ammo, null);
  assert.equal(WEAPONS[1].ammo, 5);
  assert.equal(WEAPONS[2].childCount, 3);
  assert.equal(WEAPONS[3].maxBounces, 3);
});
