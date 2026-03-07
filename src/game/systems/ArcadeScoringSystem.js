import { ARCADE_EVENTS } from '../arcade/events.js';

const EMPTY_PLAYER_STATS = () => ({
  shots: 0,
  bounces: 0,
  hits: 0,
  damage: 0,
  directHits: 0
});

export class ArcadeScoringSystem {
  constructor({ eventBus, config }) {
    this.eventBus = eventBus;
    this.config = config;
    this.round = {
      players: {},
      recentEvents: []
    };
    this.unsubscribers = [];

    if (!this.config.featureFlags.scoringSystem) {
      return;
    }

    this.installListeners();
  }

  installListeners() {
    this.unsubscribers.push(
      this.eventBus.on(ARCADE_EVENTS.SHOT_FIRED, ({ shooterName }) => {
        this.ensurePlayer(shooterName);
        this.round.players[shooterName].shots += 1;
        this.pushEvent(`SHOT:${shooterName}`);
      })
    );

    this.unsubscribers.push(
      this.eventBus.on(ARCADE_EVENTS.PROJECTILE_BOUNCED, ({ ownerName }) => {
        this.ensurePlayer(ownerName);
        this.round.players[ownerName].bounces += 1;
        this.pushEvent(`BOUNCE:${ownerName}`);
      })
    );

    this.unsubscribers.push(
      this.eventBus.on(ARCADE_EVENTS.DAMAGE_APPLIED, ({ ownerName, damage, distance }) => {
        if (!ownerName || damage <= 0) {
          return;
        }
        this.ensurePlayer(ownerName);
        this.round.players[ownerName].hits += 1;
        this.round.players[ownerName].damage += damage;
        if (distance < 16) {
          this.round.players[ownerName].directHits += 1;
        }
        this.pushEvent(`HIT:${ownerName}:${damage}`);
      })
    );
  }

  ensurePlayer(name) {
    if (!name) {
      return;
    }
    if (!this.round.players[name]) {
      this.round.players[name] = EMPTY_PLAYER_STATS();
    }
  }

  resetRound(playerNames = []) {
    this.round.players = Object.fromEntries(
      playerNames.map((name) => [name, EMPTY_PLAYER_STATS()])
    );
    this.round.recentEvents = [];
  }

  pushEvent(label) {
    this.round.recentEvents.push(label);
    if (this.round.recentEvents.length > this.config.limits.recentEvents) {
      this.round.recentEvents.shift();
    }
  }

  getSnapshot() {
    return {
      players: this.round.players
    };
  }

  destroy() {
    this.unsubscribers.forEach((off) => off());
    this.unsubscribers = [];
  }
}
