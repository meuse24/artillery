import Phaser from 'phaser';
import {
  colorToRgba,
  isSolidAt,
  pickTerrainPreset,
  rebuildSurfaceRangeFromPixels
} from './terrainModel.js';

export class Terrain {
  constructor(scene, width, height, key = 'terrain') {
    this.scene = scene;
    this.width = width;
    this.height = height;
    this.preset = 'standard';
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

  generate(preset) {
    // Pick a random preset if not specified
    this.preset = pickTerrainPreset(preset, Phaser.Math.Between(0, 3));

    // Terrain is stored on a canvas so rendering and crater carving stay in sync.
    const { width, height, ctx } = this;

    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.moveTo(0, height);

    this.buildSurface();

    ctx.lineTo(width, height);
    ctx.closePath();

    // Layered gradient: grass → dirt → clay → stone → bedrock
    // These bands are visible at crater edges when terrain is blown away.
    const fill = ctx.createLinearGradient(0, 0, 0, height);
    fill.addColorStop(0,    '#8fb868'); // grass top
    fill.addColorStop(0.06, '#7a6040'); // dirt just below surface
    fill.addColorStop(0.16, '#5c4530'); // dark loam
    fill.addColorStop(0.34, '#4a3828'); // clay
    fill.addColorStop(0.58, '#3a2e24'); // stone
    fill.addColorStop(1,    '#1e1814'); // bedrock

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

  buildSurface() {
    // Each preset fills this.surfaceY and calls ctx.lineTo for every x column.
    const { width, height, ctx } = this;

    if (this.preset === 'valley') {
      // Deep V-valley in the center; tanks start on high ridges
      const p1 = Phaser.Math.FloatBetween(0, Math.PI * 2);
      for (let x = 0; x < width; x += 1) {
        const t = x / width; // 0..1
        const ridge = Math.sin(t * Math.PI) * 180; // deepest at center
        const noise = Math.sin(x * 0.018 + p1) * 22 + Math.sin(x * 0.042 + p1 * 1.3) * 10;
        const y = Phaser.Math.Clamp(Math.round(height * 0.38 + ridge + noise), 200, height - 80);
        this.surfaceY[x] = y;
        ctx.lineTo(x, y);
      }
    } else if (this.preset === 'fortress') {
      // Wide flat platforms separated by steep drops
      const platformCount = Phaser.Math.Between(4, 6);
      const platformWidth = Math.floor(width / platformCount);
      for (let x = 0; x < width; x += 1) {
        const segment = Math.floor(x / platformWidth);
        const t = (x % platformWidth) / platformWidth; // 0..1 within segment
        const baseH = height * (0.38 + (segment % 2) * 0.18);
        // Sharp transition: cliff in the last 8% of each segment
        const blend = t > 0.92 ? (t - 0.92) / 0.08 : 0;
        const nextH = height * (0.38 + ((segment + 1) % 2) * 0.18);
        const noise = Math.sin(x * 0.06) * 8;
        const y = Phaser.Math.Clamp(Math.round(Phaser.Math.Linear(baseH, nextH, blend) + noise), 200, height - 80);
        this.surfaceY[x] = y;
        ctx.lineTo(x, y);
      }
    } else if (this.preset === 'chaos') {
      // Many small rapid hills — tough terrain
      const p1 = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const p2 = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const p3 = Phaser.Math.FloatBetween(0, Math.PI * 2);
      for (let x = 0; x < width; x += 1) {
        const rise =
          Math.sin(x * 0.028 + p1) * 56 +
          Math.sin(x * 0.058 + p2) * 28 +
          Math.sin(x * 0.11 + p3) * 16 +
          Math.sin(x * 0.21 + p1 * 0.7) * 10;
        const y = Phaser.Math.Clamp(Math.round(height * 0.56 + rise), 210, height - 80);
        this.surfaceY[x] = y;
        ctx.lineTo(x, y);
      }
    } else {
      // 'standard' — original hilly terrain
      const base = height * 0.63;
      const p1 = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const p2 = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const p3 = Phaser.Math.FloatBetween(0, Math.PI * 2);
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
    }
  }

  rebuildPixels() {
    this.pixels = this.ctx.getImageData(0, 0, this.width, this.height).data;
  }

  rebuildSurfaceRange(minX = 0, maxX = this.width - 1) {
    rebuildSurfaceRangeFromPixels(
      this.surfaceY,
      this.pixels,
      this.width,
      this.height,
      minX,
      maxX
    );
  }

  drawJaggedCraterPath(x, y, radius, options = {}) {
    const {
      segments = 30,
      jaggedness = 0.2,
      stretchX = 1,
      stretchY = 1,
      phaseA = Phaser.Math.FloatBetween(0, Math.PI * 2),
      phaseB = Phaser.Math.FloatBetween(0, Math.PI * 2)
    } = options;
    const total = Math.max(14, segments);

    this.ctx.beginPath();
    for (let i = 0; i <= total; i += 1) {
      const t = i / total;
      const angle = t * Math.PI * 2;
      const waveA = Math.sin(angle * 3 + phaseA) * jaggedness * 0.42;
      const waveB = Math.sin(angle * 5 + phaseB) * jaggedness * 0.26;
      const jitter = Phaser.Math.FloatBetween(-jaggedness, jaggedness) * 0.2;
      const scale = 1 + waveA + waveB + jitter;
      const px = x + Math.cos(angle) * radius * scale * stretchX;
      const py = y + Math.sin(angle) * radius * scale * stretchY;
      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
    }
    this.ctx.closePath();
  }

  deformCircle(x, y, radius, options = {}) {
    const {
      drawRim = true,
      profile = 'crater'
    } = options;

    const craterStretchX = profile === 'scoop' ? 1.22 : 1.0;
    const craterStretchY = profile === 'scoop' ? 0.68 : 0.9;

    // Explosion damage removes solid pixels from the terrain canvas (irregular crater body).
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'destination-out';
    this.drawJaggedCraterPath(x, y, radius, {
      segments: Math.round(radius * 0.9),
      jaggedness: profile === 'scoop' ? 0.11 : 0.2,
      stretchX: craterStretchX,
      stretchY: craterStretchY
    });
    this.ctx.fill();
    if (profile !== 'scoop') {
      // Secondary inner cavity creates a steeper bowl instead of a flat circular hole.
      this.drawJaggedCraterPath(
        x + Phaser.Math.FloatBetween(-radius * 0.08, radius * 0.08),
        y + radius * 0.16,
        radius * 0.56,
        {
          segments: Math.round(radius * 0.75),
          jaggedness: 0.23,
          stretchX: Phaser.Math.FloatBetween(0.88, 1.14),
          stretchY: Phaser.Math.FloatBetween(0.64, 0.82)
        }
      );
      this.ctx.fill();
      // Small side collapses break symmetry and feel closer to arcade blast craters.
      for (let i = 0; i < 2; i += 1) {
        const sideX = x + Phaser.Math.FloatBetween(-radius * 0.35, radius * 0.35);
        const sideY = y + Phaser.Math.FloatBetween(radius * 0.02, radius * 0.28);
        this.drawJaggedCraterPath(sideX, sideY, radius * Phaser.Math.FloatBetween(0.2, 0.3), {
          segments: 16,
          jaggedness: 0.24,
          stretchX: Phaser.Math.FloatBetween(0.9, 1.2),
          stretchY: Phaser.Math.FloatBetween(0.65, 0.95)
        });
        this.ctx.fill();
      }
    }
    this.ctx.restore();

    if (drawRim) {
      // Dirt-layer shading inside crater.
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'source-atop';
      const rimGrad = this.ctx.createRadialGradient(x, y + radius * 0.22, radius * 0.2, x, y, radius * 1.16);
      rimGrad.addColorStop(0, 'rgba(68, 49, 33, 0.44)');
      rimGrad.addColorStop(0.52, 'rgba(84, 59, 39, 0.24)');
      rimGrad.addColorStop(1, 'rgba(53, 38, 27, 0.0)');
      this.ctx.fillStyle = rimGrad;
      this.drawJaggedCraterPath(x, y, radius * 1.16, {
        segments: Math.round(radius * 0.95),
        jaggedness: 0.16,
        stretchY: 0.94
      });
      this.ctx.fill();
      this.ctx.restore();

      // Outer crater lip / scorch.
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(252, 199, 112, 0.2)';
      this.ctx.lineWidth = Math.max(1.4, radius * 0.04);
      this.drawJaggedCraterPath(x, y, radius * 1.05, {
        segments: Math.round(radius),
        jaggedness: 0.14,
        stretchY: 0.92
      });
      this.ctx.stroke();
      this.ctx.restore();
    }

    this.rebuildPixels();
    this.rebuildSurfaceRange(x - radius * 1.45 - 6, x + radius * 1.45 + 6);
    this.canvasTexture.refresh();
  }

  stampImpactDecal(x, y, radius, weapon) {
    const ring = colorToRgba(weapon.explosionRing, 0.22);
    const core = colorToRgba(weapon.explosionCore, 0.16);
    const soot = 'rgba(26, 18, 12, 0.34)';

    this.ctx.save();
    // Shade only existing terrain pixels.
    this.ctx.globalCompositeOperation = 'source-atop';

    const scorch = this.ctx.createRadialGradient(x, y + radius * 0.12, radius * 0.16, x, y, radius * 1.4);
    scorch.addColorStop(0, core);
    scorch.addColorStop(0.55, ring);
    scorch.addColorStop(1, 'rgba(25, 18, 12, 0.0)');
    this.ctx.fillStyle = scorch;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius * 1.42, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = soot;
    this.ctx.lineWidth = Math.max(1.2, radius * 0.05);
    for (let i = 0; i < 6; i += 1) {
      const start = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const span = Phaser.Math.FloatBetween(0.3, 0.75);
      const rr = radius * Phaser.Math.FloatBetween(0.8, 1.16);
      this.ctx.beginPath();
      this.ctx.arc(x + Phaser.Math.FloatBetween(-2, 2), y + Phaser.Math.FloatBetween(-2, 2), rr, start, start + span);
      this.ctx.stroke();
    }

    for (let i = 0; i < Math.round(radius * 0.45); i += 1) {
      const px = x + Phaser.Math.FloatBetween(-radius * 1.05, radius * 1.05);
      const py = y + Phaser.Math.FloatBetween(-radius * 0.7, radius * 0.95);
      this.ctx.fillStyle = Phaser.Math.RND.pick([
        colorToRgba(weapon.explosionRing, 0.14),
        'rgba(40, 27, 18, 0.2)',
        'rgba(235, 196, 128, 0.08)'
      ]);
      this.ctx.fillRect(px, py, Phaser.Math.Between(1, 3), Phaser.Math.Between(1, 3));
    }

    this.ctx.restore();
    this.canvasTexture.refresh();
  }

  isSolid(x, y) {
    return isSolidAt(this.pixels, this.width, this.height, x, y);
  }

  getSurfaceY(x) {
    const ix = Phaser.Math.Clamp(Math.round(x), 0, this.width - 1);
    return this.surfaceY[ix];
  }
}
