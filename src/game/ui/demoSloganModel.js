export const DEMO_SLOGANS = [
  'STEEL. FIRE. TOTAL DOMINATION.',
  'LOCK. LOAD. ERASE THE HORIZON.',
  'CRUSH THE RIDGE. OWN THE BLAST.',
  'HOT BARRELS. COLD MERCY.',
  'TREADS GRIND. CANNONS DECIDE.'
];

export function pickNextDemoSlogan(previous = '', random = Math.random) {
  if (DEMO_SLOGANS.length === 0) {
    return '';
  }
  if (DEMO_SLOGANS.length === 1) {
    return DEMO_SLOGANS[0];
  }

  const alternatives = DEMO_SLOGANS.filter((slogan) => slogan !== previous);
  const index = Math.max(0, Math.min(alternatives.length - 1, Math.floor(random() * alternatives.length)));
  return alternatives[index];
}
