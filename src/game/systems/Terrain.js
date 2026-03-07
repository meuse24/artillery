import Phaser from 'phaser';

export class Terrain {
  constructor(scene, width, height, key = 'terrain') {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.surfaceY = new Array(width).fill(height - 1);

    if (scene.textures.exists(key)) {
      scene.textures.remove(key);
    }

    this.canvasTexture = scene.textures.createCanvas(key, width, height);
    this.canvas = this.canvasTexture.getSourceImage();
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.image = scene.add.image(0, 0, key).setOrigin(0, 0).setDepth(10);

    this.pixels = null;
    this.generate();
  }

  generate() {
    // Terrain is stored on a canvas so rendering and crater carving stay in sync.
    const { width, height, ctx } = this;
    const base = height * 0.63;
    const p1 = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const p2 = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const p3 = Phaser.Math.FloatBetween(0, Math.PI * 2);

    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.moveTo(0, height);

    for (let x = 0; x < width; x += 1) {
      const rise =
        Math.sin(x * 0.009 + p1) * 70 +
        Math.sin(x * 0.021 + p2) * 26 +
        Math.sin(x * 0.045 + p3) * 12;
      const valleyBias = Math.sin((x / width) * Math.PI * 2 - p2) * 18;
      const y = Phaser.Math.Clamp(Math.round(base + rise + valleyBias), 210, height - 90);
      this.surfaceY[x] = y;
      ctx.lineTo(x, y);
    }

    ctx.lineTo(width, height);
    ctx.closePath();

    const fill = ctx.createLinearGradient(0, 0, 0, height);
    fill.addColorStop(0, '#91aa6e');
    fill.addColorStop(0.14, '#778d59');
    fill.addColorStop(1, '#2b3827');

    ctx.fillStyle = fill;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, this.surfaceY[0]);
    for (let x = 1; x < width; x += 1) {
      ctx.lineTo(x, this.surfaceY[x]);
    }
    ctx.strokeStyle = '#d7e9aa';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, this.surfaceY[0] + 8);
    for (let x = 1; x < width; x += 1) {
      ctx.lineTo(x, this.surfaceY[x] + 6);
    }
    ctx.strokeStyle = 'rgba(58, 43, 29, 0.28)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(39, 26, 18, 0.28)';
    ctx.lineWidth = 1;
    for (let y = height * 0.76; y < height; y += 22) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    for (let i = 0; i < 160; i += 1) {
      const x = Phaser.Math.Between(0, width);
      const top = this.surfaceY[Phaser.Math.Clamp(x, 0, width - 1)];
      const y = Phaser.Math.Between(top + 10, height - 18);
      ctx.fillStyle = Phaser.Math.RND.pick([
        'rgba(216, 205, 160, 0.08)',
        'rgba(101, 120, 74, 0.1)',
        'rgba(61, 42, 29, 0.08)'
      ]);
      ctx.fillRect(x, y, Phaser.Math.Between(2, 5), Phaser.Math.Between(2, 5));
    }

    for (let i = 0; i < 32; i += 1) {
      const x = Phaser.Math.Between(0, width);
      const y = this.surfaceY[Phaser.Math.Clamp(x, 0, width - 1)] + Phaser.Math.Between(12, 48);
      ctx.fillStyle = 'rgba(214, 186, 118, 0.07)';
      ctx.beginPath();
      ctx.ellipse(x, y, Phaser.Math.Between(8, 18), Phaser.Math.Between(3, 8), 0, 0, Math.PI * 2);
      ctx.fill();
    }

    this.rebuildPixels();
    this.canvasTexture.refresh();
  }

  rebuildPixels() {
    this.pixels = this.ctx.getImageData(0, 0, this.width, this.height).data;
  }

  rebuildSurfaceRange(minX = 0, maxX = this.width - 1) {
    const start = Phaser.Math.Clamp(Math.floor(minX), 0, this.width - 1);
    const end = Phaser.Math.Clamp(Math.ceil(maxX), 0, this.width - 1);

    for (let x = start; x <= end; x += 1) {
      let found = this.height - 1;
      for (let y = 0; y < this.height; y += 1) {
        if (this.isSolid(x, y)) {
          found = y;
          break;
        }
      }
      this.surfaceY[x] = found;
    }
  }

  deformCircle(x, y, radius) {
    // Explosion damage removes solid pixels from the terrain canvas.
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(249, 192, 110, 0.18)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.restore();

    this.rebuildPixels();
    this.rebuildSurfaceRange(x - radius - 4, x + radius + 4);
    this.canvasTexture.refresh();
  }

  isSolid(x, y) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || ix >= this.width || iy < 0 || iy >= this.height) {
      return false;
    }

    return this.pixels[(iy * this.width + ix) * 4 + 3] > 12;
  }

  getSurfaceY(x) {
    const ix = Phaser.Math.Clamp(Math.round(x), 0, this.width - 1);
    return this.surfaceY[ix];
  }
}
