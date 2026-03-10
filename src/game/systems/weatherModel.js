import { GAME_HEIGHT, GAME_WIDTH } from '../constants.js';

export const WEATHER_CONDITIONS = Object.freeze(['none', 'none', 'rain', 'fog', 'storm']);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function pickWeatherCondition(index) {
  return WEATHER_CONDITIONS[clamp(index, 0, WEATHER_CONDITIONS.length - 1)];
}

export function advanceRainDrops(
  rainDrops,
  dt,
  wind,
  {
    randomBetween,
    gameWidth = GAME_WIDTH,
    gameHeight = GAME_HEIGHT
  }
) {
  const windPush = wind * 0.12;

  rainDrops.forEach((drop) => {
    drop.x += (drop.drift + windPush) * dt;
    drop.y += drop.vel * dt;
    if (drop.y > gameHeight + 20) {
      drop.y = randomBetween(-60, -8);
      drop.x = randomBetween(0, gameWidth);
    }
    if (drop.x > gameWidth + 10) {
      drop.x = -10;
    }
    if (drop.x < -10) {
      drop.x = gameWidth + 10;
    }
  });
}

export function getWeatherGravityModifier(condition) {
  return condition === 'rain' ? 1.12 : 1;
}

export function applyStormWindRule(condition, currentWind, windLimit, randomFloatBetween) {
  if (condition !== 'storm') {
    return currentWind;
  }
  return randomFloatBetween(-windLimit, windLimit);
}

export function getWeatherLabel(condition) {
  const labels = { none: '', rain: 'Rain', fog: 'Fog', storm: 'Storm' };
  return labels[condition] ?? '';
}
