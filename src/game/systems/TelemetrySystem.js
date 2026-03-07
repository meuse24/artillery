import { ARCADE_EVENTS } from '../arcade/events.js';

const STORAGE_KEY = 'crater-command-telemetry-v1';

const EMPTY_ROUND = () => ({
  startTurn: 1,
  shots: 0,
  hits: 0,
  directHits: 0,
  damage: 0
});

export class TelemetrySystem {
  constructor({ eventBus, historyLimit = 24 }) {
    this.eventBus = eventBus;
    this.historyLimit = historyLimit;
    this.currentRound = EMPTY_ROUND();
    this.history = this.loadHistory();
    this.unsubscribers = [];
    this.installListeners();
  }

  installListeners() {
    this.unsubscribers.push(
      this.eventBus.on(ARCADE_EVENTS.ROUND_STARTED, ({ turnNumber }) => {
        this.currentRound = EMPTY_ROUND();
        this.currentRound.startTurn = turnNumber ?? 1;
      })
    );

    this.unsubscribers.push(
      this.eventBus.on(ARCADE_EVENTS.SHOT_FIRED, () => {
        this.currentRound.shots += 1;
      })
    );

    this.unsubscribers.push(
      this.eventBus.on(ARCADE_EVENTS.DAMAGE_APPLIED, ({ damage, distance }) => {
        if (damage <= 0) {
          return;
        }
        this.currentRound.hits += 1;
        this.currentRound.damage += damage;
        if (distance < 16) {
          this.currentRound.directHits += 1;
        }
      })
    );

    this.unsubscribers.push(
      this.eventBus.on(ARCADE_EVENTS.ROUND_ENDED, ({ turnNumber }) => {
        const turns = Math.max(1, (turnNumber ?? 1) - this.currentRound.startTurn + 1);
        this.history.unshift({
          ...this.currentRound,
          turns
        });
        if (this.history.length > this.historyLimit) {
          this.history.length = this.historyLimit;
        }
        this.saveHistory();
      })
    );
  }

  loadHistory() {
    if (typeof window === 'undefined') {
      return [];
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  saveHistory() {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
  }

  getSummary() {
    if (!this.history.length) {
      return {
        rounds: 0,
        avgTurns: 0,
        hitRate: 0,
        directHitRate: 0,
        avgDamage: 0
      };
    }

    const totals = this.history.reduce(
      (acc, round) => {
        acc.turns += round.turns;
        acc.shots += round.shots;
        acc.hits += round.hits;
        acc.directHits += round.directHits;
        acc.damage += round.damage;
        return acc;
      },
      { turns: 0, shots: 0, hits: 0, directHits: 0, damage: 0 }
    );

    return {
      rounds: this.history.length,
      avgTurns: totals.turns / this.history.length,
      hitRate: totals.shots > 0 ? totals.hits / totals.shots : 0,
      directHitRate: totals.hits > 0 ? totals.directHits / totals.hits : 0,
      avgDamage: totals.damage / this.history.length
    };
  }

  getSummaryText() {
    const s = this.getSummary();
    if (!s.rounds) {
      return 'Telemetry: no rounds recorded yet.';
    }
    return [
      `Telemetry (${s.rounds} rounds)`,
      `Avg turns: ${s.avgTurns.toFixed(1)}`,
      `Hit rate: ${(s.hitRate * 100).toFixed(0)}%`,
      `Direct-hit share: ${(s.directHitRate * 100).toFixed(0)}%`,
      `Avg damage / round: ${s.avgDamage.toFixed(0)}`
    ].join('\n');
  }

  destroy() {
    this.unsubscribers.forEach((off) => off());
    this.unsubscribers = [];
  }
}
