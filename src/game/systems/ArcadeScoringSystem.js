import { ARCADE_EVENTS } from '../arcade/events.js';

const EMPTY_SKILLSHOTS = () => ({
  directHit: 0,
  bankShot: 0,
  longShot: 0,
  lastSecond: 0
});

const EMPTY_PLAYER_STATS = () => ({
  shots: 0,
  bounces: 0,
  hits: 0,
  damage: 0,
  directHits: 0,
  score: 0,
  multiplier: 1,
  bestMultiplier: 1,
  lastScoringTurn: null,
  comboTurnPrepared: null,
  skillshots: EMPTY_SKILLSHOTS()
});

export class ArcadeScoringSystem {
  constructor({ eventBus, config }) {
    this.eventBus = eventBus;
    this.config = config;
    this.round = {
      players: {},
      recentEvents: [],
      feed: []
    };
    this.shotMetaByTurn = new Map();
    this.bouncesByTurn = new Map();
    this.damageRegisteredByTurn = new Set();
    this.awardedSkillshotsByTurn = new Map();
    this.unsubscribers = [];

    if (!this.config.featureFlags.scoringSystem) {
      return;
    }

    this.installListeners();
  }

  installListeners() {
    this.unsubscribers.push(
      this.eventBus.on(ARCADE_EVENTS.SHOT_FIRED, ({ shooterName, turnNumber, weaponId, x, y, turnTimer }) => {
        this.ensurePlayer(shooterName);
        this.round.players[shooterName].shots += 1;
        this.shotMetaByTurn.set(this.turnKey(shooterName, turnNumber), {
          weaponId,
          x,
          y,
          turnTimer
        });
        this.pushEvent(`SHOT:${shooterName}:${weaponId}`);
      })
    );

    this.unsubscribers.push(
      this.eventBus.on(ARCADE_EVENTS.PROJECTILE_BOUNCED, ({ ownerName, turnNumber }) => {
        this.ensurePlayer(ownerName);
        this.round.players[ownerName].bounces += 1;
        const key = this.turnKey(ownerName, turnNumber);
        this.bouncesByTurn.set(key, (this.bouncesByTurn.get(key) ?? 0) + 1);
        this.pushEvent(`BOUNCE:${ownerName}`);
      })
    );

    this.unsubscribers.push(
      this.eventBus.on(ARCADE_EVENTS.DAMAGE_APPLIED, ({ turnNumber, ownerName, damage, distance }) => {
        if (!ownerName || damage <= 0) {
          return;
        }
        this.ensurePlayer(ownerName);
        const key = this.turnKey(ownerName, turnNumber);
        this.damageRegisteredByTurn.add(key);
        const player = this.round.players[ownerName];
        player.hits += 1;
        player.damage += damage;
        if (distance < this.config.skillshot.directHitDistance) {
          player.directHits += 1;
        }

        this.prepareMultiplierForTurn(player, ownerName, turnNumber);

        const points = Math.round(
          damage * this.config.scoring.baseDamagePointFactor * player.multiplier
        );
        this.addScore(ownerName, points, `Damage +${points}`);

        if (this.config.featureFlags.phase2Skillshots && distance < this.config.skillshot.directHitDistance) {
          this.awardSkillshot({
            playerName: ownerName,
            turnNumber,
            skillshotKey: 'directHit',
            label: 'DIRECT HIT',
            basePoints: this.config.scoring.directHitBonus
          });
        }

        const bounceCount = this.bouncesByTurn.get(key) ?? 0;
        if (this.config.featureFlags.phase2Skillshots && bounceCount > 0) {
          this.awardSkillshot({
            playerName: ownerName,
            turnNumber,
            skillshotKey: 'bankShot',
            label: 'BANK SHOT',
            basePoints: this.config.scoring.bankShotBonus
          });
        }

        const shotMeta = this.shotMetaByTurn.get(key);
        if (
          this.config.featureFlags.phase2Skillshots &&
          shotMeta &&
          shotMeta.turnTimer <= this.config.skillshot.lastSecondThreshold
        ) {
          this.awardSkillshot({
            playerName: ownerName,
            turnNumber,
            skillshotKey: 'lastSecond',
            label: 'LAST SECOND',
            basePoints: this.config.scoring.lastSecondBonus
          });
        }
      })
    );

    this.unsubscribers.push(
      this.eventBus.on(ARCADE_EVENTS.EXPLOSION_RESOLVED, ({ turnNumber, ownerName, impactDistanceFromShooter }) => {
        if (!this.config.featureFlags.phase2Skillshots || !ownerName) {
          return;
        }
        const key = this.turnKey(ownerName, turnNumber);
        if (!this.damageRegisteredByTurn.has(key)) {
          this.cleanupTurnState(ownerName, turnNumber);
          return;
        }

        if (impactDistanceFromShooter >= this.config.skillshot.longShotDistance) {
          this.awardSkillshot({
            playerName: ownerName,
            turnNumber,
            skillshotKey: 'longShot',
            label: 'LONG SHOT',
            basePoints: this.config.scoring.longShotBonus
          });
        }

        this.cleanupTurnState(ownerName, turnNumber);
      })
    );
  }

  turnKey(name, turnNumber) {
    return `${name}#${turnNumber}`;
  }

  ensurePlayer(name) {
    if (!name) {
      return;
    }
    if (!this.round.players[name]) {
      this.round.players[name] = EMPTY_PLAYER_STATS();
    }
  }

  prepareMultiplierForTurn(player, playerName, turnNumber) {
    if (!this.config.featureFlags.phase2ComboMultiplier) {
      player.multiplier = 1;
      return;
    }

    if (player.comboTurnPrepared === turnNumber) {
      return;
    }

    const canChain = player.lastScoringTurn !== null && turnNumber - player.lastScoringTurn <= 2;
    player.multiplier = canChain
      ? Math.min(this.config.scoring.comboMax, player.multiplier + this.config.scoring.comboStep)
      : 1;
    player.bestMultiplier = Math.max(player.bestMultiplier, player.multiplier);
    player.lastScoringTurn = turnNumber;
    player.comboTurnPrepared = turnNumber;
    if (player.multiplier > 1) {
      this.pushFeed(`${playerName} COMBO x${player.multiplier.toFixed(2)}`);
      this.eventBus.emit(ARCADE_EVENTS.COMBO_UPDATED, {
        playerName,
        multiplier: player.multiplier
      });
    }
  }

  awardSkillshot({ playerName, turnNumber, skillshotKey, label, basePoints }) {
    const player = this.round.players[playerName];
    if (!player) {
      return;
    }
    const turnKey = this.turnKey(playerName, turnNumber);
    const awarded = this.awardedSkillshotsByTurn.get(turnKey) ?? new Set();
    if (awarded.has(skillshotKey)) {
      return;
    }
    awarded.add(skillshotKey);
    this.awardedSkillshotsByTurn.set(turnKey, awarded);

    player.skillshots[skillshotKey] += 1;
    const score = Math.round(basePoints * player.multiplier);
    this.addScore(playerName, score, `${label} +${score}`);
    this.eventBus.emit(ARCADE_EVENTS.SKILLSHOT_AWARDED, {
      playerName,
      skillshot: skillshotKey,
      label,
      points: score,
      multiplier: player.multiplier
    });
  }

  addScore(playerName, points, feedLabel) {
    if (!playerName || points <= 0) {
      return;
    }
    this.ensurePlayer(playerName);
    this.round.players[playerName].score += points;
    this.pushFeed(`${playerName} ${feedLabel}`);
    this.eventBus.emit(ARCADE_EVENTS.SCORE_UPDATED, {
      playerName,
      points,
      score: this.round.players[playerName].score
    });
  }

  cleanupTurnState(playerName, turnNumber) {
    const key = this.turnKey(playerName, turnNumber);
    this.shotMetaByTurn.delete(key);
    this.bouncesByTurn.delete(key);
    this.damageRegisteredByTurn.delete(key);
    this.awardedSkillshotsByTurn.delete(key);
  }

  resetRound(playerNames = []) {
    this.round.players = Object.fromEntries(
      playerNames.map((name) => [name, EMPTY_PLAYER_STATS()])
    );
    this.round.recentEvents = [];
    this.round.feed = [];
    this.shotMetaByTurn.clear();
    this.bouncesByTurn.clear();
    this.damageRegisteredByTurn.clear();
    this.awardedSkillshotsByTurn.clear();
  }

  pushEvent(label) {
    this.round.recentEvents.push(label);
    if (this.round.recentEvents.length > this.config.limits.recentEvents) {
      this.round.recentEvents.shift();
    }
  }

  pushFeed(label) {
    this.round.feed.unshift(label);
    if (this.round.feed.length > this.config.limits.feedItems) {
      this.round.feed.pop();
    }
  }

  getSnapshot() {
    return {
      players: this.round.players,
      feed: this.round.feed
    };
  }

  destroy() {
    this.unsubscribers.forEach((off) => off());
    this.unsubscribers = [];
  }
}
