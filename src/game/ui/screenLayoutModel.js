import { GAME_HEIGHT, GAME_WIDTH } from '../constants.js';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value) {
  return Math.round(value);
}

function getViewportFitScale({ viewportWidth = GAME_WIDTH, viewportHeight = GAME_HEIGHT } = {}) {
  const width = Number.isFinite(viewportWidth) && viewportWidth > 0 ? viewportWidth : GAME_WIDTH;
  const height = Number.isFinite(viewportHeight) && viewportHeight > 0 ? viewportHeight : GAME_HEIGHT;
  return Math.min(width / GAME_WIDTH, height / GAME_HEIGHT);
}

function getFitComfort({ viewportWidth = GAME_WIDTH, viewportHeight = GAME_HEIGHT } = {}) {
  const fitScale = getViewportFitScale({ viewportWidth, viewportHeight });
  return clamp((fitScale - 0.72) / 0.38, 0, 1);
}

function getSmallViewportBoost({ viewportWidth = GAME_WIDTH, viewportHeight = GAME_HEIGHT } = {}) {
  const fitScale = getViewportFitScale({ viewportWidth, viewportHeight });
  return clamp((0.92 - Math.min(fitScale, 0.92)) / 0.42, 0, 1);
}

export function distributeVerticalSections({
  top = 0,
  height = GAME_HEIGHT,
  sections = [],
  minGap = 12,
  maxGap = Infinity
} = {}) {
  const visibleSections = sections.filter((section) => (section?.height ?? 0) > 0);
  if (visibleSections.length === 0) {
    return {
      gap: 0,
      slack: 0,
      positions: {}
    };
  }

  const totalHeight = visibleSections.reduce((sum, section) => sum + section.height, 0);
  const gapCount = visibleSections.length + 1;
  const rawGap = (height - totalHeight) / gapCount;
  const gap = clamp(rawGap, minGap, maxGap);
  const usedHeight = totalHeight + gap * gapCount;
  const slack = Math.max(0, height - usedHeight);
  let cursor = top + gap + round(slack * 0.5);
  const positions = {};

  visibleSections.forEach((section) => {
    positions[section.key] = cursor + section.height * 0.5;
    cursor += section.height + gap;
  });

  return {
    gap,
    slack,
    positions
  };
}

export function getBootScreenMetrics({
  viewportWidth = GAME_WIDTH,
  viewportHeight = GAME_HEIGHT,
  showOrientationHint = false
} = {}) {
  const fitComfort = getFitComfort({ viewportWidth, viewportHeight });
  const smallViewportBoost = getSmallViewportBoost({ viewportWidth, viewportHeight });
  const typeScale = 1.04 + smallViewportBoost * 0.34 + fitComfort * 0.06;
  const spacingScale = 0.96 + smallViewportBoost * 0.16 + fitComfort * 0.08;

  return {
    typeScale,
    kickerFontPx: round(18 * typeScale),
    titleFontPx: round(82 * typeScale),
    introFontPx: round(24 * typeScale),
    introLineSpacing: round(9 * typeScale),
    toggleFontPx: round(18 * typeScale),
    toggleHeight: round(38 + smallViewportBoost * 12),
    toggleWidth: round(252 + smallViewportBoost * 28),
    startFontPx: round(31 * typeScale),
    startButtonHeight: round(72 + smallViewportBoost * 16),
    startButtonWidth: round(500 + smallViewportBoost * 80),
    hintFontPx: round(20 * typeScale),
    hintLineSpacing: round(6 * typeScale),
    hotkeyFontPx: round(15 * typeScale),
    hotkeyGap: round(10 * spacingScale),
    topPad: round(22 - smallViewportBoost * 10 - fitComfort * 4),
    bottomPad: round(18 - smallViewportBoost * 8 - fitComfort * 2),
    minGap: round(10 * spacingScale),
    maxGap: round(54 * spacingScale),
    introWrapWidth: round(620 + smallViewportBoost * 120),
    hintWrapWidth: round(580 + smallViewportBoost * 120),
    showOrientationHint
  };
}

export function getStartScreenMetrics({
  viewportWidth = GAME_WIDTH,
  viewportHeight = GAME_HEIGHT,
  compact = false
} = {}) {
  const fitComfort = getFitComfort({ viewportWidth, viewportHeight });
  const smallViewportBoost = getSmallViewportBoost({ viewportWidth, viewportHeight });
  const typeScale = compact
    ? 1.02 + smallViewportBoost * 0.28 + fitComfort * 0.04
    : 1.02 + smallViewportBoost * 0.24 + fitComfort * 0.08;
  const panelInsetY = round(clamp((compact ? 20 : 18) - smallViewportBoost * 8 - fitComfort * 2, 6, compact ? 20 : 18));
  const panelHeight = clamp(GAME_HEIGHT - panelInsetY * 2, compact ? 676 : 664, 708);
  const modeHeight = clamp(round(50 * (1 + smallViewportBoost * 0.18 + fitComfort * 0.04)), 48, 62);
  const modeBackingWidth = clamp(round(344 * (1 + smallViewportBoost * 0.08 + fitComfort * 0.04)), 336, 384);
  const actionHeight = clamp(round(56 * (1 + smallViewportBoost * 0.16 + fitComfort * 0.06)), 54, 68);
  const contentHeight = clamp(round(panelHeight * (compact ? 0.34 : 0.31)), compact ? 206 : 188, 254);
  const scoreCardHeight = clamp(round(contentHeight * 0.31), 52, 68);
  const scoreCardGap = clamp(round(scoreCardHeight * 0.28), 10, 18);
  const headerStripHeight = clamp(round(contentHeight * 0.2), 30, 40);
  const cornerOffset = round(50 + fitComfort * 16);

  return {
    typeScale,
    panelHeight,
    panelY: GAME_HEIGHT * 0.5 + (compact ? 8 : 4),
    kickerFontPx: round(16 * typeScale),
    titleFontPx: round(82 * typeScale),
    taglineFontPx: round(24 * typeScale),
    bodyFontPx: round(19 * typeScale),
    bodyLineSpacing: round(8 * typeScale),
    promptFontPx: round(24 * typeScale),
    modeFontPx: round(17 * typeScale),
    labelFontPx: round(13 * typeScale),
    scoreFontPx: round(21 * typeScale),
    linkFontPx: round(15 * typeScale),
    modeHeight,
    modeButtonHeight: modeHeight - 10,
    modeBackingWidth,
    actionHeight,
    contentHeight,
    scoreCardHeight,
    scoreCardGap,
    headerStripHeight,
    minGap: round((compact ? 8 : 10) * (0.96 + smallViewportBoost * 0.12 + fitComfort * 0.08)),
    maxGap: round((compact ? 34 : 38) * (1 + smallViewportBoost * 0.12 + fitComfort * 0.06)),
    sectionTopPad: compact ? 10 : 12,
    sectionBottomPad: compact ? 12 : 14,
    boxRadius: 16,
    linkOffsetX: compact ? 124 : 138,
    decorLeftX: 238,
    decorLeftY: 116,
    decorLeftOuterRadius: round(84 + fitComfort * 10),
    decorLeftInnerRadius: round(54 + fitComfort * 8),
    decorRightX: 266,
    decorRightY: 72,
    decorRightOuterRadius: round(60 + fitComfort * 8),
    decorRightInnerRadius: round(33 + fitComfort * 6),
    cornerOffset
  };
}
