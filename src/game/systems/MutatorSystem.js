import { ARCADE_EVENTS } from '../arcade/events.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class MutatorSystem {
  constructor({ eventBus, config }) {
    this.eventBus = eventBus;
    this.config = config;
    this.currentTurnMutator = null;
    this.suddenDeathActive = false;
  }

  resetForMatch() {
    this.currentTurnMutator = null;
    this.suddenDeathActive = false;
  }

  buildLowGravityMutator() {
    return {
      id: 'low-gravity',
      label: 'Low Gravity',
      gravityMultiplier: this.config.mutators.lowGravityMultiplier,
      damageMultiplier: 1,
      windOverride: null
    };
  }

  buildWindPulseMutator(baseWind) {
    const amplified = clamp(
      baseWind * this.config.mutators.windPulseMultiplier,
      -50,
      50
    );
    const fallback = (Math.random() * 2 - 1) * 50;
    const wind = Math.abs(amplified) < 4 ? fallback : amplified;
    return {
      id: 'wind-pulse',
      label: 'Wind Pulse',
      gravityMultiplier: 1,
      damageMultiplier: 1,
      windOverride: wind
    };
  }

  onTurnStart(context) {
    if (!this.config.featureFlags.mutatorSystem || !this.config.featureFlags.phase3TurnMutators) {
      this.eventBus.emit(ARCADE_EVENTS.TURN_STARTED, {
        ...context,
        mutator: null
      });
      return { windOverride: null };
    }

    const effects = {
      windOverride: null
    };

    if (context.turnNumber >= this.config.mutators.suddenDeathTurn) {
      this.suddenDeathActive = true;
    }

    this.currentTurnMutator = null;
    if (context.turnNumber % this.config.mutators.turnInterval === 0) {
      const pickLowGravity = Math.random() < 0.5;
      this.currentTurnMutator = pickLowGravity
        ? this.buildLowGravityMutator()
        : this.buildWindPulseMutator(context.wind);
      effects.windOverride = this.currentTurnMutator.windOverride;
    }

    this.eventBus.emit(ARCADE_EVENTS.TURN_STARTED, {
      ...context,
      mutator: this.getHudLabel()
    });

    return effects;
  }

  getGravityMultiplier() {
    return this.currentTurnMutator?.gravityMultiplier ?? 1;
  }

  getDamageMultiplier() {
    const turnDamage = this.currentTurnMutator?.damageMultiplier ?? 1;
    const suddenDeath = this.suddenDeathActive
      ? this.config.mutators.suddenDeathDamageMultiplier
      : 1;
    return turnDamage * suddenDeath;
  }

  getHudLabel() {
    const labels = [];
    if (this.currentTurnMutator?.label) {
      labels.push(this.currentTurnMutator.label);
    }
    if (this.suddenDeathActive) {
      labels.push(`Sudden Death x${this.config.mutators.suddenDeathDamageMultiplier.toFixed(2)}`);
    }
    return labels.join(' + ');
  }

  destroy() {
    this.currentTurnMutator = null;
  }
}
