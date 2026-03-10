import test from 'node:test';
import assert from 'node:assert/strict';

import {
  advanceRainDrops,
  applyStormWindRule,
  getWeatherGravityModifier,
  getWeatherLabel,
  pickWeatherCondition
} from '../src/game/systems/weatherModel.js';

test('weather model picks weighted conditions by index', () => {
  assert.equal(pickWeatherCondition(0), 'none');
  assert.equal(pickWeatherCondition(2), 'rain');
  assert.equal(pickWeatherCondition(4), 'storm');
});

test('weather model advances and wraps rain drops', () => {
  const drops = [
    { x: 40, y: 760, vel: 100, drift: 0 },
    { x: 1295, y: 10, vel: 0, drift: 0 },
    { x: -12, y: 10, vel: 0, drift: 0 }
  ];
  const sequence = [-20, 300];
  let index = 0;

  advanceRainDrops(drops, 1, 0, {
    randomBetween: () => sequence[index++],
    gameWidth: 1280,
    gameHeight: 720
  });

  assert.deepEqual(drops, [
    { x: 300, y: -20, vel: 100, drift: 0 },
    { x: -10, y: 10, vel: 0, drift: 0 },
    { x: 1290, y: 10, vel: 0, drift: 0 }
  ]);
});

test('weather model applies gravity, labels and storm wind rules', () => {
  assert.equal(getWeatherGravityModifier('rain'), 1.12);
  assert.equal(getWeatherGravityModifier('fog'), 1);
  assert.equal(getWeatherLabel('fog'), 'Fog');
  assert.equal(getWeatherLabel('none'), '');
  assert.equal(applyStormWindRule('none', 12, 50, () => 33), 12);
  assert.equal(applyStormWindRule('storm', 12, 50, () => 33), 33);
});
