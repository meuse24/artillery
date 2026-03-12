import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getNextStartAttractPhase,
  getStartAttractPhaseDuration
} from '../src/game/ui/startAttractModel.js';

test('start attract model alternates between start screen and demo peek', () => {
  assert.equal(getNextStartAttractPhase('start'), 'demo');
  assert.equal(getNextStartAttractPhase('demo'), 'start');
});

test('start attract model keeps start screen visible longer than demo peek', () => {
  assert.equal(getStartAttractPhaseDuration('start'), 5200);
  assert.equal(getStartAttractPhaseDuration('demo'), 20000);
});
