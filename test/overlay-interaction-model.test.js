import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldAdvanceTurnOverlayOnGlobalPointerDown } from '../src/game/ui/overlayInteractionModel.js';

test('overlay interaction model advances human turn overlays on empty global clicks', () => {
  assert.equal(
    shouldAdvanceTurnOverlayOnGlobalPointerDown({
      overlayType: 'turn',
      isCpuTurn: false,
      now: 400,
      blockedUntil: 200,
      currentlyOver: []
    }),
    true
  );
});

test('overlay interaction model ignores blocked, cpu, non-turn or interactive-target clicks', () => {
  assert.equal(
    shouldAdvanceTurnOverlayOnGlobalPointerDown({
      overlayType: 'help',
      isCpuTurn: false,
      now: 400,
      blockedUntil: 0,
      currentlyOver: []
    }),
    false
  );

  assert.equal(
    shouldAdvanceTurnOverlayOnGlobalPointerDown({
      overlayType: 'turn',
      isCpuTurn: true,
      now: 400,
      blockedUntil: 0,
      currentlyOver: []
    }),
    false
  );

  assert.equal(
    shouldAdvanceTurnOverlayOnGlobalPointerDown({
      overlayType: 'turn',
      isCpuTurn: false,
      now: 120,
      blockedUntil: 200,
      currentlyOver: []
    }),
    false
  );

  assert.equal(
    shouldAdvanceTurnOverlayOnGlobalPointerDown({
      overlayType: 'turn',
      isCpuTurn: false,
      now: 400,
      blockedUntil: 0,
      currentlyOver: [{ gameObject: { input: { enabled: true } } }]
    }),
    false
  );
});
