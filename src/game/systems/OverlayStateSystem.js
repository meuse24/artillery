import { PLAYER_NAMES } from '../constants.js';
import { GAME_SCENE_EVENTS } from '../config/sceneContracts.js';

const DEFAULT_OBJECTIVE_TEXT = 'Reduce the enemy tank to 0 HP. Use wind and craters to create better shots.';

export class OverlayStateSystem {
  constructor(scene, { objectiveText = DEFAULT_OBJECTIVE_TEXT } = {}) {
    this.scene = scene;
    this.objectiveText = objectiveText;
  }

  overlayActive() {
    return Boolean(this.scene.overlayState);
  }

  showOverlay(payload) {
    this.scene.overlayState = payload;
    this.scene.events.emit(GAME_SCENE_EVENTS.OVERLAY_UPDATE, payload);
    this.scene.syncTitleMusicState?.(payload);
  }

  clearOverlay() {
    this.scene.overlayState = null;
    this.scene.events.emit(GAME_SCENE_EVENTS.OVERLAY_UPDATE, null);
    this.scene.syncTitleMusicState?.(null);
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

  presentTurnOverlay() {
    const player = this.scene.getActivePlayer();
    const mutatorLabel = this.scene.mutatorSystem?.getHudLabel();
    this.scene.showTurnBanner(`${player.name} move phase`);
    this.scene.audioManager.playTurn();
    this.showOverlay({
      type: 'turn',
      title: `PLAYER ${player.name.toUpperCase()} READY?`,
      body: [
        this.scene.isCpuControlledPlayer() ? 'CPU turn active' : 'Hand-off: next player',
        'Phase 1  Move',
        'Phase 2  Aim + Fire',
        mutatorLabel ? `Mutator  ${mutatorLabel}` : 'Mutator  none'
      ].join('\n'),
      scoreboard: this.buildScoreboardText(),
      prompt: this.scene.isCpuControlledPlayer()
        ? 'CPU thinking...'
        : 'PRESS BUTTON WHEN READY  |  (H) HELP'
    });
    this.scene.syncHud();

    if (this.scene.isCpuControlledPlayer()) {
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
      prompt: 'PRESS BUTTON or (R) NEW GAME  |  (M) SWITCH MODE  |  (H) HELP'
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
