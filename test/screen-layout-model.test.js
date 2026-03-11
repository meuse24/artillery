import test from 'node:test';
import assert from 'node:assert/strict';

import {
  distributeVerticalSections,
  getBootScreenMetrics,
  getStartScreenMetrics
} from '../src/game/ui/screenLayoutModel.js';

test('distributeVerticalSections centers sections while using the available height', () => {
  const layout = distributeVerticalSections({
    top: 20,
    height: 300,
    sections: [
      { key: 'kicker', height: 30 },
      { key: 'title', height: 80 },
      { key: 'cta', height: 50 }
    ],
    minGap: 12,
    maxGap: 40
  });

  const topGap = layout.positions.kicker - 15 - 20;
  const bottomGap = 320 - (layout.positions.cta + 25);

  assert.equal(Math.round(layout.gap), 35);
  assert.ok(Math.abs(topGap - bottomGap) <= 1);
});

test('boot screen metrics boost typography on smaller viewports for readability', () => {
  const compact = getBootScreenMetrics({
    viewportWidth: 900,
    viewportHeight: 620
  });
  const roomy = getBootScreenMetrics({
    viewportWidth: 1600,
    viewportHeight: 980
  });

  assert.ok(compact.titleFontPx > roomy.titleFontPx);
  assert.ok(compact.introFontPx > roomy.introFontPx);
  assert.ok(compact.startButtonHeight > roomy.startButtonHeight);
  assert.ok(compact.topPad <= roomy.topPad);
});

test('start screen metrics enlarge layout primitives on smaller viewports for readability', () => {
  const compact = getStartScreenMetrics({
    viewportWidth: 880,
    viewportHeight: 640,
    compact: true
  });
  const roomy = getStartScreenMetrics({
    viewportWidth: 1600,
    viewportHeight: 980,
    compact: false
  });

  assert.ok(compact.panelHeight >= roomy.panelHeight);
  assert.ok(compact.titleFontPx > roomy.titleFontPx);
  assert.ok(compact.contentHeight > roomy.contentHeight);
  assert.ok(compact.scoreCardHeight >= roomy.scoreCardHeight);
});
