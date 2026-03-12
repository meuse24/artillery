import { PLAYER_NAMES } from '../constants.js';
import { GAME_SCENE_EVENTS } from '../config/sceneContracts.js';

const DEFAULT_OBJECTIVE_TEXT = 'Reduce the enemy tank to 0 HP. Use wind and craters to create better shots.';

export class OverlayStateSystem {
  constructor(scene, { objectiveText = DEFAULT_OBJECTIVE_TEXT } = {}) {
    this.scene = scene;
    this.objectiveText = objectiveText;
    this.turnOverlayCountdownEvents = [];
  }

  overlayActive() {
    return Boolean(this.scene.overlayState && this.scene.overlayState.type !== 'demo');
  }

  showOverlay(payload) {
    if (payload?.type !== 'turn') {
      this.clearTurnOverlayCountdown();
    }
    this.scene.overlayState = payload;
    this.scene.events.emit(GAME_SCENE_EVENTS.OVERLAY_UPDATE, payload);
    this.scene.syncTitleMusicState?.(payload);
    if (
      payload?.type === 'turn' &&
      !this.scene.isCpuControlledPlayer() &&
      typeof payload.countdownSecondsRemaining === 'number'
    ) {
      this.startHumanTurnOverlayCountdown(payload.countdownSecondsRemaining);
    }
  }

  clearOverlay() {
    this.clearTurnOverlayCountdown();
    this.scene.overlayState = null;
    this.scene.events.emit(GAME_SCENE_EVENTS.OVERLAY_UPDATE, null);
    this.scene.syncTitleMusicState?.(null);
  }

  updateCurrentOverlay(patch) {
    if (!this.scene.overlayState) {
      return;
    }
    this.scene.overlayState = {
      ...this.scene.overlayState,
      ...patch
    };
    this.scene.events.emit(GAME_SCENE_EVENTS.OVERLAY_UPDATE, this.scene.overlayState);
    this.scene.syncTitleMusicState?.(this.scene.overlayState);
  }

  buildTurnPrompt({ isCpuTurn }) {
    if (isCpuTurn) {
      return 'CPU thinking...';
    }
    return 'TAP / CLICK ANYWHERE';
  }

  buildTurnCountdownLabel(secondsRemaining) {
    if (typeof secondsRemaining !== 'number' || secondsRemaining <= 0) {
      return '';
    }
    return `Auto continue in ${secondsRemaining}`;
  }

  clearTurnOverlayCountdown() {
    this.turnOverlayCountdownEvents.forEach((event) => event?.remove?.(false));
    this.turnOverlayCountdownEvents = [];
  }

  startHumanTurnOverlayCountdown(secondsRemaining = 3) {
    this.clearTurnOverlayCountdown();
    const normalizedSeconds = Math.max(1, Math.ceil(secondsRemaining));
    for (let second = normalizedSeconds - 1; second >= 1; second -= 1) {
      const delay = (normalizedSeconds - second) * 1000;
      const event = this.scene.time.delayedCall(delay, () => {
        if (this.scene.overlayState?.type !== 'turn' || this.scene.isCpuControlledPlayer()) {
          return;
        }
        this.updateCurrentOverlay({
          countdownSecondsRemaining: second,
          countdownLabel: this.buildTurnCountdownLabel(second),
          prompt: this.buildTurnPrompt({ isCpuTurn: false })
        });
      });
      this.turnOverlayCountdownEvents.push(event);
    }

    const autoAdvanceEvent = this.scene.time.delayedCall(normalizedSeconds * 1000, () => {
      if (this.scene.overlayState?.type !== 'turn' || this.scene.isCpuControlledPlayer()) {
        return;
      }
      this.scene.advanceTurnOverlay?.();
    });
    this.turnOverlayCountdownEvents.push(autoAdvanceEvent);
  }

  showStartOverlay() {
    this.showOverlay({
      type: 'start',
      title: 'CRATER COMMAND',
      body: [
        'Wind bends every shot.',
        'Crater the hill. Finish the tank.'
      ].join('\n'),
      scoreboard: PLAYER_NAMES.map((name) => `${name}: ${this.scene.highscores[name] ?? 0} wins`).join('\n'),
      scores: PLAYER_NAMES.map((name) => ({
        name,
        wins: this.scene.highscores[name] ?? 0
      })),
      kicker: 'ARCADE TANK DUEL',
      tagline: 'Read the wind. Break the hill. Every map is different.',
      modeLabel: this.scene.getModeLabel(),
      modeKey: this.scene.currentMode,
      prompt: 'PRESS BUTTON TO START GAME'
    });
  }

  showDemoOverlay({ slogan = '' } = {}) {
    this.showOverlay({
      type: 'demo',
      title: '',
      body: '',
      scoreboard: '',
      prompt: '',
      slogan
    });
  }

  presentTurnOverlay() {
    const player = this.scene.getActivePlayer();
    const isCpuTurn = this.scene.isCpuControlledPlayer();
    this.scene.showTurnBanner(`${player.name} move phase`);
    this.scene.audioManager.playTurn();
    const countdownSecondsRemaining = isCpuTurn
      ? null
      : Math.max(1, Math.ceil(this.scene.overlayState?.countdownSecondsRemaining ?? 3));
    this.showOverlay({
      type: 'turn',
      title: `PLAYER ${player.name.toUpperCase()} READY?`,
      body: '',
      scoreboard: this.buildScoreboardText(),
      countdownSecondsRemaining,
      countdownLabel: isCpuTurn ? '' : this.buildTurnCountdownLabel(countdownSecondsRemaining),
      prompt: this.buildTurnPrompt({ isCpuTurn })
    });
    this.scene.syncHud();

    if (isCpuTurn) {
      this.scene.time.delayedCall(900, () => {
        if (this.scene.overlayState?.type === 'turn' && this.scene.isCpuControlledPlayer()) {
          this.clearOverlay();
          this.scene.startCpuTurn();
          this.scene.syncHud();
        }
      });
    }
  }

  showGameOverOverlay() {
    const winnerLine = this.scene.winner
      ? `${this.scene.winner.name} wins the game.`
      : 'The game ends in a draw.';
    this.showOverlay({
      type: 'gameover',
      title: 'Game Over',
      body: [
        winnerLine,
        this.scene.getModeLabel(),
        '',
        'Objective',
        this.objectiveText,
        '',
        'Game Stats',
        this.scene.getRoundStatsText(),
        '',
        this.scene.telemetrySystem?.getSummaryText() ?? ''
      ].join('\n'),
      scoreboard: this.buildScoreboardText(),
      prompt: 'PRESS BUTTON FOR NEW GAME'
    });
  }

  buildScoreboardText() {
    return [
      'Highscore',
      ...PLAYER_NAMES.map((name) => `${name}: ${this.scene.highscores[name] ?? 0} wins`)
    ].join('\n');
  }

  buildHelpBody() {
    const currentYear = new Date().getFullYear();
    return [
      'MISSION',
      'Destroy the enemy tank before your own HP reaches 0.',
      '',
      'TURN LOOP',
      '1) MOVE: reposition with Left/Right or click/tap terrain',
      '2) AIM: set barrel angle + power, choose weapon',
      '3) FIRE: one shot resolves fully, then turn swaps',
      '',
      'DAMAGE MODEL',
      '- Center blast = highest damage',
      '- Edge blast = reduced damage',
      '- Terrain deformation changes future lines and cover',
      '',
      'ARCADE SYSTEMS',
      '- Combo + Skillshots grant score bonuses',
      '- Mutators can alter gravity/wind and late-round damage',
      '- Press (V) for reduced motion mode',
      '',
      'TECH STACK',
      'JavaScript (ES Modules)',
      'Phaser 3 (WebGL/Canvas)',
      'Vite build pipeline',
      'Web Audio API',
      '',
      'LIBRARIES',
      'phaser 3.90.0  - MIT',
      'vite 7.3.1     - MIT',
      'eslint 9.39.4  - MIT',
      'globals 16.5.0 - MIT',
      '',
      'CREDITS',
      `(C) ${currentYear} MEUSE24  -  MIT License`,
      'Thanks to Phaser, Vite, ESLint,',
      'Claude Code, Codex, Suno,',
      'and the developers of all open-source tooling.'
    ].join('\n');
  }

  buildHelpSidebar() {
    return [
      'WEAPONS',
      'Basic Shell  - balanced',
      'Heavy Mortar - slow, high blast',
      'Split Shot   - 3 bomblets',
      'Bouncer      - up to 3 rebounds',
      'Rail Slug    - fast precision shot',
      'Storm Shards - 5 bomblets',
      'Hopper Mine  - up to 5 rebounds',
      '',
      'FAST TIPS',
      'Read wind before every shot.',
      'Use craters to open direct-hit paths.',
      'Move only as much as needed.',
      '',
      'MODE',
      `${this.scene.getModeLabel()} active`,
      'Switch mode via (M) or the Switch Mode link on start/game-over.'
    ].join('\n');
  }

  buildHelpControlsRows() {
    return [
      { action: 'Move', input: '(←)/(→) or tap terrain' },
      { action: 'End move', input: '(Space) Fire' },
      { action: 'Aim angle', input: '(↑)/(↓) or mouse/drag' },
      { action: 'Power', input: '(←)/(→) or wheel/drag' },
      { action: 'Fire', input: '(Space) or click/release' },
      { action: 'Weapon', input: '(Q)/(E) or mobile Weapon (always)' },
      { action: 'Confirm', input: 'PRESS BUTTON' },
      { action: 'Help', input: '(H) / (Esc) / mobile Help' },
      { action: 'Reduced motion', input: '(V)' },
      { action: 'Restart', input: '(R)' }
    ];
  }

  showHelpOverlay() {
    this.showOverlay({
      type: 'help',
      previousOverlay: this.scene.overlayState ? { ...this.scene.overlayState } : null,
      title: 'Help',
      body: this.buildHelpBody(),
      scoreboard: this.buildHelpSidebar(),
      controlsRows: this.buildHelpControlsRows(),
      prompt: 'PRESS BUTTON, (Esc) or (H) to close help'
    });
  }
}
