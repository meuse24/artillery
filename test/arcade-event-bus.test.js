import test from 'node:test';
import assert from 'node:assert/strict';

import { ArcadeEventBus } from '../src/game/systems/ArcadeEventBus.js';

test('ArcadeEventBus emits to subscribed handlers and supports unsubscribe', () => {
  const bus = new ArcadeEventBus();
  const seen = [];

  const offFirst = bus.on('turn', (payload) => seen.push(['first', payload]));
  bus.on('turn', (payload) => seen.push(['second', payload]));

  bus.emit('turn', { value: 1 });
  offFirst();
  bus.emit('turn', { value: 2 });

  assert.deepEqual(seen, [
    ['first', { value: 1 }],
    ['second', { value: 1 }],
    ['second', { value: 2 }]
  ]);
});

test('ArcadeEventBus.destroy clears all handlers', () => {
  const bus = new ArcadeEventBus();
  let calls = 0;

  bus.on('score', () => {
    calls += 1;
  });

  bus.destroy();
  bus.emit('score', {});

  assert.equal(calls, 0);
});
