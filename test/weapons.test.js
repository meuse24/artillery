import test from 'node:test';
import assert from 'node:assert/strict';

import { WEAPONS, getWeapon } from '../src/game/weapons.js';

test('getWeapon wraps positive and negative indices into the weapon list', () => {
  assert.equal(getWeapon(0).id, 'shell');
  assert.equal(getWeapon(WEAPONS.length).id, 'shell');
  assert.equal(getWeapon(-1).id, 'hopper');
});

test('weapon definitions expose the expected arsenal metadata', () => {
  assert.deepEqual(
    WEAPONS.map((weapon) => weapon.id),
    ['shell', 'mortar', 'split', 'bouncer', 'rail', 'splitstorm', 'hopper']
  );
  assert.equal(WEAPONS[0].rarity, 'common');
  assert.equal(WEAPONS[0].ammo, null);
  assert.equal(WEAPONS[1].ammo, 5);
  assert.equal(WEAPONS[1].rarity, 'rare');
  assert.equal(WEAPONS[2].childCount, 3);
  assert.equal(WEAPONS[2].rarity, 'rare');
  assert.equal(WEAPONS[3].maxBounces, 3);
  assert.equal(WEAPONS[3].rarity, 'rare');
  assert.equal(WEAPONS[4].ammo, 3);
  assert.equal(WEAPONS[4].rarity, 'rare');
  assert.equal(WEAPONS[4].windScale < 0.4, true);
  assert.equal(WEAPONS[5].childCount, 5);
  assert.equal(WEAPONS[5].rarity, 'epic');
  assert.equal(WEAPONS[6].ammo, 2);
  assert.equal(WEAPONS[6].maxBounces, 4);
  assert.equal(WEAPONS[6].rarity, 'rare');
});
