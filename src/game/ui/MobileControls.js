export class MobileControls {
  constructor(scene) {
    this.scene = scene;
    this.bound = false;
  }

  bind() {
    if (this.bound || !this.scene.isTouchDevice) {
      return;
    }

    this.onWeaponDown = (_pointer, _lx, _ly, event) => {
      event?.stopPropagation();
      const gameScene = this.scene.gameScene;
      if (!gameScene) return;
      if (gameScene.overlayState || gameScene.gameOver || gameScene.resolving || gameScene.isCpuControlledPlayer()) return;
      const player = gameScene.getActivePlayer();
      gameScene.cycleWeapon(player, 1);
      gameScene.markPredictionDirty();
      gameScene.syncHud();
    };
    this.onWeaponOver = () => this.scene.mobileWeaponButton.setBackgroundColor('rgba(26,48,63,0.95)');
    this.onWeaponOut = () => this.scene.mobileWeaponButton.setBackgroundColor('rgba(11,22,30,0.9)');

    this.onHelpDown = (_pointer, _lx, _ly, event) => {
      event?.stopPropagation();
      const gameScene = this.scene.gameScene;
      if (!gameScene) return;
      if (gameScene.overlayState?.type === 'help') {
        this.scene.handleOverlayClick();
        return;
      }
      gameScene.showHelpOverlay();
    };
    this.onHelpOver = () => this.scene.mobileHelpButton.setBackgroundColor('rgba(26,48,63,0.95)');
    this.onHelpOut = () => this.scene.mobileHelpButton.setBackgroundColor('rgba(11,22,30,0.9)');

    this.scene.mobileWeaponButton
      .on('pointerdown', this.onWeaponDown)
      .on('pointerover', this.onWeaponOver)
      .on('pointerout', this.onWeaponOut);

    this.scene.mobileHelpButton
      .on('pointerdown', this.onHelpDown)
      .on('pointerover', this.onHelpOver)
      .on('pointerout', this.onHelpOut);

    this.bound = true;
  }

  destroy() {
    if (!this.bound || !this.scene.isTouchDevice) {
      return;
    }

    this.scene.mobileWeaponButton
      .off('pointerdown', this.onWeaponDown)
      .off('pointerover', this.onWeaponOver)
      .off('pointerout', this.onWeaponOut);

    this.scene.mobileHelpButton
      .off('pointerdown', this.onHelpDown)
      .off('pointerover', this.onHelpOver)
      .off('pointerout', this.onHelpOut);

    this.bound = false;
  }
}
