import Phaser from 'phaser';
import { GAME_WIDTH, POWER_STEP } from '../constants.js';

export class InputController {
  constructor(scene) {
    this.scene = scene;
    this.bound = false;
  }

  bind() {
    if (this.bound) {
      return;
    }

    const scene = this.scene;
    scene.inputKeys = scene.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      j: Phaser.Input.Keyboard.KeyCodes.J,
      l: Phaser.Input.Keyboard.KeyCodes.L,
      q: Phaser.Input.Keyboard.KeyCodes.Q,
      e: Phaser.Input.Keyboard.KeyCodes.E,
      h: Phaser.Input.Keyboard.KeyCodes.H,
      m: Phaser.Input.Keyboard.KeyCodes.M,
      esc: Phaser.Input.Keyboard.KeyCodes.ESC,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      r: Phaser.Input.Keyboard.KeyCodes.R,
      v: Phaser.Input.Keyboard.KeyCodes.V
    });

    this.onPointerMove = (pointer) => {
      if (scene.overlayState || scene.gameOver || scene.resolving || scene.isCpuControlledPlayer()) return;
      if (scene.turnPhase !== 'aim') return;

      if (scene.touchAimState && scene.isTouchPointer(pointer) && pointer.id === scene.touchAimState.pointerId) {
        scene.mouseAim(pointer);
        const player = scene.getActivePlayer();
        const deltaY = scene.touchAimState.startY - pointer.worldY;
        player.setPower(scene.touchAimState.basePower + deltaY * 1.2);
        scene.touchAimState.moved =
          scene.touchAimState.moved ||
          Math.abs(pointer.worldX - scene.touchAimState.startX) > 6 ||
          Math.abs(deltaY) > 6;
        scene.markPredictionDirty();
        scene.syncHud();
        return;
      }

      scene.mouseAim(pointer);
    };

    this.onPointerDown = (pointer) => {
      const touchPointer = scene.isTouchPointer(pointer);
      if (touchPointer) {
        scene.ensureMobileFullscreen();
      }
      if (!touchPointer && !pointer.leftButtonDown()) return;
      if (scene.time.now < (scene.pointerInputBlockUntil ?? 0)) return;
      if (scene.overlayState || scene.gameOver || scene.resolving || scene.isCpuControlledPlayer()) return;
      if (scene.turnPhase === 'aim') {
        if (touchPointer) {
          const player = scene.getActivePlayer();
          scene.touchAimState = {
            pointerId: pointer.id,
            startX: pointer.worldX,
            startY: pointer.worldY,
            basePower: player.power,
            moved: false
          };
          scene.mouseAim(pointer);
          scene.syncHud();
          return;
        }
        scene.mouseAim(pointer);
        scene.fireActiveWeapon();
        scene.syncHud();
      } else if (scene.turnPhase === 'move') {
        const player = scene.getActivePlayer();
        const tapDistance = Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, player.x, player.y);
        if (tapDistance < 44) {
          scene.mouseMoveTarget = null;
          scene.enterAimPhase();
          return;
        }
        scene.mouseMoveTarget = Phaser.Math.Clamp(pointer.worldX, 48, GAME_WIDTH - 48);
      }
    };

    this.onPointerUp = (pointer) => {
      if (scene.time.now < (scene.pointerInputBlockUntil ?? 0)) {
        scene.touchAimState = null;
        return;
      }
      if (!scene.touchAimState) return;
      if (!scene.isTouchPointer(pointer)) return;
      if (pointer.id !== scene.touchAimState.pointerId) return;

      const canResolve =
        !scene.overlayState &&
        !scene.gameOver &&
        !scene.resolving &&
        !scene.isCpuControlledPlayer() &&
        scene.turnPhase === 'aim';
      if (canResolve) {
        scene.mouseAim(pointer);
        scene.fireActiveWeapon();
        scene.syncHud();
      }
      scene.touchAimState = null;
    };

    this.onWheel = (_ptr, _objs, _dx, deltaY) => {
      if (scene.overlayState || scene.gameOver || scene.resolving || scene.isCpuControlledPlayer()) return;
      if (scene.turnPhase !== 'aim') return;
      const player = scene.getActivePlayer();
      const dir = deltaY > 0 ? -1 : 1;
      player.setPower(player.power + dir * POWER_STEP * 0.22);
      scene.markPredictionDirty();
      scene.syncHud();
    };

    scene.input.on('pointermove', this.onPointerMove);
    scene.input.on('pointerdown', this.onPointerDown);
    scene.input.on('pointerup', this.onPointerUp);
    scene.input.on('wheel', this.onWheel);
    this.bound = true;
  }

  destroy() {
    if (!this.bound) {
      return;
    }

    const scene = this.scene;
    scene.input.off('pointermove', this.onPointerMove);
    scene.input.off('pointerdown', this.onPointerDown);
    scene.input.off('pointerup', this.onPointerUp);
    scene.input.off('wheel', this.onWheel);
    this.bound = false;
  }
}
