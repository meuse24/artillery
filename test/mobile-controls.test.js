import test from 'node:test';
import assert from 'node:assert/strict';

import { MobileControls } from '../src/game/ui/MobileControls.js';

function createButton() {
  return {
    handlers: new Map(),
    colors: [],
    on(name, handler) {
      this.handlers.set(name, handler);
      return this;
    },
    off(name, handler) {
      if (this.handlers.get(name) === handler) {
        this.handlers.delete(name);
      }
      return this;
    },
    setBackgroundColor(color) {
      this.colors.push(color);
      this.backgroundColor = color;
      return this;
    }
  };
}

test('MobileControls weapon button cycles weapons and syncs the HUD on touch devices', () => {
  const player = { name: 'Amber' };
  const mobileWeaponButton = createButton();
  const mobileHelpButton = createButton();
  const calls = [];
  const scene = {
    isTouchDevice: true,
    mobileWeaponButton,
    mobileHelpButton,
    handleOverlayClick() {
      calls.push('close-help');
    },
    gameScene: {
      overlayState: null,
      gameOver: false,
      resolving: false,
      isCpuControlledPlayer() {
        return false;
      },
      getActivePlayer() {
        return player;
      },
      cycleWeapon(currentPlayer, direction) {
        calls.push(['cycle', currentPlayer, direction]);
      },
      markPredictionDirty() {
        calls.push('prediction');
      },
      syncHud() {
        calls.push('hud');
      },
      showHelpOverlay() {
        calls.push('help');
      }
    }
  };

  const controls = new MobileControls(scene);
  controls.bind();

  mobileWeaponButton.handlers.get('pointerdown')(
    {},
    0,
    0,
    { stopPropagation: () => calls.push('stop-weapon') }
  );
  mobileHelpButton.handlers.get('pointerdown')(
    {},
    0,
    0,
    { stopPropagation: () => calls.push('stop-help') }
  );

  assert.deepEqual(calls, [
    'stop-weapon',
    ['cycle', player, 1],
    'prediction',
    'hud',
    'stop-help',
    'help'
  ]);

  mobileWeaponButton.handlers.get('pointerover')();
  mobileWeaponButton.handlers.get('pointerout')();
  assert.deepEqual(mobileWeaponButton.colors, ['rgba(26,48,63,0.95)', 'rgba(11,22,30,0.9)']);
});

test('MobileControls respects blocked game states and uses overlay click to close help', () => {
  const mobileWeaponButton = createButton();
  const mobileHelpButton = createButton();
  let closeCalls = 0;
  let weaponCalls = 0;

  const scene = {
    isTouchDevice: true,
    mobileWeaponButton,
    mobileHelpButton,
    handleOverlayClick() {
      closeCalls += 1;
    },
    gameScene: {
      overlayState: { type: 'help' },
      gameOver: false,
      resolving: false,
      isCpuControlledPlayer() {
        return false;
      },
      getActivePlayer() {
        return {};
      },
      cycleWeapon() {
        weaponCalls += 1;
      },
      markPredictionDirty() {},
      syncHud() {},
      showHelpOverlay() {
        throw new Error('help overlay should close via handleOverlayClick');
      }
    }
  };

  const controls = new MobileControls(scene);
  controls.bind();

  mobileWeaponButton.handlers.get('pointerdown')({}, 0, 0, { stopPropagation() {} });
  mobileHelpButton.handlers.get('pointerdown')({}, 0, 0, { stopPropagation() {} });

  assert.equal(weaponCalls, 0);
  assert.equal(closeCalls, 1);

  controls.destroy();
  assert.equal(mobileWeaponButton.handlers.size, 0);
  assert.equal(mobileHelpButton.handlers.size, 0);
});

test('MobileControls binds the weapon button on non-touch scenes but leaves touch help unbound', () => {
  const scene = {
    isTouchDevice: false,
    mobileWeaponButton: createButton(),
    mobileHelpButton: createButton(),
    gameScene: {
      overlayState: null,
      gameOver: false,
      resolving: false,
      isCpuControlledPlayer() {
        return false;
      },
      getActivePlayer() {
        return {};
      },
      cycleWeapon() {},
      markPredictionDirty() {},
      syncHud() {}
    }
  };

  const controls = new MobileControls(scene);
  controls.bind();

  assert.equal(scene.mobileWeaponButton.handlers.size, 3);
  assert.equal(scene.mobileHelpButton.handlers.size, 0);
});
