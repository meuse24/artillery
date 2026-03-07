const STORAGE_KEY = 'artillery-highscores-v1';

export class ScoreStore {
  constructor(playerNames) {
    this.playerNames = playerNames;
  }

  load() {
    const fallback = Object.fromEntries(this.playerNames.map((name) => [name, 0]));
    if (typeof window === 'undefined') {
      return fallback;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return fallback;
      }

      const parsed = JSON.parse(raw);
      return {
        ...fallback,
        ...parsed
      };
    } catch {
      return fallback;
    }
  }

  recordWin(name) {
    const next = this.load();
    next[name] = (next[name] ?? 0) + 1;

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }

    return next;
  }
}
