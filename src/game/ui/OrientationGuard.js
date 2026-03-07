export class OrientationGuard {
  constructor(scene) {
    this.scene = scene;
    this.bound = false;
    this.onOrientationChange = () => this.update();
  }

  bind() {
    if (this.bound) {
      return;
    }

    window.addEventListener('orientationchange', this.onOrientationChange);
    this.bound = true;
    this.update();
  }

  isPortraitViewport() {
    const viewport = window.visualViewport;
    const width = viewport?.width ?? window.innerWidth;
    const height = viewport?.height ?? window.innerHeight;
    return height > width;
  }

  update() {
    if (!this.scene.isTouchDevice || !this.scene.gameScene) {
      this.scene.orientationShade.setVisible(false);
      this.scene.orientationTitle.setVisible(false);
      this.scene.orientationBody.setVisible(false);
      return;
    }

    const portrait = this.isPortraitViewport();
    this.scene.orientationShade.setVisible(portrait);
    this.scene.orientationTitle.setVisible(portrait);
    this.scene.orientationBody.setVisible(portrait);

    if (portrait && !this.scene.pausedForOrientation) {
      this.scene.gameScene.scene.pause();
      this.scene.pausedForOrientation = true;
    } else if (!portrait && this.scene.pausedForOrientation) {
      this.scene.gameScene.scene.resume();
      this.scene.pausedForOrientation = false;
    }
  }

  destroy() {
    if (!this.bound) {
      return;
    }
    window.removeEventListener('orientationchange', this.onOrientationChange);
    this.bound = false;
  }
}
