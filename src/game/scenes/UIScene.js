import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PLAYER_COLORS } from '../constants.js';

export class UIScene extends Phaser.Scene {
  constructor() {
    super('ui');
  }

  create() {
    this.lastHudKey = null;
    this.displayHp = [100, 100];
    this.hpTargets = [100, 100];
    this.compactLayout = false;
    this.hudLayout = null;
    this.isTouchDevice = Boolean(this.sys.game.device.input.touch);
    this.pausedForOrientation = false;
    this.helpScrollY = 0;
    this.helpMaxScroll = 0;
    this.helpBodyBaseY = 0;

    // ── HUD layer ──────────────────────────────────────────────────────────────
    this.panel = this.add.graphics().setDepth(100);
    this.hpBars = this.add.graphics().setDepth(101);
    this.bannerBacking = this.add
      .rectangle(GAME_WIDTH * 0.5, 108, 320, 56, 0x09131b, 0.82)
      .setDepth(101);
    this.bannerBacking.setStrokeStyle(2, 0xffffff, 0.12);
    this.bannerText = this.add
      .text(GAME_WIDTH * 0.5, 108, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '26px',
        fontStyle: 'bold',
        color: '#f4f1df'
      })
      .setOrigin(0.5)
      .setDepth(102)
      .setAlpha(0);

    this.leftText = this.add
      .text(28, 24, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '18px',
        color: '#f4f1df',
        lineSpacing: 4
      })
      .setDepth(102);

    this.rightText = this.add
      .text(GAME_WIDTH - 28, 24, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '18px',
        color: '#f4f1df',
        align: 'right',
        lineSpacing: 4
      })
      .setOrigin(1, 0)
      .setDepth(102);

    this.centerText = this.add
      .text(GAME_WIDTH * 0.5, 28, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '16px',
        color: '#d7e9aa',
        align: 'center',
        lineSpacing: 2
      })
      .setOrigin(0.5, 0)
      .setDepth(102);

    this.windText = this.add
      .text(GAME_WIDTH * 0.5, 52, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '15px',
        color: '#f4f1df',
        align: 'center',
        lineSpacing: 2
      })
      .setOrigin(0.5, 0)
      .setDepth(102);

    this.timerBar = this.add.graphics().setDepth(103);
    this.timerText = this.add
      .text(GAME_WIDTH * 0.5, 74, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '13px',
        color: '#f4f1df',
        align: 'center'
      })
      .setOrigin(0.5, 0)
      .setDepth(103);

    this.objectiveText = this.add
      .text(GAME_WIDTH * 0.5, 118, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '14px',
        color: '#d7e9aa',
        align: 'center',
        backgroundColor: 'rgba(9,19,27,0.72)',
        padding: { x: 12, y: 5 }
      })
      .setOrigin(0.5, 0)
      .setDepth(102);

    this.controlsText = this.add
      .text(
        GAME_WIDTH * 0.5,
        GAME_HEIGHT - 28,
        '',
        {
          fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
          fontSize: '16px',
          color: '#f4f1df',
          backgroundColor: 'rgba(9,19,27,0.72)',
          padding: { x: 12, y: 8 }
        }
      )
      .setOrigin(0.5, 1)
      .setDepth(102);

    this.mobileWeaponButton = this.add
      .text(0, 0, 'Weapon ▶', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#f4f1df',
        backgroundColor: 'rgba(11,22,30,0.9)',
        padding: { x: 10, y: 6 }
      })
      .setOrigin(1, 1)
      .setDepth(110)
      .setVisible(this.isTouchDevice)
      .setInteractive({ useHandCursor: true });
    this.mobileHelpButton = this.add
      .text(0, 0, 'Help ?', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#f4f1df',
        backgroundColor: 'rgba(11,22,30,0.9)',
        padding: { x: 10, y: 6 }
      })
      .setOrigin(1, 1)
      .setDepth(110)
      .setVisible(this.isTouchDevice)
      .setInteractive({ useHandCursor: true });

    // Mobile orientation guard (portrait -> rotate prompt + pause gameplay scene)
    this.orientationShade = this.add
      .rectangle(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5, GAME_WIDTH, GAME_HEIGHT, 0x04070a, 0.88)
      .setDepth(300)
      .setVisible(false);
    this.orientationShade.setInteractive({ useHandCursor: false });
    this.orientationTitle = this.add
      .text(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5 - 18, 'Bitte ins Querformat drehen', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '34px',
        fontStyle: 'bold',
        color: '#f4f1df',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(301)
      .setVisible(false);
    this.orientationBody = this.add
      .text(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5 + 30, 'Für Touch-Steuerung und Lesbarkeit wird Landscape benötigt.', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '20px',
        color: '#d7e9aa',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(301)
      .setVisible(false);

    // ── Overlay base elements ──────────────────────────────────────────────────
    this.overlayShade = this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x04070a, 0.72)
      .setOrigin(0, 0)
      .setDepth(120)
      .setVisible(false);
    this.overlayPanel = this.add
      .rectangle(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5, 860, 520, 0x09131b, 0.96)
      .setStrokeStyle(2, 0xffffff, 0.14)
      .setDepth(121)
      .setVisible(false);

    // Scrollable help content (depth 122) — clip rects cover overflow at 123
    this.overlayBody = this.add
      .text(GAME_WIDTH * 0.5 - 360, GAME_HEIGHT * 0.5 - 128, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '17px',
        color: '#f4f1df',
        lineSpacing: 7,
        wordWrap: { width: 420 }
      })
      .setDepth(122)
      .setVisible(false);
    this.overlayScoreboard = this.add
      .text(GAME_WIDTH * 0.5 + 110, GAME_HEIGHT * 0.5 - 128, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '17px',
        color: '#7fe7dc',
        lineSpacing: 7,
        wordWrap: { width: 270 }
      })
      .setDepth(122)
      .setVisible(false);

    // Real clipping mask for help text area (prevents overflow on all sides).
    this.helpMaskGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    this.helpTextMask = this.helpMaskGraphics.createGeometryMask();
    // Legacy cover graphics (kept for compatibility, currently unused for clipping)
    this.helpClip = this.add.graphics().setDepth(123);
    // Scrollbar drawn above clip (depth 125)
    this.helpScrollbar = this.add.graphics().setDepth(125).setVisible(false);

    // Title and prompt always render above everything overlay-related
    this.overlayTitle = this.add
      .text(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5 - 196, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '40px',
        fontStyle: 'bold',
        color: '#f4f1df',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(124)
      .setVisible(false);
    this.overlayPrompt = this.add
      .text(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5 + 204, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '20px',
        color: '#f2b84b',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(124)
      .setVisible(false);

    // ── Start overlay decorative / specific elements ───────────────────────────
    this.startDeco = this.add.graphics().setDepth(121).setVisible(false);
    this.startKicker = this.add
      .text(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5 - 222, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#7fe7dc',
        letterSpacing: 3,
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(122)
      .setVisible(false);
    this.startTagline = this.add
      .text(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5 - 104, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '24px',
        color: '#f4f1df',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(122)
      .setVisible(false);
    this.startModeBacking = this.add
      .rectangle(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5 - 56, 330, 46, 0x0d1d27, 0.98)
      .setStrokeStyle(2, 0xffffff, 0.08)
      .setDepth(122)
      .setVisible(false);
    this.startModeCpuButton = this.add
      .rectangle(GAME_WIDTH * 0.5 - 82, GAME_HEIGHT * 0.5 - 56, 154, 34, 0x133645, 0.98)
      .setStrokeStyle(2, 0x7fe7dc, 0.2)
      .setDepth(123)
      .setVisible(false);
    this.startModeLocalButton = this.add
      .rectangle(GAME_WIDTH * 0.5 + 82, GAME_HEIGHT * 0.5 - 56, 154, 34, 0x1d2430, 0.98)
      .setStrokeStyle(2, 0xf2b84b, 0.12)
      .setDepth(123)
      .setVisible(false);
    this.startModeCpuText = this.add
      .text(GAME_WIDTH * 0.5 - 82, GAME_HEIGHT * 0.5 - 56, 'Solo vs CPU', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#e8fbf8',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(124)
      .setVisible(false);
    this.startModeLocalText = this.add
      .text(GAME_WIDTH * 0.5 + 82, GAME_HEIGHT * 0.5 - 56, 'Local Duel', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#f0e8d2',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(124)
      .setVisible(false);
    this.startBodyLabel = this.add
      .text(0, 0, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#7fe7dc',
        letterSpacing: 2
      })
      .setDepth(123)
      .setVisible(false);
    this.startScoreLabel = this.add
      .text(0, 0, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#f2b84b',
        letterSpacing: 2
      })
      .setDepth(123)
      .setVisible(false);
    // Widened score cards (282px) to fill the larger score box
    this.startScoreAmberCard = this.add
      .rectangle(0, 0, 282, 46, PLAYER_COLORS[0], 0.12)
      .setStrokeStyle(2, PLAYER_COLORS[0], 0.28)
      .setDepth(123)
      .setVisible(false);
    this.startScoreCyanCard = this.add
      .rectangle(0, 0, 282, 46, PLAYER_COLORS[1], 0.12)
      .setStrokeStyle(2, PLAYER_COLORS[1], 0.28)
      .setDepth(123)
      .setVisible(false);
    this.startScoreAmber = this.add
      .text(0, 0, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffd995',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(124)
      .setVisible(false);
    this.startScoreCyan = this.add
      .text(0, 0, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#9bf7ef',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(124)
      .setVisible(false);
    this.startActionBacking = this.add
      .rectangle(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5 + 194, 620, 50, 0xf2b84b, 0.16)
      .setStrokeStyle(2, 0xf2b84b, 0.42)
      .setDepth(122)
      .setVisible(false);
    // "How to Play" and "Switch Mode" as interactive text links below action bar
    this.startHowToPlayText = this.add
      .text(0, 0, '?  HOW TO PLAY', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#7fe7dc'
      })
      .setOrigin(0.5)
      .setDepth(123)
      .setVisible(false);
    this.startSwitchModeText = this.add
      .text(0, 0, 'M  SWITCH MODE', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#f2b84b'
      })
      .setOrigin(0.5)
      .setDepth(123)
      .setVisible(false);

    // ── Animation groups ───────────────────────────────────────────────────────
    this.overlayContent = [
      this.overlayPanel,
      this.overlayTitle,
      this.overlayBody,
      this.overlayScoreboard,
      this.overlayPrompt
    ];
    this.startOverlayContent = [
      this.startKicker,
      this.startTagline,
      this.startModeBacking,
      this.startModeCpuButton,
      this.startModeLocalButton,
      this.startModeCpuText,
      this.startModeLocalText,
      this.startActionBacking,
      this.startBodyLabel,
      this.startScoreLabel,
      this.startScoreAmberCard,
      this.startScoreCyanCard,
      this.startScoreAmber,
      this.startScoreCyan,
      this.startHowToPlayText,
      this.startSwitchModeText
    ];

    // ── Wire up interactions ───────────────────────────────────────────────────
    this.gameScene = this.scene.get('game');

    // Mode selector buttons
    [this.startModeCpuButton, this.startModeCpuText].forEach((item) => {
      item.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.setStartMode('cpu'))
        .on('pointerover', () => this.startModeCpuButton.setStrokeStyle(2, 0x7fe7dc, 0.6))
        .on('pointerout', () => {
          const active = this.gameScene.currentMode === 'cpu';
          this.startModeCpuButton.setStrokeStyle(2, 0x7fe7dc, active ? 0.46 : 0.16);
        });
    });
    [this.startModeLocalButton, this.startModeLocalText].forEach((item) => {
      item.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.setStartMode('local'))
        .on('pointerover', () => this.startModeLocalButton.setStrokeStyle(2, 0xf2b84b, 0.6))
        .on('pointerout', () => {
          const active = this.gameScene.currentMode === 'local';
          this.startModeLocalButton.setStrokeStyle(2, 0xf2b84b, active ? 0.46 : 0.16);
        });
    });

    const overlayActionHoverIn = () => {
      const type = this.gameScene.overlayState?.type;
      if (type === 'start') {
        this.startActionBacking.setFillStyle(0xf2b84b, 0.28);
        this.overlayPrompt.setColor('#fff2c8');
      } else if (type) {
        this.overlayPrompt.setColor('#ffd57d');
      }
    };

    const overlayActionHoverOut = () => {
      const type = this.gameScene.overlayState?.type;
      this.startActionBacking.setFillStyle(0xf2b84b, 0.16);
      if (type === 'start') {
        this.overlayPrompt.setColor('#f4f1df');
      } else if (type) {
        this.overlayPrompt.setColor('#f2b84b');
      }
    };

    // Main action button (click to advance any overlay)
    [this.startActionBacking, this.overlayPrompt].forEach((item) => {
      item.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.handleOverlayClick())
        .on('pointerover', overlayActionHoverIn)
        .on('pointerout', overlayActionHoverOut);
    });

    // Clicking the overlay surface also advances / closes according to state.
    [this.overlayShade, this.overlayPanel].forEach((item) => {
      item.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.handleOverlayClick());
    });

    // How to Play link
    this.startHowToPlayText.setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        const t = this.gameScene.overlayState?.type;
        if (t === 'start' || t === 'gameover') this.gameScene.showHelpOverlay();
      })
      .on('pointerover', () => this.startHowToPlayText.setColor('#a0ffef'))
      .on('pointerout', () => this.startHowToPlayText.setColor('#7fe7dc'));

    // Switch Mode link
    this.startSwitchModeText.setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        const t = this.gameScene.overlayState?.type;
        if (t === 'start') {
          this.gameScene.toggleMode();
          this.gameScene.showStartOverlay();
          this.gameScene.syncHud();
        } else if (t === 'gameover') {
          this.gameScene.toggleMode();
          this.gameScene.showGameOverOverlay();
          this.gameScene.syncHud();
        }
      })
      .on('pointerover', () => this.startSwitchModeText.setColor('#ffd050'))
      .on('pointerout', () => this.startSwitchModeText.setColor('#f2b84b'));

    if (this.isTouchDevice) {
      this.mobileWeaponButton
        .on('pointerdown', () => {
          if (this.gameScene.overlayState || this.gameScene.gameOver || this.gameScene.resolving || this.gameScene.isCpuControlledPlayer()) return;
          if (this.gameScene.turnPhase !== 'aim') return;
          const player = this.gameScene.getActivePlayer();
          this.gameScene.cycleWeapon(player, 1);
          this.gameScene.markPredictionDirty();
          this.gameScene.syncHud();
        })
        .on('pointerover', () => this.mobileWeaponButton.setBackgroundColor('rgba(26,48,63,0.95)'))
        .on('pointerout', () => this.mobileWeaponButton.setBackgroundColor('rgba(11,22,30,0.9)'));

      this.mobileHelpButton
        .on('pointerdown', () => {
          if (this.gameScene.overlayState?.type === 'help') {
            this.handleOverlayClick();
            return;
          }
          this.gameScene.showHelpOverlay();
        })
        .on('pointerover', () => this.mobileHelpButton.setBackgroundColor('rgba(26,48,63,0.95)'))
        .on('pointerout', () => this.mobileHelpButton.setBackgroundColor('rgba(11,22,30,0.9)'));
    }

    // Mouse wheel — help overlay scroll
    this.input.on('wheel', (_ptr, _objs, _dx, deltaY) => {
      if (this.gameScene.overlayState?.type === 'help') {
        this.scrollHelp(deltaY * 0.55);
      }
    });

    // ── Subscribe to game events ───────────────────────────────────────────────
    this.gameScene.events.on('hud:update', this.updateHud, this);
    this.gameScene.events.on('turn:banner', this.showBanner, this);
    this.gameScene.events.on('overlay:update', this.updateOverlay, this);
    this.gameScene.events.on('timer:update', this.updateTimer, this);

    if (typeof this.gameScene.getHudState === 'function') {
      this.updateHud(this.gameScene.getHudState());
    }
    if (this.gameScene.overlayState) {
      this.updateOverlay(this.gameScene.overlayState);
    }

    this.drawFrame();
    this.applyResponsiveLayout();
    this.scale.on('resize', this.applyResponsiveLayout, this);
    window.addEventListener('orientationchange', () => this.updateOrientationGuard());
    this.updateOrientationGuard();
  }

  // ── Overlay click router ─────────────────────────────────────────────────────
  handleOverlayClick() {
    const state = this.gameScene.overlayState;
    if (!state) return;
    if (state.type === 'start') {
      this.startFromOverlay();
    } else if (state.type === 'turn') {
      if (!this.gameScene.isCpuControlledPlayer()) {
        this.gameScene.clearOverlay();
        this.gameScene.syncHud();
      }
    } else if (state.type === 'gameover') {
      this.gameScene.startMatch();
    } else if (state.type === 'help') {
      const prev = state.previousOverlay;
      if (prev) {
        this.gameScene.showOverlay(prev);
      } else {
        this.gameScene.clearOverlay();
        this.gameScene.syncHud();
      }
    }
  }

  // ── Help scroll ───────────────────────────────────────────────────────────────
  getHelpViewport() {
    return {
      top: GAME_HEIGHT * 0.5 - 128,
      height: 304
    };
  }

  scrollHelp(deltaY) {
    const viewport = this.getHelpViewport();
    const textH = Math.max(this.overlayBody.height, this.overlayScoreboard.height);
    this.helpMaxScroll = Math.max(0, textH - viewport.height);
    this.helpScrollY = Phaser.Math.Clamp(this.helpScrollY + deltaY, 0, this.helpMaxScroll);
    this.overlayBody.y = this.helpBodyBaseY - this.helpScrollY;
    this.overlayScoreboard.y = this.helpBodyBaseY - this.helpScrollY;
    this.drawHelpScrollbar();
  }

  drawHelpScrollbar() {
    this.helpScrollbar.clear();
    if (this.helpMaxScroll <= 0) {
      this.helpScrollbar.setVisible(false);
      return;
    }
    this.helpScrollbar.setVisible(true);
    const x = GAME_WIDTH * 0.5 + 416;
    const viewport = this.getHelpViewport();
    const trackY = viewport.top;
    const trackH = viewport.height;
    const thumbH = Math.max(28, trackH * (viewport.height / (viewport.height + this.helpMaxScroll)));
    const thumbY = trackY + (trackH - thumbH) * (this.helpScrollY / this.helpMaxScroll);
    this.helpScrollbar.fillStyle(0x1a2c38, 0.9);
    this.helpScrollbar.fillRoundedRect(x, trackY, 6, trackH, 3);
    this.helpScrollbar.fillStyle(0x7fe7dc, 0.55);
    this.helpScrollbar.fillRoundedRect(x, thumbY, 6, thumbH, 3);
  }

  drawHelpClip() {
    this.helpMaskGraphics.clear();
    this.helpClip.clear();

    if (!this.gameScene.overlayState || this.gameScene.overlayState.type !== 'help') {
      this.overlayBody.clearMask();
      this.overlayScoreboard.clearMask();
      return;
    }

    const viewport = this.getHelpViewport();
    const contentTop = viewport.top;
    const contentH = viewport.height;
    const contentPadX = 34;
    const contentL = this.overlayPanel.x - this.overlayPanel.width * 0.5 + contentPadX;
    const contentW = this.overlayPanel.width - contentPadX * 2;

    // Strict clip region for both help columns.
    this.helpMaskGraphics.fillStyle(0xffffff, 1);
    this.helpMaskGraphics.fillRect(contentL, contentTop, contentW, contentH);
    this.overlayBody.setMask(this.helpTextMask);
    this.overlayScoreboard.setMask(this.helpTextMask);
  }

  isPortraitViewport() {
    const viewport = window.visualViewport;
    const w = viewport?.width ?? window.innerWidth;
    const h = viewport?.height ?? window.innerHeight;
    return h > w;
  }

  updateOrientationGuard() {
    if (!this.isTouchDevice || !this.gameScene) {
      this.orientationShade.setVisible(false);
      this.orientationTitle.setVisible(false);
      this.orientationBody.setVisible(false);
      return;
    }

    const portrait = this.isPortraitViewport();
    this.orientationShade.setVisible(portrait);
    this.orientationTitle.setVisible(portrait);
    this.orientationBody.setVisible(portrait);

    if (portrait && !this.pausedForOrientation) {
      this.gameScene.scene.pause();
      this.pausedForOrientation = true;
    } else if (!portrait && this.pausedForOrientation) {
      this.gameScene.scene.resume();
      this.pausedForOrientation = false;
    }
  }

  // ── Frame / HUD chrome ────────────────────────────────────────────────────────
  computeHudLayout() {
    const frameX = 16;
    const frameY = 14;
    const frameW = GAME_WIDTH - 32;
    const frameH = this.compactLayout ? 116 : 132;
    const sideW = this.compactLayout ? 280 : 304;
    const sectionGap = this.compactLayout ? 10 : 12;
    const innerPad = 12;

    const leftBox = {
      x: frameX + innerPad,
      y: frameY + 10,
      w: sideW,
      h: frameH - 20
    };
    const rightBox = {
      x: frameX + frameW - innerPad - sideW,
      y: frameY + 10,
      w: sideW,
      h: frameH - 20
    };
    const centerLeft = leftBox.x + leftBox.w + sectionGap;
    const centerRight = rightBox.x - sectionGap;
    const centerW = Math.max(360, centerRight - centerLeft);
    const centerX = centerLeft + centerW * 0.5;
    const objectiveY = frameY + frameH + (this.compactLayout ? 8 : 12);

    return {
      frameX,
      frameY,
      frameW,
      frameH,
      leftBox,
      rightBox,
      centerX,
      centerLeft,
      centerW,
      textTopY: frameY + 14,
      windY: frameY + 42,
      timerBarY: frameY + 78,
      timerTextY: frameY + 90,
      hpBarY: frameY + frameH - 20,
      objectiveY,
      objectiveW: this.compactLayout ? 760 : 860
    };
  }

  drawFrame() {
    this.hudLayout = this.hudLayout ?? this.computeHudLayout();
    const h = this.hudLayout;
    this.panel.clear();

    // Main HUD plate
    this.panel.fillStyle(0x09131b, 0.55);
    this.panel.fillRoundedRect(h.frameX, h.frameY, h.frameW, h.frameH, 18);
    this.panel.lineStyle(2, 0xffffff, 0.08);
    this.panel.strokeRoundedRect(h.frameX, h.frameY, h.frameW, h.frameH, 18);

    // Left/Right info zones for player cards
    this.panel.fillStyle(0x0c1822, 0.5);
    this.panel.fillRoundedRect(h.leftBox.x, h.leftBox.y, h.leftBox.w, h.leftBox.h, 12);
    this.panel.fillRoundedRect(h.rightBox.x, h.rightBox.y, h.rightBox.w, h.rightBox.h, 12);
    this.panel.lineStyle(1, 0xffffff, 0.08);
    this.panel.strokeRoundedRect(h.leftBox.x, h.leftBox.y, h.leftBox.w, h.leftBox.h, 12);
    this.panel.strokeRoundedRect(h.rightBox.x, h.rightBox.y, h.rightBox.w, h.rightBox.h, 12);

    // Center delimiter lines keep mode/wind/timer isolated from side cards.
    this.panel.lineStyle(1, 0xffffff, 0.08);
    this.panel.beginPath();
    this.panel.moveTo(h.centerLeft - 6, h.frameY + 14);
    this.panel.lineTo(h.centerLeft - 6, h.frameY + h.frameH - 14);
    this.panel.moveTo(h.centerLeft + h.centerW + 6, h.frameY + 14);
    this.panel.lineTo(h.centerLeft + h.centerW + 6, h.frameY + h.frameH - 14);
    this.panel.strokePath();

    // Objective ribbon gets its own lane to avoid overlap with top HUD lines.
    this.panel.fillStyle(0x09131b, 0.7);
    this.panel.fillRoundedRect(
      GAME_WIDTH * 0.5 - h.objectiveW * 0.5,
      h.objectiveY - 4,
      h.objectiveW,
      30,
      12
    );
    this.panel.lineStyle(1, 0xffffff, 0.08);
    this.panel.strokeRoundedRect(
      GAME_WIDTH * 0.5 - h.objectiveW * 0.5,
      h.objectiveY - 4,
      h.objectiveW,
      30,
      12
    );
  }

  setStartMode(mode) {
    if (!this.gameScene || this.gameScene.overlayState?.type !== 'start') return;
    this.gameScene.setMode(mode);
    this.gameScene.showStartOverlay();
    this.gameScene.syncHud();
  }

  startFromOverlay() {
    if (!this.gameScene || this.gameScene.overlayState?.type !== 'start') return;
    this.gameScene.clearOverlay();
    this.gameScene.presentTurnOverlay();
    this.gameScene.syncHud();
  }

  drawHpBars(left, right) {
    this.hudLayout = this.hudLayout ?? this.computeHudLayout();
    const h = this.hudLayout;
    const barWidth = this.compactLayout ? 210 : 230;
    const leftX = h.leftBox.x + 14;
    const rightX = h.rightBox.x + h.rightBox.w - 14 - barWidth;

    this.hpBars.clear();
    const bars = [
      { x: leftX, y: h.hpBarY, width: barWidth, value: left, color: PLAYER_COLORS[0] },
      { x: rightX, y: h.hpBarY, width: barWidth, value: right, color: PLAYER_COLORS[1] }
    ];
    bars.forEach((bar) => {
      this.hpBars.fillStyle(0x08121a, 0.86);
      this.hpBars.fillRoundedRect(bar.x, bar.y, bar.width, 10, 5);
      this.hpBars.fillStyle(bar.color, 0.96);
      this.hpBars.fillRoundedRect(bar.x, bar.y, bar.width * Phaser.Math.Clamp(bar.value / 100, 0, 1), 10, 5);
      this.hpBars.lineStyle(1, 0xffffff, 0.12);
      this.hpBars.strokeRoundedRect(bar.x, bar.y, bar.width, 10, 5);
    });
  }

  applyResponsiveLayout() {
    const width = this.scale.parentSize.width;
    const height = this.scale.parentSize.height;
    this.compactLayout = width < 920 || height < 680;
    this.hudLayout = this.computeHudLayout();
    const h = this.hudLayout;

    this.leftText.setFontSize(this.compactLayout ? '16px' : '18px');
    this.rightText.setFontSize(this.compactLayout ? '16px' : '18px');
    this.centerText.setFontSize(this.compactLayout ? '14px' : '16px');
    this.windText.setFontSize(this.compactLayout ? '13px' : '15px');
    this.objectiveText.setFontSize(this.compactLayout ? '12px' : '14px');
    this.controlsText.setFontSize(this.compactLayout ? '14px' : '16px');
    this.controlsText.setWordWrapWidth(this.compactLayout ? 860 : 1120, true);
    this.mobileWeaponButton.setPosition(GAME_WIDTH - 22, GAME_HEIGHT - 58);
    this.mobileHelpButton.setPosition(GAME_WIDTH - 138, GAME_HEIGHT - 58);
    this.mobileWeaponButton.setFontSize(this.compactLayout ? '12px' : '14px');
    this.mobileHelpButton.setFontSize(this.compactLayout ? '12px' : '14px');
    this.leftText.setPosition(h.leftBox.x + 12, h.textTopY);
    this.rightText.setPosition(h.rightBox.x + h.rightBox.w - 12, h.textTopY);
    this.centerText.setPosition(h.centerX, h.textTopY);
    this.windText.setPosition(h.centerX, h.windY);
    this.timerText.setPosition(h.centerX, h.timerTextY);
    this.objectiveText.setPosition(h.centerX, h.objectiveY);
    this.leftText.setWordWrapWidth(h.leftBox.w - 24, true);
    this.rightText.setWordWrapWidth(h.rightBox.w - 24, true);
    this.centerText.setWordWrapWidth(h.centerW - 16, true);
    this.windText.setWordWrapWidth(h.centerW - 16, true);
    this.objectiveText.setWordWrapWidth(h.objectiveW - 24, true);
    this.overlayPanel.width = this.compactLayout ? 940 : 860;
    this.overlayPanel.height = this.compactLayout ? 560 : 520;
    this.overlayBody.setWordWrapWidth(this.compactLayout ? 470 : 420, true);
    this.overlayScoreboard.setWordWrapWidth(this.compactLayout ? 310 : 270, true);
    this.startTagline.setFontSize(this.compactLayout ? '21px' : '24px');
    this.startModeCpuText.setFontSize(this.compactLayout ? '14px' : '15px');
    this.startModeLocalText.setFontSize(this.compactLayout ? '14px' : '15px');
    this.startBodyLabel.setFontSize(this.compactLayout ? '11px' : '12px');
    this.startScoreLabel.setFontSize(this.compactLayout ? '11px' : '12px');
    this.startScoreAmber.setFontSize(this.compactLayout ? '17px' : '18px');
    this.startScoreCyan.setFontSize(this.compactLayout ? '17px' : '18px');
    this.overlayTitle.setFontSize(this.compactLayout ? '34px' : this.overlayTitle.style.fontSize);
    this.orientationTitle.setFontSize(this.compactLayout ? '28px' : '34px');
    this.orientationBody.setFontSize(this.compactLayout ? '18px' : '20px');
    this.drawFrame();
    this.drawHpBars(this.displayHp[0], this.displayHp[1]);
    if (this.gameScene?.overlayState?.type === 'help') {
      this.drawHelpClip();
      this.drawHelpScrollbar();
    }
    this.updateOrientationGuard();
  }

  // ── Start screen decorative graphics ─────────────────────────────────────────
  drawStartDecor() {
    this.startDeco.clear();

    const panelW = this.overlayPanel.width;   // 900 (non-compact)
    const panelH = this.overlayPanel.height;  // 520
    const panelX = this.overlayPanel.x;       // 640
    const panelY = this.overlayPanel.y;       // 376
    const left = panelX - panelW * 0.5;
    const top = panelY - panelH * 0.5;

    // Ambient fill circles
    this.startDeco.fillStyle(0xf2b84b, 0.07);
    this.startDeco.fillCircle(panelX - 238, panelY - 116, 88);
    this.startDeco.fillStyle(0x7fe7dc, 0.06);
    this.startDeco.fillCircle(panelX + 266, panelY - 72, 62);

    this.startDeco.lineStyle(2, 0xf2b84b, 0.2);
    this.startDeco.strokeCircle(panelX - 238, panelY - 116, 88);
    this.startDeco.strokeCircle(panelX - 238, panelY - 116, 56);
    this.startDeco.lineStyle(2, 0x7fe7dc, 0.22);
    this.startDeco.strokeCircle(panelX + 266, panelY - 72, 62);
    this.startDeco.strokeCircle(panelX + 266, panelY - 72, 34);

    // Corner tech lines
    this.startDeco.lineStyle(3, 0xf2b84b, 0.22);
    this.startDeco.beginPath();
    this.startDeco.moveTo(left + 34, top + 50);
    this.startDeco.lineTo(left + 180, top + 50);
    this.startDeco.lineTo(left + 206, top + 76);
    this.startDeco.lineTo(left + 320, top + 76);
    this.startDeco.strokePath();

    // ── Content boxes ──────────────────────────────────────────────────────────
    // Mission box: left 60% of content area (offset -426, width 514)
    this.startDeco.fillStyle(0x08141d, 0.94);
    this.startDeco.fillRoundedRect(panelX - 426, panelY + 24, 514, 148, 16);
    // Score box: right 40% (offset +104, width 322)
    this.startDeco.fillStyle(0x0d1d27, 0.96);
    this.startDeco.fillRoundedRect(panelX + 104, panelY + 24, 322, 148, 16);
    // Action bar: full content width
    this.startDeco.fillStyle(0x071018, 0.98);
    this.startDeco.fillRoundedRect(panelX - 426, panelY + 188, 852, 50, 16);

    // Header strips inside boxes
    this.startDeco.fillStyle(0x103040, 0.65);
    this.startDeco.fillRoundedRect(panelX - 426, panelY + 24, 514, 30, 16);
    this.startDeco.fillStyle(0x3a2a0f, 0.62);
    this.startDeco.fillRoundedRect(panelX + 104, panelY + 24, 322, 30, 16);

    // Box outlines
    this.startDeco.lineStyle(2, 0x7fe7dc, 0.18);
    this.startDeco.strokeRoundedRect(panelX - 426, panelY + 24, 514, 148, 16);
    this.startDeco.lineStyle(2, 0xf2b84b, 0.18);
    this.startDeco.strokeRoundedRect(panelX + 104, panelY + 24, 322, 148, 16);
    this.startDeco.lineStyle(2, 0xf2b84b, 0.36);
    this.startDeco.strokeRoundedRect(panelX - 426, panelY + 188, 852, 50, 16);
  }

  // ── HUD update ────────────────────────────────────────────────────────────────
  updateHud(state) {
    if (!state) return;

    if (state.isCpuTurn || state.gameOver) {
      this.timerBar.clear();
      this.timerText.setText('');
    }

    const left = state.players[0];
    const right = state.players[1];
    const arcadePlayers = state.arcade?.players ?? {};
    const leftArcade = arcadePlayers[left.name] ?? { score: 0, multiplier: 1 };
    const rightArcade = arcadePlayers[right.name] ?? { score: 0, multiplier: 1 };
    const latestFeed = state.arcade?.feed?.[0] ?? '';
    const activeColor = PLAYER_COLORS[state.activePlayerIndex];
    const windColor =
      state.windDirection === 'LEFT'
        ? '#7fe7dc'
        : state.windDirection === 'RIGHT'
          ? '#f2b84b'
          : '#f4f1df';
    const red = (activeColor >> 16) & 255;
    const green = (activeColor >> 8) & 255;
    const blue = activeColor & 255;

    [left.hp, right.hp].forEach((hp, index) => {
      if (this.hpTargets[index] === hp) return;
      this.hpTargets[index] = hp;
      this.tweens.addCounter({
        from: this.displayHp[index],
        to: hp,
        duration: 260,
        ease: 'Quad.Out',
        onUpdate: (tween) => {
          this.displayHp[index] = tween.getValue();
          this.drawHpBars(this.displayHp[0], this.displayHp[1]);
        }
      });
    });
    this.drawHpBars(this.displayHp[0], this.displayHp[1]);

    this.leftText.setText([
      `${left.name}  |  HP ${left.hp}  |  Wins ${left.wins}`,
      `Weapon: ${left.weapon}`,
      `Score: ${leftArcade.score ?? 0}  |  Combo x${(leftArcade.multiplier ?? 1).toFixed(2)}`
    ].join('\n'));
    this.rightText.setText([
      `${right.name}  |  HP ${right.hp}  |  Wins ${right.wins}`,
      `Weapon: ${right.weapon}`,
      `Score: ${rightArcade.score ?? 0}  |  Combo x${(rightArcade.multiplier ?? 1).toFixed(2)}`
    ].join('\n'));
    this.centerText.setColor(`rgb(${red}, ${green}, ${blue})`);
    this.windText.setColor(windColor);
    this.objectiveText.setText(
      latestFeed
        ? `Goal: ${state.objective}\nArcade: ${latestFeed}`
        : `Goal: ${state.objective}`
    );
    this.windText.setText(
      `Wind ${state.windDirection}  |  ${state.windStrength}  |  ${Math.abs(state.wind).toFixed(0)}  |  ${state.windEffect}`
    );

    const hudKey = `${state.activePlayerName}-${state.phase}-${state.players[0].hp}-${state.players[1].hp}-${state.wind.toFixed(1)}`;
    if (this.lastHudKey && this.lastHudKey !== hudKey) {
      this.tweens.add({
        targets: [this.centerText, this.windText, this.objectiveText],
        y: '-=6',
        alpha: 0.7,
        yoyo: true,
        duration: 120,
        ease: 'Sine.Out'
      });
      this.tweens.add({
        targets: state.activePlayerIndex === 0 ? this.leftText : this.rightText,
        scaleX: 1.04,
        scaleY: 1.04,
        yoyo: true,
        duration: 160,
        ease: 'Quad.Out'
      });
    }
    this.lastHudKey = hudKey;

    const weatherTag = state.weather ? `  |  ${state.weather}` : '';
    const mutatorTag = state.mutator ? `  |  Mutator ${state.mutator}` : '';
    const motionTag = state.reducedMotion ? '  |  Motion Reduced' : '';
    this.centerText.setText(
      state.gameOver
        ? state.winner
          ? `${state.winner} wins  |  Click/Tap or R for a new map`
          : 'Draw  |  Click/Tap or R for a new map'
        : `${state.mode}${weatherTag}${mutatorTag}${motionTag}  |  Turn ${state.turnNumber}  |  ${state.activePlayerName} ${state.phase.toUpperCase()}  |  Power ${state.players[state.activePlayerIndex].power}  |  Move ${state.remainingMove.toFixed(0)}`
    );
    this.controlsText.setText(
      state.gameOver
        ? 'Click/Tap or R to restart  |  V Motion  |  H/Help'
        : state.phase === 'move'
          ? 'Move: ←/→ or click/tap ground  |  Skip: click/tap own tank or Space  |  V Motion  |  H/Help'
          : 'Aim: mouse/touch or ↑↓  |  Power: wheel/drag or A/D/J/L  |  Fire: click/release/Space  |  V Motion'
    );
    if (this.isTouchDevice) {
      const canSwitch = !state.gameOver && state.phase === 'aim' && !state.isCpuTurn;
      this.mobileWeaponButton.setAlpha(canSwitch ? 1 : 0.55);
      this.mobileHelpButton.setAlpha(1);
    }
  }

  // ── Overlay rendering ─────────────────────────────────────────────────────────
  updateOverlay(overlay) {
    const visible = Boolean(overlay);
    const isStart = Boolean(overlay && overlay.type === 'start');
    this.tweens.killTweensOf([this.overlayShade, ...this.overlayContent]);
    this.tweens.killTweensOf(this.startOverlayContent);

    // Reset help scroll when overlay closes or changes
    if (!visible || (overlay && overlay.type !== 'help')) {
      this.helpScrollY = 0;
      this.helpScrollbar.setVisible(false);
      this.helpMaskGraphics.clear();
      this.overlayBody.clearMask();
      this.overlayScoreboard.clearMask();
      this.helpClip.clear();
    }

    this.overlayShade.setVisible(visible);
    this.overlayPanel.setVisible(visible);
    this.overlayTitle.setVisible(visible);
    this.overlayBody.setVisible(visible);
    this.overlayScoreboard.setVisible(visible && !isStart);
    this.overlayPrompt.setVisible(visible);
    this.startDeco.setVisible(isStart);
    this.startKicker.setVisible(isStart);
    this.startTagline.setVisible(isStart);
    this.startModeBacking.setVisible(isStart);
    this.startModeCpuButton.setVisible(isStart);
    this.startModeLocalButton.setVisible(isStart);
    this.startModeCpuText.setVisible(isStart);
    this.startModeLocalText.setVisible(isStart);
    this.startBodyLabel.setVisible(isStart);
    this.startScoreLabel.setVisible(isStart);
    this.startScoreAmberCard.setVisible(isStart);
    this.startScoreCyanCard.setVisible(isStart);
    this.startScoreAmber.setVisible(isStart);
    this.startScoreCyan.setVisible(isStart);
    this.startActionBacking.setVisible(isStart);
    this.startHowToPlayText.setVisible(isStart);
    this.startSwitchModeText.setVisible(isStart);
    if (this.isTouchDevice) {
      this.mobileWeaponButton.setVisible(!visible);
      this.mobileHelpButton.setVisible(true);
    }

    if (!visible) {
      this.overlayShade.setAlpha(0);
      this.overlayContent.forEach((item) => item.setAlpha(0));
      this.startDeco.setAlpha(0);
      this.startOverlayContent.forEach((item) => item.setAlpha(0));
      return;
    }

    // ── Populate text ──────────────────────────────────────────────────────────
    this.overlayTitle.setText(overlay.title ?? '');
    this.overlayBody.setText(overlay.body ?? '');
    this.overlayScoreboard.setText(overlay.scoreboard ?? '');
    this.overlayPrompt.setText(overlay.prompt ?? '');
    this.startKicker.setText(overlay.kicker ?? '');
    this.startTagline.setText(overlay.tagline ?? '');
    this.startBodyLabel.setText('MISSION');
    this.startScoreLabel.setText('HIGHSCORE');
    const scoreEntries = overlay.scores ?? [];
    this.startScoreAmber.setText(`${scoreEntries[0]?.name ?? 'Amber'}    ${scoreEntries[0]?.wins ?? 0} wins`);
    this.startScoreCyan.setText(`${scoreEntries[1]?.name ?? 'Cyan'}    ${scoreEntries[1]?.wins ?? 0} wins`);

    // ── Mode button state ──────────────────────────────────────────────────────
    const cpuActive = overlay.modeKey === 'cpu';
    this.startModeCpuButton.setFillStyle(cpuActive ? 0x154458 : 0x112531, cpuActive ? 1 : 0.96);
    this.startModeCpuButton.setStrokeStyle(2, 0x7fe7dc, cpuActive ? 0.46 : 0.16);
    this.startModeLocalButton.setFillStyle(cpuActive ? 0x1b2230 : 0x43331a, cpuActive ? 0.96 : 1);
    this.startModeLocalButton.setStrokeStyle(2, 0xf2b84b, cpuActive ? 0.14 : 0.42);
    this.startModeCpuText.setAlpha(cpuActive ? 1 : 0.72);
    this.startModeLocalText.setAlpha(cpuActive ? 0.72 : 1);

    // ── Style by type ──────────────────────────────────────────────────────────
    this.overlayTitle.setScale(1);
    this.overlayPrompt.setAlpha(1);
    this.overlayTitle.setFontSize(overlay.type === 'start' ? '78px' : '40px');
    this.overlayTitle.setColor(overlay.type === 'start' ? '#f2b84b' : '#f4f1df');
    this.overlayPrompt.setColor(overlay.type === 'start' ? '#f4f1df' : '#f2b84b');
    this.overlayPrompt.setFontSize(overlay.type === 'start' ? '22px' : '20px');
    this.overlayBody.setColor('#f4f1df');
    this.overlayScoreboard.setColor('#7fe7dc');
    this.overlayBody.setFontSize(overlay.type === 'start' ? '20px' : '17px');
    this.overlayScoreboard.setFontSize('17px');
    this.overlayPanel.setFillStyle(overlay.type === 'start' ? 0x071018 : 0x09131b, overlay.type === 'start' ? 0.98 : 0.96);
    this.overlayPanel.setStrokeStyle(2, 0xffffff, overlay.type === 'start' ? 0.1 : 0.14);

    // Reset all alphas for fade-in
    this.overlayShade.setAlpha(0);
    this.overlayPanel.setAlpha(0);
    this.overlayTitle.setAlpha(0);
    this.overlayBody.setAlpha(0);
    this.overlayScoreboard.setAlpha(0);
    this.overlayPrompt.setAlpha(0);
    this.startDeco.setAlpha(0);
    this.startOverlayContent.forEach((item) => { item.setAlpha(0); item.setScale(1); });

    // ── Panel size and positions ───────────────────────────────────────────────
    this.overlayPanel.width = isStart ? (this.compactLayout ? 960 : 900) : this.compactLayout ? 940 : 860;
    this.overlayPanel.height = isStart ? (this.compactLayout ? 548 : 520) : this.compactLayout ? 560 : 520;
    this.overlayPanel.y = GAME_HEIGHT * 0.5 + 16;

    if (isStart) {
      // Title / kicker
      this.overlayTitle.y = GAME_HEIGHT * 0.5 - 164;
      this.startKicker.y = GAME_HEIGHT * 0.5 - 226;
      this.startTagline.y = GAME_HEIGHT * 0.5 - 94;

      // Mode buttons
      this.startModeBacking.y = GAME_HEIGHT * 0.5 - 52;
      this.startModeCpuButton.x = GAME_WIDTH * 0.5 - 82;
      this.startModeCpuButton.y = GAME_HEIGHT * 0.5 - 52;
      this.startModeLocalButton.x = GAME_WIDTH * 0.5 + 82;
      this.startModeLocalButton.y = GAME_HEIGHT * 0.5 - 52;
      this.startModeCpuText.x = GAME_WIDTH * 0.5 - 82;
      this.startModeCpuText.y = GAME_HEIGHT * 0.5 - 52;
      this.startModeLocalText.x = GAME_WIDTH * 0.5 + 82;
      this.startModeLocalText.y = GAME_HEIGHT * 0.5 - 52;

      // Mission box text (word wrap = 488 = 514 - 2*13 padding)
      this.overlayBody.x = GAME_WIDTH * 0.5 - 412;
      this.overlayBody.y = this.overlayPanel.y + 62;
      this.overlayBody.setWordWrapWidth(this.compactLayout ? 500 : 488, true);

      // Score box labels
      this.startBodyLabel.x = GAME_WIDTH * 0.5 - 414;
      this.startBodyLabel.y = this.overlayPanel.y + 33;
      this.startScoreLabel.x = GAME_WIDTH * 0.5 + 116;
      this.startScoreLabel.y = this.overlayPanel.y + 33;

      // Score cards — center of score box (panelX+104+322/2 = panelX+265 = 905)
      const scoreCenterX = GAME_WIDTH * 0.5 + 265;
      this.startScoreAmberCard.x = scoreCenterX;
      this.startScoreAmberCard.y = this.overlayPanel.y + 88;
      this.startScoreCyanCard.x = scoreCenterX;
      this.startScoreCyanCard.y = this.overlayPanel.y + 144;
      this.startScoreAmber.x = scoreCenterX;
      this.startScoreAmber.y = this.overlayPanel.y + 88;
      this.startScoreCyan.x = scoreCenterX;
      this.startScoreCyan.y = this.overlayPanel.y + 144;

      // Action bar
      this.startActionBacking.x = GAME_WIDTH * 0.5;
      this.startActionBacking.y = this.overlayPanel.y + 213;
      this.overlayPrompt.y = this.overlayPanel.y + 213;

      // "How to Play" and "Switch Mode" links below action bar
      this.startHowToPlayText.x = GAME_WIDTH * 0.5 - 100;
      this.startHowToPlayText.y = this.overlayPanel.y + 245;
      this.startSwitchModeText.x = GAME_WIDTH * 0.5 + 100;
      this.startSwitchModeText.y = this.overlayPanel.y + 245;

      this.drawStartDecor();
    } else {
      // Non-start overlays (turn, gameover, help)
      this.overlayTitle.y = GAME_HEIGHT * 0.5 - 188;
      this.overlayBody.x = GAME_WIDTH * 0.5 - 360;
      this.overlayScoreboard.x = GAME_WIDTH * 0.5 + 110;
      this.overlayBody.setWordWrapWidth(this.compactLayout ? 470 : 420, true);
      this.overlayScoreboard.setWordWrapWidth(this.compactLayout ? 310 : 270, true);
      this.overlayPrompt.y = GAME_HEIGHT * 0.5 + 214;

      if (overlay.type === 'help') {
        const viewport = this.getHelpViewport();
        this.helpScrollY = 0;
        this.helpBodyBaseY = viewport.top;
        this.overlayBody.y = this.helpBodyBaseY;
        this.overlayScoreboard.y = this.helpBodyBaseY;
        this.overlayPrompt.y = GAME_HEIGHT * 0.5 + 226;
        this.drawHelpClip();
        // Compute scroll range after text is laid out (brief delay)
        this.time.delayedCall(40, () => {
          const textH = Math.max(this.overlayBody.height, this.overlayScoreboard.height);
          this.helpMaxScroll = Math.max(0, textH - viewport.height);
          this.drawHelpScrollbar();
        });
      } else {
        this.overlayBody.y = GAME_HEIGHT * 0.5 - 128;
        this.overlayScoreboard.y = GAME_HEIGHT * 0.5 - 128;
      }
    }

    // ── Fade-in animations ─────────────────────────────────────────────────────
    this.tweens.add({ targets: this.overlayShade, alpha: 1, duration: 180, ease: 'Quad.Out' });
    this.tweens.add(
      isStart
        ? { targets: this.overlayContent, alpha: 1, duration: 220, ease: 'Cubic.Out', stagger: 20 }
        : { targets: this.overlayContent, alpha: 1, y: '-=16', duration: 220, ease: 'Cubic.Out', stagger: 20 }
    );
    if (isStart) {
      this.tweens.add({ targets: this.startDeco, alpha: 1, duration: 240, ease: 'Cubic.Out' });
      this.tweens.add({ targets: this.startOverlayContent, alpha: 1, duration: 240, ease: 'Cubic.Out', stagger: 14 });
    }

    // ── Idle animations (start screen only) ───────────────────────────────────
    if (overlay.type === 'start') {
      this.tweens.add({ targets: this.overlayTitle, scale: 1.03, yoyo: true, repeat: -1, duration: 1800, ease: 'Sine.InOut' });
      this.tweens.add({ targets: this.overlayPrompt, alpha: 0.45, yoyo: true, repeat: -1, duration: 1000, ease: 'Sine.InOut' });
      this.tweens.add({ targets: this.startTagline, alpha: 0.72, yoyo: true, repeat: -1, duration: 1800, ease: 'Sine.InOut' });
      this.tweens.add({ targets: this.startModeBacking, scaleX: 1.02, scaleY: 1.02, yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.InOut' });
      this.tweens.add({ targets: this.startActionBacking, alpha: 0.34, yoyo: true, repeat: -1, duration: 920, ease: 'Sine.InOut' });
    }
  }

  // ── Timer bar ─────────────────────────────────────────────────────────────────
  updateTimer(remaining, total) {
    this.hudLayout = this.hudLayout ?? this.computeHudLayout();
    const h = this.hudLayout;
    this.timerBar.clear();
    if (remaining >= total) {
      this.timerText.setText('');
      return;
    }
    const ratio = remaining / total;
    const barWidth = this.compactLayout ? 96 : 114;
    const barX = h.centerX - barWidth * 0.5;
    const barY = h.timerBarY;
    const urgent = remaining <= 5;
    const color = urgent ? 0xff4444 : remaining <= 10 ? 0xf2b84b : 0x7fe7dc;

    this.timerBar.fillStyle(0x08121a, 0.72);
    this.timerBar.fillRoundedRect(barX - 2, barY - 2, barWidth + 4, 10, 4);
    this.timerBar.fillStyle(color, urgent ? (Math.floor(this.game.loop.frame / 8) % 2 === 0 ? 0.95 : 0.5) : 0.86);
    this.timerBar.fillRoundedRect(barX, barY, Math.round(barWidth * ratio), 6, 3);
    this.timerText.setText(`${Math.ceil(remaining)}s`);
    this.timerText.setColor(urgent ? '#ff6666' : '#f4f1df');
    this.timerText.setY(h.timerTextY);
  }

  // ── Turn banner ───────────────────────────────────────────────────────────────
  showBanner(text) {
    this.bannerText.setText(text);
    this.bannerText.setAlpha(1);
    this.bannerText.setScale(0.92);
    this.tweens.killTweensOf(this.bannerText);
    this.tweens.killTweensOf(this.bannerBacking);
    this.tweens.add({ targets: this.bannerText, scale: 1, duration: 180, ease: 'Back.Out' });
    this.tweens.add({
      targets: [this.bannerText, this.bannerBacking],
      alpha: { from: 1, to: 0 },
      duration: 900,
      ease: 'Cubic.Out'
    });
    this.bannerBacking.setAlpha(0.82);
  }
}
