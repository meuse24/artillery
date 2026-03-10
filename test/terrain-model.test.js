import test from 'node:test';
import assert from 'node:assert/strict';

import {
  colorToRgba,
  isSolidAt,
  pickTerrainPreset,
  rebuildSurfaceRangeFromPixels
} from '../src/game/systems/terrainModel.js';

test('terrain model picks explicit or random presets', () => {
  assert.equal(pickTerrainPreset('fortress', 0), 'fortress');
  assert.equal(pickTerrainPreset(null, 0), 'standard');
  assert.equal(pickTerrainPreset(undefined, 3), 'chaos');
});

test('terrain model converts colors to rgba strings', () => {
  assert.equal(colorToRgba(0x123456, 0.5), 'rgba(18, 52, 86, 0.5)');
});

test('terrain model detects solid pixels and ignores out-of-bounds points', () => {
  const pixels = new Uint8ClampedArray(2 * 2 * 4);
  pixels[(1 * 2 + 0) * 4 + 3] = 13;

  assert.equal(isSolidAt(pixels, 2, 2, 0, 1), true);
  assert.equal(isSolidAt(pixels, 2, 2, 1, 1), false);
  assert.equal(isSolidAt(pixels, 2, 2, -1, 1), false);
});

test('terrain model rebuilds the surface range from pixel alpha data', () => {
  const width = 3;
  const height = 4;
  const pixels = new Uint8ClampedArray(width * height * 4);
  const surfaceY = [0, 0, 0];

  pixels[(1 * width + 0) * 4 + 3] = 20;
  pixels[(2 * width + 1) * 4 + 3] = 20;

  rebuildSurfaceRangeFromPixels(surfaceY, pixels, width, height);

  assert.deepEqual(surfaceY, [1, 2, 3]);
});
