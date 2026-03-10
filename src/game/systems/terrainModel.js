export const TERRAIN_PRESETS = Object.freeze(['standard', 'valley', 'fortress', 'chaos']);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function pickTerrainPreset(preset, randomIndex) {
  if (preset) {
    return preset;
  }
  return TERRAIN_PRESETS[clamp(randomIndex, 0, TERRAIN_PRESETS.length - 1)];
}

export function colorToRgba(color, alpha) {
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function isSolidAt(pixels, width, height, x, y) {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 0 || ix >= width || iy < 0 || iy >= height) {
    return false;
  }

  return pixels[(iy * width + ix) * 4 + 3] > 12;
}

export function rebuildSurfaceRangeFromPixels(
  surfaceY,
  pixels,
  width,
  height,
  minX = 0,
  maxX = width - 1
) {
  const start = clamp(Math.floor(minX), 0, width - 1);
  const end = clamp(Math.ceil(maxX), 0, width - 1);

  for (let x = start; x <= end; x += 1) {
    let found = height - 1;
    for (let y = 0; y < height; y += 1) {
      if (isSolidAt(pixels, width, height, x, y)) {
        found = y;
        break;
      }
    }
    surfaceY[x] = found;
  }

  return surfaceY;
}
