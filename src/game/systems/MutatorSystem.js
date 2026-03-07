import { ARCADE_EVENTS } from '../arcade/events.js';

export class MutatorSystem {
  constructor({ eventBus, config }) {
    this.eventBus = eventBus;
    this.config = config;
    this.activeMutator = null;
  }

  resetForMatch() {
    this.activeMutator = null;
  }

  onTurnStart(context) {
    const payload = {
      ...context,
      mutator: this.activeMutator
    };
    this.eventBus.emit(ARCADE_EVENTS.TURN_STARTED, payload);

    if (!this.config.featureFlags.mutatorSystem || !this.config.featureFlags.phase3TurnMutators) {
      return { windOverride: null };
    }

    return { windOverride: null };
  }

  getHudLabel() {
    return this.activeMutator?.label ?? '';
  }

  destroy() {
    this.activeMutator = null;
  }
}
