export class VisualFxPool {
  constructor(scene) {
    this.scene = scene;
    this.damageTexts = [];
    this.impactCallouts = [];
    this.debrisChips = [];
    this.impactShards = [];
  }

  acquireDamageText() {
    return this.activate(
      this.acquire(this.damageTexts, () => this.createText(70))
    );
  }

  acquireImpactCallout() {
    return this.activate(
      this.acquire(this.impactCallouts, () => this.createText(74))
    );
  }

  acquireDebrisChip() {
    return this.activate(
      this.acquire(this.debrisChips, () => this.createRectangle(57))
    );
  }

  acquireImpactShard() {
    return this.activate(
      this.acquire(this.impactShards, () => this.createRectangle(58))
    );
  }

  release(gameObject) {
    if (!gameObject) {
      return;
    }

    this.scene.tweens.killTweensOf(gameObject);
    gameObject.setActive(false);
    gameObject.setVisible(false);
    gameObject.setAlpha(1);
    gameObject.setScale(1);
    gameObject.setRotation(0);
    if (typeof gameObject.setText === 'function') {
      gameObject.setText('');
    }
  }

  destroy() {
    const pools = [this.damageTexts, this.impactCallouts, this.debrisChips, this.impactShards];
    pools.forEach((pool) => {
      pool.forEach((gameObject) => gameObject.destroy());
      pool.length = 0;
    });
  }

  acquire(pool, createFn) {
    const available = pool.find((item) => !item.active);
    if (available) {
      return available;
    }

    const created = createFn();
    pool.push(created);
    return created;
  }

  activate(gameObject) {
    gameObject.setActive(true);
    gameObject.setVisible(true);
    gameObject.setAlpha(1);
    gameObject.setScale(1);
    gameObject.setRotation(0);
    return gameObject;
  }

  createText(depth) {
    return this.scene.add
      .text(0, 0, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#f4f1df'
      })
      .setOrigin(0.5)
      .setDepth(depth)
      .setVisible(false)
      .setActive(false);
  }

  createRectangle(depth) {
    return this.scene.add
      .rectangle(0, 0, 4, 2, 0xffffff, 1)
      .setDepth(depth)
      .setVisible(false)
      .setActive(false);
  }
}
