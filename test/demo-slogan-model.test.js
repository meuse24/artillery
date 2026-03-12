import test from 'node:test';
import assert from 'node:assert/strict';

import { DEMO_SLOGANS, pickNextDemoSlogan } from '../src/game/ui/demoSloganModel.js';

test('demo slogan model returns a slogan from the pool', () => {
  const slogan = pickNextDemoSlogan('', () => 0);
  assert.ok(DEMO_SLOGANS.includes(slogan));
});

test('demo slogan model avoids repeating the previous slogan when alternatives exist', () => {
  const previous = DEMO_SLOGANS[0];
  const slogan = pickNextDemoSlogan(previous, () => 0);
  assert.notEqual(slogan, previous);
  assert.ok(DEMO_SLOGANS.includes(slogan));
});
