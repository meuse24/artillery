import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PLAYER_COLORS } from '../constants.js';
import { GAME_SCENE_EVENTS, SCENE_KEYS } from '../config/sceneContracts.js';
import { DialogLayoutModule } from '../ui/DialogLayoutModule.js';
import { MobileControls } from '../ui/MobileControls.js';
import { OrientationGuard } from '../ui/OrientationGuard.js';
import {
  distributeVerticalSections,
  getStartScreenMetrics
} from '../ui/screenLayoutModel.js';

export class UIScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.UI);
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
    this.gameoverScrollY = 0;
    this.gameoverMaxScroll = 0;
    this.gameoverBodyBaseY = 0;
    this.lastHudState = null;
    this.lastObjectiveNoticeKey = null;
    this.dialogScrollY = 0;
    this.dialogMaxScroll = 0;
    this.dialogBodyBaseY = 0;
    this.dialogLayout = null;
    this.dialogLayoutModule = new DialogLayoutModule();
    this.dialogDragPointerId = null;
    this.dialogDragLastY = 0;
    this.startScreenMetrics = getStartScreenMetrics();

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
    this.phaseBadgeText = this.add
      .text(0, 0, 'MOVE', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#dff9f5',
        align: 'right'
      })
      .setOrigin(1, 0.5)
      .setDepth(104)
      .setStroke('#08121a', 5);
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
        fontSize: '13px',
        color: '#d7e9aa',
        align: 'center',
        padding: { x: 10, y: 2 }
      })
      .setOrigin(0.5, 0)
      .setDepth(102)
      .setVisible(false);
    this.objectiveBacking = this.add
      .rectangle(GAME_WIDTH * 0.5, 118, 720, 22, 0x09131b, 0.72)
      .setOrigin(0.5, 0)
      .setDepth(101.5)
      .setVisible(false);
    this.objectiveBacking.setStrokeStyle(1, 0xffffff, 0.08);

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
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#f2b84b',
        align: 'left'
      })
      .setOrigin(0, 0.5)
      .setDepth(104)
      .setStroke('#08121a', 5)
      .setVisible(true)
      .setInteractive({ useHandCursor: true });
    this.mobileHelpButton = this.add
      .text(0, 0, 'Help (H)', {
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
    this.turnDialogCard = this.add.graphics().setDepth(121.4).setVisible(false);

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
    this.helpHtmlNode = document.createElement('div');
    this.helpHtmlNode.className = 'help-controls-pane';
    this.helpHtmlPane = this.add
      .dom(0, 0, this.helpHtmlNode)
      .setOrigin(0, 0)
      .setDepth(122)
      .setVisible(false);

    // Real clipping mask for help text area (prevents overflow on all sides).
    this.helpMaskGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    this.helpTextMask = this.helpMaskGraphics.createGeometryMask();
    this.gameoverMaskGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    this.gameoverTextMask = this.gameoverMaskGraphics.createGeometryMask();
    this.dialogMaskGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    this.dialogTextMask = this.dialogMaskGraphics.createGeometryMask();
    // Legacy cover graphics (kept for compatibility, currently unused for clipping)
    this.helpClip = this.add.graphics().setDepth(121.5);
    // Scrollbar drawn above clip (depth 125)
    this.helpScrollbar = this.add.graphics().setDepth(125).setVisible(false);
    this.gameoverScrollbar = this.add.graphics().setDepth(125).setVisible(false);
    this.dialogScrollbar = this.add.graphics().setDepth(125).setVisible(false);

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
    this.dialogScrollHitArea = this.add
      .zone(0, 0, 10, 10)
      .setDepth(123)
      .setVisible(false)
      .setInteractive({ useHandCursor: false });
    this.dialogScrollHitArea.on('pointerdown', this.handleDialogPointerDown, this);

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
      .text(0, 0, '(H) HOW TO PLAY', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#7fe7dc'
      })
      .setOrigin(0.5)
      .setDepth(123)
      .setVisible(false);
    this.startSwitchModeText = this.add
      .text(0, 0, '(M) SWITCH MODE', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#f2b84b'
      })
      .setOrigin(0.5)
      .setDepth(123)
      .setVisible(false);
    this.hotkeyHelpButton = this.createShortcutButton('(H) HELP', '#7fe7dc', () => this.handleHotkeyHelp());
    this.hotkeyModeButton = this.createShortcutButton('(M) MODE', '#f2b84b', () => this.handleHotkeyMode());
    this.hotkeyRestartButton = this.createShortcutButton('(R) RESTART', '#ffd995', () => this.handleHotkeyRestart());
    this.hotkeyMotionButton = this.createShortcutButton('(V) MOTION', '#d7e9aa', () => this.handleHotkeyMotion());

    // ── Animation groups ───────────────────────────────────────────────────────
    this.overlayContent = [
      this.overlayPanel,
      this.turnDialogCard,
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
    this.gameScene = this.scene.get(SCENE_KEYS.GAME);

    // Mode selector buttons
    [this.startModeCpuButton, this.startModeCpuText].forEach((item) => {
      item.setInteractive({ useHandCursor: true })
        .on('pointerdown', (_pointer, _lx, _ly, event) => {
          event?.stopPropagation();
          this.setStartMode('cpu');
        })
        .on('pointerover', () => this.startModeCpuButton.setStrokeStyle(2, 0x7fe7dc, 0.6))
        .on('pointerout', () => {
          const active = this.gameScene.currentMode === 'cpu';
          this.startModeCpuButton.setStrokeStyle(2, 0x7fe7dc, active ? 0.46 : 0.16);
        });
    });
    [this.startModeLocalButton, this.startModeLocalText].forEach((item) => {
      item.setInteractive({ useHandCursor: true })
        .on('pointerdown', (_pointer, _lx, _ly, event) => {
          event?.stopPropagation();
          this.setStartMode('local');
        })
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
        .on('pointerdown', (_pointer, _lx, _ly, event) => {
          event?.stopPropagation();
          this.handleOverlayClick();
        })
        .on('pointerover', overlayActionHoverIn)
        .on('pointerout', overlayActionHoverOut);
    });

    // Clicking the overlay surface also advances / closes according to state.
    [this.overlayShade, this.overlayPanel].forEach((item) => {
      item.setInteractive({ useHandCursor: true })
        .on('pointerdown', (_pointer, _lx, _ly, event) => {
          event?.stopPropagation();
          this.handleOverlayClick();
        });
    });

    // How to Play link
    this.startHowToPlayText.setInteractive({ useHandCursor: true })
      .on('pointerdown', (_pointer, _lx, _ly, event) => {
        event?.stopPropagation();
        const t = this.gameScene.overlayState?.type;
        if (t === 'start' || t === 'gameover') this.gameScene.showHelpOverlay();
      })
      .on('pointerover', () => this.startHowToPlayText.setColor('#a0ffef'))
      .on('pointerout', () => this.startHowToPlayText.setColor('#7fe7dc'));

    // Switch Mode link
    this.startSwitchModeText.setInteractive({ useHandCursor: true })
      .on('pointerdown', (_pointer, _lx, _ly, event) => {
        event?.stopPropagation();
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

    this.mobileControls = new MobileControls(this);
    this.mobileControls.bind();

    // Unified dialog scrolling: mouse wheel + keyboard + drag/swipe
    this.input.on('wheel', this.handleOverlayWheel, this);
    this.input.on('pointermove', this.handleDialogPointerMove, this);
    this.input.on('pointerup', this.handleDialogPointerUp, this);
    this.input.on('pointerupoutside', this.handleDialogPointerUp, this);
    this.input.keyboard?.on('keydown', this.handleDialogKeyDown, this);

    // ── Subscribe to game events ───────────────────────────────────────────────
    this.gameScene.events.on(GAME_SCENE_EVENTS.HUD_UPDATE, this.updateHud, this);
    this.gameScene.events.on(GAME_SCENE_EVENTS.TURN_BANNER, this.showBanner, this);
    this.gameScene.events.on(GAME_SCENE_EVENTS.OVERLAY_UPDATE, this.updateOverlay, this);
    this.gameScene.events.on(GAME_SCENE_EVENTS.TIMER_UPDATE, this.updateTimer, this);

    if (typeof this.gameScene.getHudState === 'function') {
      this.updateHud(this.gameScene.getHudState());
    }
    if (this.gameScene.overlayState) {
      this.updateOverlay(this.gameScene.overlayState);
    }

    this.drawFrame();
    this.applyResponsiveLayout();
    this.scale.on('resize', this.applyResponsiveLayout, this);
    this.orientationGuard = new OrientationGuard(this);
    this.orientationGuard.bind();
    this.events.once('shutdown', this.handleShutdown, this);
    this.events.once('destroy', this.handleShutdown, this);
  }

  createShortcutButton(label, color, onPress) {
    const button = this.add
      .text(0, 0, label, {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color,
        backgroundColor: 'rgba(11,22,30,0.88)',
        padding: { x: 10, y: 4 }
      })
      .setOrigin(0.5)
      .setDepth(126)
      .setVisible(false)
      .setInteractive({ useHandCursor: true });

    button
      .on('pointerdown', (_pointer, _lx, _ly, event) => {
        event?.stopPropagation();
        onPress?.();
      })
      .on('pointerover', () => button.setBackgroundColor('rgba(26,48,63,0.96)'))
      .on('pointerout', () => button.setBackgroundColor('rgba(11,22,30,0.88)'));

    return button;
  }

  hideShortcutButtons() {
    [
      this.hotkeyHelpButton,
      this.hotkeyModeButton,
      this.hotkeyRestartButton,
      this.hotkeyMotionButton
    ].forEach((button) => button?.setVisible(false));
  }

  layoutShortcutRow(entries, { x, y, anchor = 'center' } = {}) {
    if (!entries.length) {
      return;
    }

    const gap = this.compactLayout ? 8 : 12;
    entries.forEach(({ button, label }) => {
      button.setText(label);
      button.setBackgroundColor('rgba(11,22,30,0.88)');
      button.setVisible(true);
    });

    const totalWidth =
      entries.reduce((sum, { button }) => sum + button.displayWidth, 0) + gap * (entries.length - 1);
    let cursor = anchor === 'right' ? x - totalWidth : x - totalWidth * 0.5;

    entries.forEach(({ button }) => {
      const width = button.displayWidth;
      button.setPosition(cursor + width * 0.5, y);
      cursor += width + gap;
    });
  }

  handleHotkeyHelp() {
    if (!this.gameScene) {
      return;
    }

    this.gameScene.blockPointerInput?.(140);
    const type = this.gameScene.overlayState?.type;
    if (type === 'help') {
      this.handleOverlayClick();
      return;
    }
    this.gameScene.showHelpOverlay();
  }

  handleHotkeyMode() {
    if (!this.gameScene) {
      return;
    }

    const type = this.gameScene.overlayState?.type;
    if (type !== 'start' && type !== 'gameover') {
      return;
    }

    this.gameScene.blockPointerInput?.(140);
    this.gameScene.toggleMode();
    if (type === 'start') {
      this.gameScene.showStartOverlay();
    } else {
      this.gameScene.showGameOverOverlay();
    }
    this.gameScene.syncHud();
  }

  handleHotkeyRestart() {
    if (!this.gameScene) {
      return;
    }

    const type = this.gameScene.overlayState?.type;
    if (type && type !== 'gameover') {
      return;
    }

    this.gameScene.blockPointerInput?.(140);
    this.gameScene.startMatch();
  }

  handleHotkeyMotion() {
    if (!this.gameScene) {
      return;
    }
    this.gameScene.toggleReducedMotion();
  }

  refreshShortcutButtons() {
    this.hideShortcutButtons();
    if (!this.gameScene) {
      return;
    }

    const overlay = this.gameScene.overlayState;
    if (overlay) {
      this.refreshOverlayShortcutButtons(overlay);
      return;
    }

    if (this.lastHudState) {
      this.refreshHudShortcutButtons(this.lastHudState);
    }
  }

  refreshOverlayShortcutButtons(overlay) {
    if (!overlay) {
      return;
    }

    const y = this.overlayPrompt.y + (this.compactLayout ? 24 : 26);

    if (overlay.type === 'gameover') {
      this.layoutShortcutRow([
        { button: this.hotkeyRestartButton, label: '(R) NEW GAME' },
        { button: this.hotkeyModeButton, label: '(M) SWITCH MODE' },
        { button: this.hotkeyHelpButton, label: '(H) HELP' }
      ], { x: this.overlayPanel.x, y });
      return;
    }

  }

  refreshHudShortcutButtons(state) {
    if (!state || !this.controlsText.visible) {
      return;
    }

    const y = this.controlsText.y - this.controlsText.displayHeight - (this.compactLayout ? 9 : 11);
    const entries = state.gameOver
      ? [
          { button: this.hotkeyRestartButton, label: '(R) RESTART' },
          { button: this.hotkeyMotionButton, label: '(V) MOTION' },
          { button: this.hotkeyHelpButton, label: '(H) HELP' }
        ]
      : [
          { button: this.hotkeyMotionButton, label: '(V) MOTION' },
          { button: this.hotkeyHelpButton, label: '(H) HELP' }
        ];

    this.layoutShortcutRow(entries, {
      x: GAME_WIDTH - 18,
      y,
      anchor: 'right'
    });
  }

  escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  renderHelpHtmlContent(overlay) {
    if (!this.helpHtmlNode || !overlay) {
      return;
    }

    const controlsRows = Array.isArray(overlay.controlsRows) ? overlay.controlsRows : [];
    const controlsRowsHtml = controlsRows.map((row) => {
      const action = this.escapeHtml(row.action);
      const input = this.escapeHtml(row.input);
      return `<tr><td>${action}</td><td>${input}</td></tr>`;
    }).join('');
    const bodyHtml = this.escapeHtml(overlay.body ?? '').replaceAll('\n', '<br>');
    const sidebarHtml = this.escapeHtml(overlay.scoreboard ?? '').replaceAll('\n', '<br>');

    this.helpHtmlNode.innerHTML = `
      <div class="help-html-block">${bodyHtml}</div>
      <div class="help-html-controls-title">CONTROLS</div>
      <table class="help-controls-table" aria-label="Controls">
        <thead>
          <tr><th>Action</th><th>Input</th></tr>
        </thead>
        <tbody>${controlsRowsHtml}</tbody>
      </table>
      <div class="help-html-block">${sidebarHtml}</div>
    `;
    this.helpHtmlNode.scrollTop = 0;
  }

  buildHelpFallbackText(overlay) {
    const controlsRows = Array.isArray(overlay?.controlsRows) ? overlay.controlsRows : [];
    const controlLines = controlsRows.map((row) => `${row.action}: ${row.input}`);
    return [
      overlay?.body ?? '',
      '',
      'CONTROLS',
      ...controlLines,
      '',
      overlay?.scoreboard ?? ''
    ].filter(Boolean).join('\n');
  }

  scrollHelpHtmlPane(deltaY) {
    if (!this.helpHtmlNode) {
      return;
    }
    this.helpHtmlNode.scrollTop += deltaY;
  }

  handleShutdown() {
    this.scale.off('resize', this.applyResponsiveLayout, this);
    this.gameScene?.events.off(GAME_SCENE_EVENTS.HUD_UPDATE, this.updateHud, this);
    this.gameScene?.events.off(GAME_SCENE_EVENTS.TURN_BANNER, this.showBanner, this);
    this.gameScene?.events.off(GAME_SCENE_EVENTS.OVERLAY_UPDATE, this.updateOverlay, this);
    this.gameScene?.events.off(GAME_SCENE_EVENTS.TIMER_UPDATE, this.updateTimer, this);
    this.input.off('wheel', this.handleOverlayWheel, this);
    this.input.off('pointermove', this.handleDialogPointerMove, this);
    this.input.off('pointerup', this.handleDialogPointerUp, this);
    this.input.off('pointerupoutside', this.handleDialogPointerUp, this);
    this.input.keyboard?.off('keydown', this.handleDialogKeyDown, this);
    this.dialogScrollHitArea?.off('pointerdown', this.handleDialogPointerDown, this);
    this.mobileControls?.destroy();
    this.mobileControls = null;
    this.orientationGuard?.destroy();
    this.orientationGuard = null;
    this.helpHtmlPane?.setVisible(false);
    if (this.helpHtmlNode) {
      this.helpHtmlNode.innerHTML = '';
    }
  }

  // ── Overlay click router ─────────────────────────────────────────────────────
  handleOverlayClick() {
    const state = this.gameScene.overlayState;
    if (!state) return;
    this.gameScene.blockPointerInput?.(160);
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

  scrollActiveDialogBy(deltaY) {
    const overlayType = this.gameScene?.overlayState?.type;
    if (!this.isUnifiedDialogType(overlayType)) {
      return;
    }

    if (overlayType === 'help' && this.helpHtmlPane?.visible) {
      this.scrollHelpHtmlPane(deltaY);
      return;
    }

    this.scrollUnifiedDialog(deltaY);
  }

  handleOverlayWheel(_pointer, _objects, _deltaX, deltaY) {
    if (!this.isUnifiedDialogType(this.gameScene?.overlayState?.type)) {
      return;
    }
    this.scrollActiveDialogBy(deltaY * 0.58);
  }

  handleDialogKeyDown(event) {
    const overlayType = this.gameScene?.overlayState?.type;
    if (!this.isUnifiedDialogType(overlayType)) {
      return;
    }

    const viewportHeight = this.getUnifiedDialogViewport().height;
    let deltaY = 0;
    if (event.code === 'ArrowUp') {
      deltaY = -36;
    } else if (event.code === 'ArrowDown') {
      deltaY = 36;
    } else if (event.code === 'PageUp') {
      deltaY = -Math.max(120, viewportHeight * 0.72);
    } else if (event.code === 'PageDown') {
      deltaY = Math.max(120, viewportHeight * 0.72);
    } else if (event.code === 'Home') {
      deltaY = -Number.MAX_SAFE_INTEGER;
    } else if (event.code === 'End') {
      deltaY = Number.MAX_SAFE_INTEGER;
    } else {
      return;
    }

    event.preventDefault();
    this.scrollActiveDialogBy(deltaY);
  }

  handleDialogPointerDown(pointer, _lx, _ly, event) {
    if (!this.isUnifiedDialogType(this.gameScene?.overlayState?.type)) {
      return;
    }
    event?.stopPropagation();
    this.dialogDragPointerId = pointer.id;
    this.dialogDragLastY = pointer.y;
  }

  handleDialogPointerMove(pointer) {
    if (this.dialogDragPointerId === null || pointer.id !== this.dialogDragPointerId) {
      return;
    }
    if (!this.isUnifiedDialogType(this.gameScene?.overlayState?.type)) {
      this.dialogDragPointerId = null;
      return;
    }

    const deltaY = this.dialogDragLastY - pointer.y;
    this.dialogDragLastY = pointer.y;
    if (Math.abs(deltaY) > 0) {
      this.scrollActiveDialogBy(deltaY);
    }
  }

  handleDialogPointerUp(pointer) {
    if (this.dialogDragPointerId === null) {
      return;
    }
    if (pointer && pointer.id !== this.dialogDragPointerId) {
      return;
    }
    this.dialogDragPointerId = null;
  }

  isUnifiedDialogType(type) {
    return type === 'turn' || type === 'help' || type === 'gameover';
  }

  getUnifiedDialogLayout() {
    this.dialogLayout = this.dialogLayoutModule.compute({
      compact: this.compactLayout,
      type: this.gameScene?.overlayState?.type ?? 'default'
    });
    return this.dialogLayout;
  }

  getUnifiedDialogViewport() {
    const layout = this.dialogLayout ?? this.getUnifiedDialogLayout();
    return {
      top: layout.text.y,
      height: layout.text.height
    };
  }

  layoutUnifiedDialog(resetScroll = false) {
    const layout = this.getUnifiedDialogLayout();
    const overlayType = this.gameScene?.overlayState?.type;
    const isHelpOverlay = overlayType === 'help';
    const hasHelpHtml = isHelpOverlay && Boolean(this.helpHtmlNode?.innerHTML?.trim());
    this.overlayPanel.setPosition(layout.panel.x, layout.panel.y);
    this.overlayPanel.width = layout.panel.width;
    this.overlayPanel.height = layout.panel.height;
    this.overlayTitle.setPosition(layout.panel.x, layout.header.titleY);
    this.overlayTitle.setWordWrapWidth(layout.panel.width - (this.compactLayout ? 72 : 88), true);
    this.overlayBody.setPosition(layout.text.x, layout.text.y);
    this.overlayBody.setWordWrapWidth(layout.text.width, true);
    this.overlayPrompt.setPosition(layout.panel.x, layout.footer.promptY);
    this.overlayPrompt.setWordWrapWidth(layout.text.width, true);

    if (resetScroll) {
      this.dialogScrollY = 0;
    }

    const viewport = this.getUnifiedDialogViewport();
    this.dialogMaxScroll = Math.max(0, this.overlayBody.height - viewport.height);
    this.dialogScrollY = Phaser.Math.Clamp(this.dialogScrollY, 0, this.dialogMaxScroll);
    this.dialogBodyBaseY = viewport.top;
    this.overlayBody.y = this.dialogBodyBaseY - this.dialogScrollY;
    this.dialogScrollHitArea.setPosition(
      layout.text.x + layout.text.width * 0.5,
      layout.text.y + layout.text.height * 0.5
    );
    this.dialogScrollHitArea.setSize(layout.text.width, layout.text.height);
    this.dialogScrollHitArea.setVisible(this.isUnifiedDialogType(overlayType));

    this.helpHtmlPane?.setVisible(hasHelpHtml);
    if (hasHelpHtml && this.helpHtmlPane?.node) {
      this.helpHtmlPane.setPosition(layout.text.x, layout.text.y);
      this.helpHtmlPane.node.style.width = `${Math.floor(layout.text.width)}px`;
      this.helpHtmlPane.node.style.height = `${Math.floor(layout.text.height)}px`;
    }

    if (isHelpOverlay && hasHelpHtml) {
      if (resetScroll && this.helpHtmlNode) {
        this.helpHtmlNode.scrollTop = 0;
      }
      this.dialogMaxScroll = 0;
      this.dialogScrollY = 0;
      this.dialogMaskGraphics.clear();
      this.overlayBody.clearMask();
      this.dialogScrollbar.clear();
      this.dialogScrollbar.setVisible(false);
      this.drawUnifiedDialogCard();
      return;
    }

    this.drawUnifiedDialogMask();
    this.drawUnifiedDialogScrollbar();
    this.drawUnifiedDialogCard();
  }

  scrollUnifiedDialog(deltaY) {
    const viewport = this.getUnifiedDialogViewport();
    this.dialogMaxScroll = Math.max(0, this.overlayBody.height - viewport.height);
    this.dialogScrollY = Phaser.Math.Clamp(this.dialogScrollY + deltaY, 0, this.dialogMaxScroll);
    this.overlayBody.y = this.dialogBodyBaseY - this.dialogScrollY;
    this.drawUnifiedDialogScrollbar();
  }

  drawUnifiedDialogScrollbar() {
    const overlayType = this.gameScene?.overlayState?.type;
    if (overlayType === 'help' && this.helpHtmlPane?.visible) {
      this.dialogScrollbar.clear();
      this.dialogScrollbar.setVisible(false);
      return;
    }
    this.dialogScrollbar.clear();
    if (this.dialogMaxScroll <= 0) {
      this.dialogScrollbar.setVisible(false);
      return;
    }

    this.dialogScrollbar.setVisible(true);
    const layout = this.dialogLayout ?? this.getUnifiedDialogLayout();
    const viewport = this.getUnifiedDialogViewport();
    const trackY = viewport.top;
    const trackH = viewport.height;
    const thumbH = Math.max(30, trackH * (viewport.height / (viewport.height + this.dialogMaxScroll)));
    const thumbY = trackY + (trackH - thumbH) * (this.dialogScrollY / this.dialogMaxScroll);
    this.dialogScrollbar.fillStyle(0x1a2c38, 0.9);
    this.dialogScrollbar.fillRoundedRect(layout.scrollbar.x, trackY, layout.scrollbar.width, trackH, 3);
    this.dialogScrollbar.fillStyle(0x7fe7dc, 0.58);
    this.dialogScrollbar.fillRoundedRect(layout.scrollbar.x, thumbY, layout.scrollbar.width, thumbH, 3);
  }

  drawUnifiedDialogMask() {
    this.dialogMaskGraphics.clear();
    const overlayType = this.gameScene?.overlayState?.type;
    if (!this.isUnifiedDialogType(overlayType) || (overlayType === 'help' && this.helpHtmlPane?.visible)) {
      this.overlayBody.clearMask();
      return;
    }

    const layout = this.dialogLayout ?? this.getUnifiedDialogLayout();
    const viewport = this.getUnifiedDialogViewport();
    this.dialogMaskGraphics.fillStyle(0xffffff, 1);
    this.dialogMaskGraphics.fillRect(layout.text.x, viewport.top, layout.text.width, viewport.height);
    this.overlayBody.setMask(this.dialogTextMask);
  }

  drawUnifiedDialogCard() {
    this.turnDialogCard.clear();
    const overlayType = this.gameScene?.overlayState?.type;
    if (!this.isUnifiedDialogType(overlayType)) {
      return;
    }

    const layout = this.dialogLayout ?? this.getUnifiedDialogLayout();
    const x = layout.panel.left;
    const y = layout.panel.top;
    const w = layout.panel.width;
    const h = layout.panel.height;
    const headerH = layout.header.height;
    const footerH = layout.footer.height;

    const isTurnOverlay = overlayType === 'turn';
    const shellAlpha = isTurnOverlay ? 0.84 : 0.98;
    const headerAlpha = isTurnOverlay ? 0.72 : 0.98;
    const footerAlpha = isTurnOverlay ? 0.68 : 0.94;

    this.turnDialogCard.fillStyle(0x061522, shellAlpha);
    this.turnDialogCard.fillRoundedRect(x, y, w, h, 14);
    this.turnDialogCard.lineStyle(2, 0xffffff, 0.14);
    this.turnDialogCard.strokeRoundedRect(x, y, w, h, 14);

    this.turnDialogCard.fillStyle(0x0d2635, headerAlpha);
    this.turnDialogCard.fillRoundedRect(x + 1, y + 1, w - 2, headerH, 12);
    this.turnDialogCard.lineStyle(1, 0xffffff, 0.16);
    this.turnDialogCard.beginPath();
    this.turnDialogCard.moveTo(x + 18, y + headerH);
    this.turnDialogCard.lineTo(x + w - 18, y + headerH);
    this.turnDialogCard.strokePath();

    this.turnDialogCard.fillStyle(0x0a1b28, footerAlpha);
    this.turnDialogCard.fillRoundedRect(x + 1, y + h - footerH - 1, w - 2, footerH, 10);
  }

  // ── Help scroll ───────────────────────────────────────────────────────────────
  getHelpDialogLayout() {
    const panelLeft = this.overlayPanel.x - this.overlayPanel.width * 0.5;
    const panelTop = this.overlayPanel.y - this.overlayPanel.height * 0.5;
    const sidePad = this.compactLayout ? 36 : 44;
    const headerPad = this.compactLayout ? 96 : 104;
    const footerPad = this.compactLayout ? 80 : 86;
    const contentX = panelLeft + sidePad;
    const contentY = panelTop + headerPad;
    const contentWidth = this.overlayPanel.width - sidePad * 2;
    const contentHeight = this.overlayPanel.height - headerPad - footerPad;
    const innerPad = this.compactLayout ? 12 : 14;
    const gap = this.compactLayout ? 24 : 30;
    const scrollbarGap = 10;
    const scrollbarWidth = 6;
    const textLaneWidth = contentWidth - innerPad * 2 - scrollbarGap - scrollbarWidth;
    const leftColumnWidth = Math.floor(textLaneWidth * (this.compactLayout ? 0.57 : 0.59));
    const rightColumnWidth = textLaneWidth - leftColumnWidth - gap;
    const leftX = contentX + innerPad;
    const rightX = leftX + leftColumnWidth + gap;
    const textTop = contentY + innerPad;
    const clipHeight = contentHeight - innerPad * 2;
    const dividerX = rightX - Math.floor(gap * 0.5);
    const scrollbarX = contentX + contentWidth - innerPad - scrollbarWidth;
    const promptY = panelTop + this.overlayPanel.height - (this.compactLayout ? 28 : 34);
    const titleY = panelTop + (this.compactLayout ? 56 : 64);

    return {
      contentX,
      contentY,
      contentWidth,
      contentHeight,
      leftX,
      rightX,
      leftColumnWidth,
      rightColumnWidth,
      textTop,
      clipHeight,
      dividerX,
      scrollbarX,
      promptY,
      titleY
    };
  }

  getHelpViewport() {
    const layout = this.helpLayout ?? this.getHelpDialogLayout();
    return {
      top: layout.textTop,
      height: layout.clipHeight
    };
  }

  layoutHelpDialog(resetScroll = false) {
    this.helpLayout = this.getHelpDialogLayout();
    const layout = this.helpLayout;

    this.overlayTitle.y = layout.titleY;
    this.overlayBody.setPosition(layout.leftX, layout.textTop);
    this.overlayScoreboard.setPosition(layout.rightX, layout.textTop);
    this.overlayBody.setWordWrapWidth(layout.leftColumnWidth, true);
    this.overlayScoreboard.setWordWrapWidth(layout.rightColumnWidth, true);
    this.overlayPrompt.y = layout.promptY;

    if (resetScroll) {
      this.helpScrollY = 0;
    }

    const viewport = this.getHelpViewport();
    const textH = Math.max(this.overlayBody.height, this.overlayScoreboard.height);
    this.helpMaxScroll = Math.max(0, textH - viewport.height);
    this.helpScrollY = Phaser.Math.Clamp(this.helpScrollY, 0, this.helpMaxScroll);
    this.helpBodyBaseY = viewport.top;
    this.overlayBody.y = this.helpBodyBaseY - this.helpScrollY;
    this.overlayScoreboard.y = this.helpBodyBaseY - this.helpScrollY;
    this.drawHelpClip();
    this.drawHelpScrollbar();
  }

  getTurnDialogLayout() {
    const panelLeft = this.overlayPanel.x - this.overlayPanel.width * 0.5;
    const panelTop = this.overlayPanel.y - this.overlayPanel.height * 0.5;
    const sidePad = this.compactLayout ? 34 : 40;
    const headerH = this.compactLayout ? 88 : 96;
    const footerH = this.compactLayout ? 56 : 60;
    const verticalLift = this.compactLayout ? 8 : 12;
    const textX = panelLeft + sidePad;
    const textWidth = this.overlayPanel.width - sidePad * 2;
    const titleY = panelTop + Math.round(headerH * 0.5) - verticalLift;
    const bodyY = panelTop + headerH + (this.compactLayout ? 18 : 22) - verticalLift;
    const promptY = panelTop + this.overlayPanel.height - Math.round(footerH * 0.55) - verticalLift;

    return {
      textX,
      textWidth,
      bodyY,
      titleY,
      promptY,
      headerH,
      footerH
    };
  }

  layoutTurnDialog() {
    this.turnLayout = this.getTurnDialogLayout();
    const layout = this.turnLayout;
    const titleBottom = layout.titleY + this.overlayTitle.displayHeight * 0.5;
    const bodyTop = Math.max(layout.bodyY, Math.round(titleBottom + (this.compactLayout ? 16 : 20)));
    this.overlayTitle.y = layout.titleY;
    this.overlayTitle.setOrigin(0.5);
    this.overlayTitle.setAlign('center');
    this.overlayBody.setPosition(layout.textX, bodyTop);
    this.overlayBody.setAlign('left');
    this.overlayBody.setWordWrapWidth(layout.textWidth, true);
    this.overlayPrompt.setPosition(this.overlayPanel.x, layout.promptY);
    this.overlayPrompt.setWordWrapWidth(layout.textWidth, true);
    this.drawTurnDialogCard();
  }

  getRoundOverDialogLayout() {
    const panelLeft = this.overlayPanel.x - this.overlayPanel.width * 0.5;
    const panelTop = this.overlayPanel.y - this.overlayPanel.height * 0.5;
    const sidePad = this.compactLayout ? 34 : 40;
    const headerH = this.compactLayout ? 88 : 96;
    const footerH = this.compactLayout ? 58 : 62;
    const textX = panelLeft + sidePad;
    const textWidth = this.overlayPanel.width - sidePad * 2;
    const titleY = panelTop + Math.round(headerH * 0.5);
    const bodyY = panelTop + headerH + (this.compactLayout ? 16 : 18);
    const promptY = panelTop + this.overlayPanel.height - Math.round(footerH * 0.55);

    return {
      textX,
      textWidth,
      bodyY,
      titleY,
      promptY,
      headerH,
      footerH
    };
  }

  layoutRoundOverDialog() {
    this.turnLayout = this.getRoundOverDialogLayout();
    const layout = this.turnLayout;
    this.overlayTitle.y = layout.titleY;
    this.overlayTitle.setOrigin(0.5);
    this.overlayTitle.setAlign('center');
    this.overlayBody.setPosition(layout.textX, layout.bodyY);
    this.overlayBody.setAlign('left');
    this.overlayBody.setWordWrapWidth(layout.textWidth, true);
    this.overlayPrompt.setPosition(this.overlayPanel.x, layout.promptY);
    this.overlayPrompt.setWordWrapWidth(layout.textWidth, true);
    this.drawTurnDialogCard();
  }

  getRoundOverViewport() {
    const layout = this.turnLayout ?? this.getRoundOverDialogLayout();
    const top = this.overlayBody.y;
    const bottom = layout.promptY - (this.compactLayout ? 22 : 26);
    return {
      top,
      height: Math.max(80, bottom - top)
    };
  }

  layoutRoundOverScroll(resetScroll = false) {
    if (resetScroll) {
      this.gameoverScrollY = 0;
    }
    const viewport = this.getRoundOverViewport();
    this.gameoverMaxScroll = Math.max(0, this.overlayBody.height - viewport.height);
    this.gameoverScrollY = Phaser.Math.Clamp(this.gameoverScrollY, 0, this.gameoverMaxScroll);
    this.gameoverBodyBaseY = viewport.top;
    this.overlayBody.y = this.gameoverBodyBaseY - this.gameoverScrollY;
    this.drawRoundOverClip();
    this.drawRoundOverScrollbar();
  }

  scrollRoundOver(deltaY) {
    const viewport = this.getRoundOverViewport();
    this.gameoverMaxScroll = Math.max(0, this.overlayBody.height - viewport.height);
    this.gameoverScrollY = Phaser.Math.Clamp(this.gameoverScrollY + deltaY, 0, this.gameoverMaxScroll);
    this.overlayBody.y = this.gameoverBodyBaseY - this.gameoverScrollY;
    this.drawRoundOverScrollbar();
  }

  drawRoundOverScrollbar() {
    this.gameoverScrollbar.clear();
    if (this.gameoverMaxScroll <= 0) {
      this.gameoverScrollbar.setVisible(false);
      return;
    }
    this.gameoverScrollbar.setVisible(true);
    const viewport = this.getRoundOverViewport();
    const x = this.overlayPanel.x + this.overlayPanel.width * 0.5 - 16;
    const trackY = viewport.top;
    const trackH = viewport.height;
    const thumbH = Math.max(28, trackH * (viewport.height / (viewport.height + this.gameoverMaxScroll)));
    const thumbY = trackY + (trackH - thumbH) * (this.gameoverScrollY / this.gameoverMaxScroll);
    this.gameoverScrollbar.fillStyle(0x1a2c38, 0.9);
    this.gameoverScrollbar.fillRoundedRect(x, trackY, 6, trackH, 3);
    this.gameoverScrollbar.fillStyle(0xf2b84b, 0.62);
    this.gameoverScrollbar.fillRoundedRect(x, thumbY, 6, thumbH, 3);
  }

  drawRoundOverClip() {
    this.gameoverMaskGraphics.clear();
    if (this.gameScene?.overlayState?.type !== 'gameover') {
      this.overlayBody.clearMask();
      return;
    }
    const viewport = this.getRoundOverViewport();
    const clipWidth =
      this.overlayBody.style.wordWrapWidth ??
      this.turnLayout?.textWidth ??
      (this.overlayPanel.width - 80);
    this.gameoverMaskGraphics.fillStyle(0xffffff, 1);
    this.gameoverMaskGraphics.fillRect(
      this.overlayBody.x,
      viewport.top,
      clipWidth,
      viewport.height
    );
    this.overlayBody.setMask(this.gameoverTextMask);
  }

  drawTurnDialogCard() {
    this.turnDialogCard.clear();
    const type = this.gameScene?.overlayState?.type;
    if (type !== 'turn' && type !== 'gameover') {
      return;
    }

    const layout = this.turnLayout ?? (type === 'gameover' ? this.getRoundOverDialogLayout() : this.getTurnDialogLayout());
    const x = this.overlayPanel.x - this.overlayPanel.width * 0.5;
    const y = this.overlayPanel.y - this.overlayPanel.height * 0.5;
    const w = this.overlayPanel.width;
    const h = this.overlayPanel.height;
    const headerH = layout.headerH;
    const footerH = layout.footerH;

    this.turnDialogCard.fillStyle(0x061522, 0.98);
    this.turnDialogCard.fillRoundedRect(x, y, w, h, 14);
    this.turnDialogCard.lineStyle(2, 0xffffff, 0.14);
    this.turnDialogCard.strokeRoundedRect(x, y, w, h, 14);

    this.turnDialogCard.fillStyle(0x0d2635, 0.98);
    this.turnDialogCard.fillRoundedRect(x + 1, y + 1, w - 2, headerH, 12);
    this.turnDialogCard.lineStyle(1, 0xffffff, 0.16);
    this.turnDialogCard.beginPath();
    this.turnDialogCard.moveTo(x + 18, y + headerH);
    this.turnDialogCard.lineTo(x + w - 18, y + headerH);
    this.turnDialogCard.strokePath();

    this.turnDialogCard.fillStyle(0x0a1b28, 0.94);
    this.turnDialogCard.fillRoundedRect(x + 1, y + h - footerH - 1, w - 2, footerH, 10);
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
    const layout = this.helpLayout ?? this.getHelpDialogLayout();
    const x = layout.scrollbarX;
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
    const layout = this.helpLayout ?? this.getHelpDialogLayout();

    // Dedicated dialog content frame.
    this.helpClip.fillStyle(0x071721, 0.94);
    this.helpClip.fillRoundedRect(
      layout.contentX,
      layout.contentY,
      layout.contentWidth,
      layout.contentHeight,
      14
    );
    this.helpClip.lineStyle(2, 0xffffff, 0.1);
    this.helpClip.strokeRoundedRect(
      layout.contentX,
      layout.contentY,
      layout.contentWidth,
      layout.contentHeight,
      14
    );
    this.helpClip.lineStyle(1, 0xffffff, 0.14);
    this.helpClip.beginPath();
    this.helpClip.moveTo(layout.dividerX, viewport.top + 6);
    this.helpClip.lineTo(layout.dividerX, viewport.top + viewport.height - 6);
    this.helpClip.strokePath();

    // Two explicit clip areas for left and right column.
    this.helpMaskGraphics.fillStyle(0xffffff, 1);
    this.helpMaskGraphics.fillRect(layout.leftX, viewport.top, layout.leftColumnWidth, viewport.height);
    this.helpMaskGraphics.fillRect(layout.rightX, viewport.top, layout.rightColumnWidth, viewport.height);
    this.overlayBody.setMask(this.helpTextMask);
    this.overlayScoreboard.setMask(this.helpTextMask);
  }

  isPortraitViewport() {
    return this.orientationGuard?.isPortraitViewport() ?? false;
  }

  updateOrientationGuard() {
    this.orientationGuard?.update();
  }

  getWeaponRarityColor(rarity) {
    if (rarity === 'epic') {
      return '#d9c6ff';
    }
    if (rarity === 'rare') {
      return '#7fe7dc';
    }
    return '#f4f1df';
  }

  showObjectiveNotice(text) {
    if (!text) {
      this.hideObjectiveNotice(true);
      return;
    }

    this.tweens.killTweensOf([this.objectiveBacking, this.objectiveText]);
    this.objectiveHideTimer?.remove(false);
    this.objectiveHideTimer = null;
    this.objectiveText.setText(text);
    this.objectiveBacking.setVisible(true);
    this.objectiveText.setVisible(true);
    this.objectiveBacking.setAlpha(1);
    this.objectiveText.setAlpha(1);

    this.objectiveHideTimer = this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: [this.objectiveBacking, this.objectiveText],
        alpha: 0,
        duration: 220,
        ease: 'Quad.Out',
        onComplete: () => {
          this.objectiveBacking.setVisible(false);
          this.objectiveText.setVisible(false);
        }
      });
      this.objectiveHideTimer = null;
    });
  }

  hideObjectiveNotice(immediate = false) {
    this.objectiveHideTimer?.remove(false);
    this.objectiveHideTimer = null;
    this.tweens.killTweensOf([this.objectiveBacking, this.objectiveText]);
    if (immediate) {
      this.objectiveBacking.setAlpha(0);
      this.objectiveText.setAlpha(0);
    }
    this.objectiveBacking.setVisible(false);
    this.objectiveText.setVisible(false);
  }

  // ── Frame / HUD chrome ────────────────────────────────────────────────────────
  computeHudLayout() {
    const frameX = 16;
    const frameY = 14;
    const frameW = GAME_WIDTH - 32;
    const baseFrameH = this.compactLayout ? 116 : 132;
    const frameH = baseFrameH;
    const sideW = this.compactLayout ? 280 : 304;
    const sectionGap = this.compactLayout ? 10 : 12;
    const innerPad = 12;

    const leftBox = {
      x: frameX + innerPad,
      y: frameY + 10,
      w: sideW,
      h: baseFrameH - 20
    };
    const rightBox = {
      x: frameX + frameW - innerPad - sideW,
      y: frameY + 10,
      w: sideW,
      h: baseFrameH - 20
    };
    const centerLeft = leftBox.x + leftBox.w + sectionGap;
    const centerRight = rightBox.x - sectionGap;
    const centerW = Math.max(360, centerRight - centerLeft);
    const centerX = centerLeft + centerW * 0.5;
    const actionY = frameY + frameH + (this.compactLayout ? 22 : 26);
    const objectiveY = actionY + (this.compactLayout ? 30 : 34);

    return {
      frameX,
      frameY,
      frameW,
      frameH,
      baseFrameH,
      leftBox,
      rightBox,
      centerX,
      centerLeft,
      centerW,
      textTopY: frameY + 14,
      windY: frameY + 42,
      moveTimerBarY: frameY + (this.compactLayout ? 68 : 74),
      aimTimerBarY: frameY + (this.compactLayout ? 80 : 86),
      timerTextY: frameY + (this.compactLayout ? 90 : 98),
      hpBarY: frameY + baseFrameH - 20,
      actionY,
      objectiveY,
      objectiveW: this.compactLayout ? 620 : 720
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
    this.panel.lineTo(h.centerLeft - 6, h.frameY + h.baseFrameH - 14);
    this.panel.moveTo(h.centerLeft + h.centerW + 6, h.frameY + 14);
    this.panel.lineTo(h.centerLeft + h.centerW + 6, h.frameY + h.baseFrameH - 14);
    this.panel.strokePath();

  }

  setStartMode(mode) {
    if (!this.gameScene || this.gameScene.overlayState?.type !== 'start') return;
    this.gameScene.setMode(mode);
    this.gameScene.showStartOverlay();
    this.gameScene.syncHud();
  }

  startFromOverlay() {
    if (!this.gameScene || this.gameScene.overlayState?.type !== 'start') return;
    this.gameScene.startBattleFromStartOverlay();
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
    this.startScreenMetrics = getStartScreenMetrics({
      viewportWidth: width,
      viewportHeight: height,
      compact: this.compactLayout
    });
    this.hudLayout = this.computeHudLayout();
    const h = this.hudLayout;

    this.leftText.setFontSize(this.compactLayout ? '16px' : '18px');
    this.rightText.setFontSize(this.compactLayout ? '16px' : '18px');
    this.centerText.setFontSize(this.compactLayout ? '14px' : '16px');
    this.windText.setFontSize(this.compactLayout ? '13px' : '15px');
    this.objectiveText.setFontSize(this.compactLayout ? '11px' : '12px');
    this.controlsText.setFontSize(this.compactLayout ? '14px' : '16px');
    this.controlsText.setWordWrapWidth(this.compactLayout ? 860 : 1120, true);
    this.mobileWeaponButton.setPosition(h.frameX + 8, h.actionY);
    this.mobileHelpButton.setPosition(GAME_WIDTH - 138, GAME_HEIGHT - 58);
    this.mobileWeaponButton.setFontSize(this.compactLayout ? '20px' : '24px');
    this.mobileHelpButton.setFontSize(this.compactLayout ? '12px' : '14px');
    this.phaseBadgeText.setFontSize(this.compactLayout ? '20px' : '24px');
    this.phaseBadgeText.setPosition(h.frameX + h.frameW - 8, h.actionY);
    this.leftText.setPosition(h.leftBox.x + 12, h.textTopY);
    this.rightText.setPosition(h.rightBox.x + h.rightBox.w - 12, h.textTopY);
    this.centerText.setPosition(h.centerX, h.textTopY);
    this.windText.setPosition(h.centerX, h.windY);
    this.timerText.setPosition(h.centerX, h.timerTextY);
    this.objectiveBacking.setPosition(h.centerX, h.objectiveY);
    this.objectiveBacking.setSize(h.objectiveW, 22);
    this.objectiveText.setPosition(h.centerX, h.objectiveY);
    this.leftText.setWordWrapWidth(h.leftBox.w - 24, true);
    this.rightText.setWordWrapWidth(h.rightBox.w - 24, true);
    this.centerText.setWordWrapWidth(h.centerW - 48, true);
    this.windText.setWordWrapWidth(h.centerW - 16, true);
    this.objectiveText.setWordWrapWidth(h.objectiveW - 24, true);
    const activeOverlayType = this.gameScene?.overlayState?.type;
    if (activeOverlayType === 'start') {
      this.overlayPanel.width = this.compactLayout ? 980 : 940;
      this.overlayPanel.height = this.startScreenMetrics.panelHeight;
      this.overlayPanel.y = this.startScreenMetrics.panelY;
    } else if (this.isUnifiedDialogType(activeOverlayType)) {
      this.layoutUnifiedDialog(false);
    } else {
      this.overlayPanel.width = this.compactLayout ? 940 : 860;
      this.overlayPanel.height = this.compactLayout ? 560 : 520;
      this.overlayPanel.y = GAME_HEIGHT * 0.5 + 16;
      this.overlayBody.setWordWrapWidth(this.compactLayout ? 470 : 420, true);
      this.overlayScoreboard.setWordWrapWidth(this.compactLayout ? 310 : 270, true);
      this.turnLayout = null;
    }
    this.startKicker.setFontSize(`${this.startScreenMetrics.kickerFontPx}px`);
    this.startTagline.setFontSize(`${this.startScreenMetrics.taglineFontPx}px`);
    this.startModeCpuText.setFontSize(`${this.startScreenMetrics.modeFontPx}px`);
    this.startModeLocalText.setFontSize(`${this.startScreenMetrics.modeFontPx}px`);
    this.startBodyLabel.setFontSize(`${this.startScreenMetrics.labelFontPx}px`);
    this.startScoreLabel.setFontSize(`${this.startScreenMetrics.labelFontPx}px`);
    this.startScoreAmber.setFontSize(`${this.startScreenMetrics.scoreFontPx}px`);
    this.startScoreCyan.setFontSize(`${this.startScreenMetrics.scoreFontPx}px`);
    this.startHowToPlayText.setFontSize(`${this.startScreenMetrics.linkFontPx}px`);
    this.startSwitchModeText.setFontSize(`${this.startScreenMetrics.linkFontPx}px`);
    this.overlayTitle.setFontSize(this.compactLayout ? '34px' : this.overlayTitle.style.fontSize);
    this.orientationTitle.setFontSize(this.compactLayout ? '28px' : '34px');
    this.orientationBody.setFontSize(this.compactLayout ? '18px' : '20px');
    this.drawFrame();
    this.drawHpBars(this.displayHp[0], this.displayHp[1]);
    if (this.gameScene?.overlayState?.type === 'start') {
      this.updateOverlay(this.gameScene.overlayState);
    } else if (this.isUnifiedDialogType(this.gameScene?.overlayState?.type)) {
      this.layoutUnifiedDialog(false);
    }
    this.updateOrientationGuard();
    this.refreshShortcutButtons();
  }

  // ── Start screen decorative graphics ─────────────────────────────────────────
  getStartOverlayLayout() {
    const metrics = this.startScreenMetrics ?? getStartScreenMetrics({ compact: this.compactLayout });
    const panelW = this.overlayPanel.width;
    const panelH = this.overlayPanel.height;
    const panelX = this.overlayPanel.x;
    const panelY = this.overlayPanel.y;
    const left = panelX - panelW * 0.5;
    const top = panelY - panelH * 0.5;

    const contentInset = this.compactLayout ? 26 : 24;
    const contentGap = this.compactLayout ? 14 : 16;
    const contentX = left + contentInset;
    const contentW = panelW - contentInset * 2;
    const missionW = Math.round(contentW * (this.compactLayout ? 0.59 : 0.6));
    const scoreW = contentW - missionW - contentGap;
    const scoreX = contentX + missionW + contentGap;
    const sections = [
      {
        key: 'kicker',
        height: Math.max(16, Math.round(this.startKicker.displayHeight || metrics.kickerFontPx * 1.35))
      },
      {
        key: 'title',
        height: Math.max(70, Math.round(this.overlayTitle.displayHeight || metrics.titleFontPx * 1.08))
      },
      {
        key: 'tagline',
        height: Math.max(24, Math.round(this.startTagline.displayHeight || metrics.taglineFontPx * 1.35))
      },
      { key: 'mode', height: metrics.modeHeight },
      { key: 'content', height: metrics.contentHeight },
      { key: 'action', height: metrics.actionHeight },
      {
        key: 'links',
        height: Math.max(16, Math.round(this.startHowToPlayText.displayHeight || metrics.linkFontPx * 1.2))
      }
    ];
    const layout = distributeVerticalSections({
      top: top + metrics.sectionTopPad,
      height: panelH - metrics.sectionTopPad - metrics.sectionBottomPad,
      sections,
      minGap: metrics.minGap,
      maxGap: metrics.maxGap
    });
    const contentY = (layout.positions.content ?? panelY) - metrics.contentHeight * 0.5;
    const scoreCenterX = scoreX + scoreW * 0.5;
    const scoreFirstY = contentY + metrics.headerStripHeight + metrics.scoreCardHeight * 0.5 + 18;
    const scoreSecondY = scoreFirstY + metrics.scoreCardHeight + metrics.scoreCardGap;

    return {
      metrics,
      panelX,
      panelY,
      panelW,
      panelH,
      left,
      top,
      contentX,
      contentW,
      missionW,
      scoreX,
      scoreW,
      contentY,
      contentH: metrics.contentHeight,
      kickerY: layout.positions.kicker,
      titleY: layout.positions.title,
      taglineY: layout.positions.tagline,
      modeY: layout.positions.mode,
      actionY: layout.positions.action,
      actionH: metrics.actionHeight,
      linksY: layout.positions.links,
      gap: layout.gap,
      modeH: metrics.modeHeight,
      modeBackingW: metrics.modeBackingWidth,
      modeButtonW: Math.floor((metrics.modeBackingWidth - 22) * 0.5),
      modeButtonH: metrics.modeButtonHeight,
      modeButtonOffsetX: Math.round(metrics.modeBackingWidth * 0.25),
      bodyInsetY: metrics.headerStripHeight + 8,
      bodyInsetX: 14,
      headerStripH: metrics.headerStripHeight,
      scoreCenterX,
      scoreCardH: metrics.scoreCardHeight,
      scoreFirstY,
      scoreSecondY,
      linkOffsetX: metrics.linkOffsetX
    };
  }

  drawStartDecor(startLayout = this.getStartOverlayLayout()) {
    this.startDeco.clear();
    const metrics = startLayout.metrics ?? this.startScreenMetrics ?? getStartScreenMetrics({ compact: this.compactLayout });
    const panelX = startLayout.panelX;
    const panelY = startLayout.panelY;
    const left = startLayout.left;
    const top = startLayout.top;
    const missionX = startLayout.contentX;
    const missionY = startLayout.contentY;
    const missionW = startLayout.missionW;
    const missionH = startLayout.contentH;
    const scoreX = startLayout.scoreX;
    const scoreY = startLayout.contentY;
    const scoreW = startLayout.scoreW;
    const scoreH = startLayout.contentH;
    const actionX = startLayout.contentX;
    const actionY = Math.round(startLayout.actionY - startLayout.actionH * 0.5);
    const actionW = startLayout.contentW;
    const actionH = startLayout.actionH;

    // Ambient fill circles
    this.startDeco.fillStyle(0xf2b84b, 0.07);
    this.startDeco.fillCircle(
      panelX - metrics.decorLeftX,
      panelY - metrics.decorLeftY,
      metrics.decorLeftOuterRadius
    );
    this.startDeco.fillStyle(0x7fe7dc, 0.06);
    this.startDeco.fillCircle(
      panelX + metrics.decorRightX,
      panelY - metrics.decorRightY,
      metrics.decorRightOuterRadius
    );

    this.startDeco.lineStyle(2, 0xf2b84b, 0.2);
    this.startDeco.strokeCircle(
      panelX - metrics.decorLeftX,
      panelY - metrics.decorLeftY,
      metrics.decorLeftOuterRadius
    );
    this.startDeco.strokeCircle(
      panelX - metrics.decorLeftX,
      panelY - metrics.decorLeftY,
      metrics.decorLeftInnerRadius
    );
    this.startDeco.lineStyle(2, 0x7fe7dc, 0.22);
    this.startDeco.strokeCircle(
      panelX + metrics.decorRightX,
      panelY - metrics.decorRightY,
      metrics.decorRightOuterRadius
    );
    this.startDeco.strokeCircle(
      panelX + metrics.decorRightX,
      panelY - metrics.decorRightY,
      metrics.decorRightInnerRadius
    );

    // Corner tech lines
    this.startDeco.lineStyle(3, 0xf2b84b, 0.22);
    this.startDeco.beginPath();
    this.startDeco.moveTo(left + 34, top + 50);
    this.startDeco.lineTo(left + 34 + metrics.cornerOffset, top + 50);
    this.startDeco.lineTo(left + 60 + metrics.cornerOffset, top + 76);
    this.startDeco.lineTo(left + 174 + metrics.cornerOffset, top + 76);
    this.startDeco.strokePath();

    // ── Content boxes ──────────────────────────────────────────────────────────
    // Mission box: left 60% of content area
    this.startDeco.fillStyle(0x08141d, 0.94);
    this.startDeco.fillRoundedRect(missionX, missionY, missionW, missionH, metrics.boxRadius);
    // Score box: right side
    this.startDeco.fillStyle(0x0d1d27, 0.96);
    this.startDeco.fillRoundedRect(scoreX, scoreY, scoreW, scoreH, metrics.boxRadius);
    // Action bar: full content width
    this.startDeco.fillStyle(0x071018, 0.98);
    this.startDeco.fillRoundedRect(actionX, actionY, actionW, actionH, metrics.boxRadius);

    // Header strips inside boxes
    this.startDeco.fillStyle(0x103040, 0.65);
    this.startDeco.fillRoundedRect(missionX, missionY, missionW, startLayout.headerStripH, metrics.boxRadius);
    this.startDeco.fillStyle(0x3a2a0f, 0.62);
    this.startDeco.fillRoundedRect(scoreX, scoreY, scoreW, startLayout.headerStripH, metrics.boxRadius);

    // Box outlines
    this.startDeco.lineStyle(2, 0x7fe7dc, 0.18);
    this.startDeco.strokeRoundedRect(missionX, missionY, missionW, missionH, metrics.boxRadius);
    this.startDeco.lineStyle(2, 0xf2b84b, 0.18);
    this.startDeco.strokeRoundedRect(scoreX, scoreY, scoreW, scoreH, metrics.boxRadius);
    this.startDeco.lineStyle(2, 0xf2b84b, 0.36);
    this.startDeco.strokeRoundedRect(actionX, actionY, actionW, actionH, metrics.boxRadius);
  }

  // ── HUD update ────────────────────────────────────────────────────────────────
  updateHud(state) {
    if (!state) return;
    this.lastHudState = state;

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
    const isMovePhase = state.phase === 'move';
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
    this.phaseBadgeText.setText(isMovePhase ? 'MOVE' : 'AIM&SHOOT');
    this.phaseBadgeText.setColor(isMovePhase ? '#dff9f5' : '#fff2cf');
    const objectiveSummary = latestFeed
      ? `Goal: Enemy to 0 HP  |  ${latestFeed}`
      : 'Goal: Enemy to 0 HP';
    const objectiveNoticeKey = `${state.turnNumber}|${latestFeed}|${objectiveSummary}`;
    if (objectiveNoticeKey !== this.lastObjectiveNoticeKey) {
      this.lastObjectiveNoticeKey = objectiveNoticeKey;
      this.showObjectiveNotice(objectiveSummary);
    }
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
          ? `${state.winner} wins  |  Click/Tap or (R) for a new map`
          : 'Draw  |  Click/Tap or (R) for a new map'
        : `${state.mode}${weatherTag}${mutatorTag}${motionTag}  |  Turn ${state.turnNumber}  |  ${state.activePlayerName}  |  Power ${state.players[state.activePlayerIndex].power}`
    );
    if (state.gameOver) {
      this.controlsText.setText('Click/Tap or (R) restart  |  (V) Motion  |  (H) Help');
    } else if (state.phase === 'move') {
      this.controlsText.setText([
        'Move: (←)/(→)  |  End Move: (Space) Fire',
        'Always: (V) Motion  |  (H) Help  |  (Q)/(E) Weapon'
      ].join('\n'));
    } else {
      this.controlsText.setText([
        'Power: (←)/(→)  |  Angle: (↑)/(↓)  |  Fire: (Space)',
        'Always: (V) Motion  |  (H) Help  |  (Q)/(E) Weapon'
      ].join('\n'));
    }
    const canSwitchWeapon = !state.gameOver && !state.isCpuTurn;
    const activeWeapon = state.players[state.activePlayerIndex] ?? null;
    const rarityTag = activeWeapon?.weaponRarity ? ` ${activeWeapon.weaponRarity.toUpperCase()}` : '';
    const activeWeaponLabel = activeWeapon?.weaponLabel ?? activeWeapon?.weapon ?? 'Weapon';
    this.mobileWeaponButton.setColor(this.getWeaponRarityColor(activeWeapon?.weaponRarity));
    this.mobileWeaponButton.setText(`Weapon ▶ ${activeWeaponLabel}${rarityTag}`);
    this.mobileWeaponButton.setAlpha(canSwitchWeapon ? 1 : 0.55);
    if (this.isTouchDevice) {
      this.mobileHelpButton.setAlpha(1);
    }
    this.refreshShortcutButtons();
  }

  // ── Overlay rendering ─────────────────────────────────────────────────────────
  updateOverlay(overlay) {
    const visible = Boolean(overlay);
    const isStart = Boolean(overlay && overlay.type === 'start');
    const isTurn = Boolean(overlay && overlay.type === 'turn');
    const isGameOver = Boolean(overlay && overlay.type === 'gameover');
    const isHelp = Boolean(overlay && overlay.type === 'help');
    const isUnified = isTurn || isGameOver || isHelp;
    const startMetrics = this.startScreenMetrics ?? getStartScreenMetrics({ compact: this.compactLayout });
    this.tweens.killTweensOf([this.overlayShade, ...this.overlayContent]);
    this.tweens.killTweensOf(this.startOverlayContent);

    // Reset help state when overlay closes or changes away from help
    if (!visible || (overlay && overlay.type !== 'help')) {
      this.helpScrollY = 0;
      this.helpMaxScroll = 0;
      this.helpBodyBaseY = 0;
      this.helpLayout = null;
      this.helpScrollbar.setVisible(false);
      this.helpMaskGraphics.clear();
      this.overlayBody.clearMask();
      this.overlayScoreboard.clearMask();
      this.helpClip.clear();
    }
    if (!visible || (overlay && overlay.type !== 'gameover')) {
      this.gameoverScrollY = 0;
      this.gameoverMaxScroll = 0;
      this.gameoverBodyBaseY = 0;
      this.gameoverScrollbar.setVisible(false);
      this.gameoverMaskGraphics.clear();
      this.overlayBody.clearMask();
    }
    if (!visible || (overlay && overlay.type !== 'turn' && overlay.type !== 'gameover')) {
      this.turnLayout = null;
      this.turnDialogCard.clear();
    }
    if (!visible || !isUnified) {
      this.dialogScrollY = 0;
      this.dialogMaxScroll = 0;
      this.dialogBodyBaseY = 0;
      this.dialogLayout = null;
      this.dialogDragPointerId = null;
      this.dialogScrollbar.setVisible(false);
      this.dialogScrollbar.clear();
      this.dialogMaskGraphics.clear();
      this.dialogScrollHitArea.setVisible(false);
      this.overlayBody.clearMask();
    }

    this.overlayShade.setVisible(visible);
    this.overlayPanel.setVisible(visible);
    this.turnDialogCard.setVisible(visible && isUnified);
    this.overlayTitle.setVisible(visible);
    this.overlayBody.setVisible(visible);
    this.overlayScoreboard.setVisible(visible && !isStart && !isUnified);
    this.overlayPrompt.setVisible(visible);
    this.dialogScrollHitArea.setVisible(visible && isUnified);
    this.helpHtmlPane?.setVisible(false);
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
    this.mobileWeaponButton.setVisible(!visible);
    if (this.isTouchDevice) {
      this.mobileHelpButton.setVisible(!isTurn);
    }

    if (!visible) {
      this.overlayShade.setAlpha(0);
      this.overlayContent.forEach((item) => item.setAlpha(0));
      this.turnDialogCard.clear();
      this.gameoverScrollbar.clear();
      this.dialogScrollbar.clear();
      this.startDeco.setAlpha(0);
      this.startOverlayContent.forEach((item) => item.setAlpha(0));
      this.helpLayout = null;
      this.turnLayout = null;
      this.helpHtmlPane?.setVisible(false);
      if (this.helpHtmlNode) {
        this.helpHtmlNode.scrollTop = 0;
      }

      // Restore HUD visibility
      this.panel.setVisible(true);
      this.hpBars.setVisible(true);
      this.leftText.setVisible(true);
      this.rightText.setVisible(true);
      this.centerText.setVisible(true);
      this.windText.setVisible(true);
      this.objectiveText.setVisible(true);
      this.controlsText.setVisible(true);
      this.refreshShortcutButtons();
      return;
    }

    // ── Populate text ──────────────────────────────────────────────────────────
    this.overlayTitle.setText(overlay.title ?? '');
    const unifiedBody = isUnified
      ? isHelp
        ? this.buildHelpFallbackText(overlay)
        : [overlay.body ?? '', isGameOver ? (overlay.scoreboard ?? '') : ''].filter(Boolean).join('\n\n')
      : overlay.body ?? '';
    this.overlayBody.setText(unifiedBody);
    this.overlayScoreboard.setText(isUnified ? '' : (overlay.scoreboard ?? ''));
    if (isHelp) {
      this.renderHelpHtmlContent(overlay);
      const hasHelpHtml = Boolean(this.helpHtmlNode?.innerHTML?.trim());
      this.helpHtmlPane?.setVisible(hasHelpHtml);
      this.overlayBody.setVisible(!hasHelpHtml);
    }
    this.overlayPrompt.setText(overlay.prompt ?? '');
    this.startKicker.setText(overlay.kicker ?? '');
    this.startTagline.setText(overlay.tagline ?? '');
    this.startKicker.setFontSize(`${startMetrics.kickerFontPx}px`);
    this.startTagline.setFontSize(`${startMetrics.taglineFontPx}px`);
    this.startModeCpuText.setFontSize(`${startMetrics.modeFontPx}px`);
    this.startModeLocalText.setFontSize(`${startMetrics.modeFontPx}px`);
    this.startBodyLabel.setFontSize(`${startMetrics.labelFontPx}px`);
    this.startScoreLabel.setFontSize(`${startMetrics.labelFontPx}px`);
    this.startScoreAmber.setFontSize(`${startMetrics.scoreFontPx}px`);
    this.startScoreCyan.setFontSize(`${startMetrics.scoreFontPx}px`);
    this.startHowToPlayText.setFontSize(`${startMetrics.linkFontPx}px`);
    this.startSwitchModeText.setFontSize(`${startMetrics.linkFontPx}px`);
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
    this.overlayTitle.setFontSize(
      overlay.type === 'start'
        ? `${startMetrics.titleFontPx}px`
        : isTurn
          ? (this.compactLayout ? '34px' : '38px')
          : isUnified
            ? (this.compactLayout ? '44px' : '52px')
            : '40px'
    );
    this.overlayTitle.setColor(overlay.type === 'start' ? '#f2b84b' : '#f4f1df');
    this.overlayPrompt.setColor(
      overlay.type === 'start'
        ? '#f4f1df'
        : '#f2b84b'
    );
    this.overlayPrompt.setFontSize(
      overlay.type === 'start'
        ? `${startMetrics.promptFontPx}px`
        : isTurn
          ? (this.compactLayout ? '30px' : '32px')
          : isUnified
            ? (this.compactLayout ? '18px' : '20px')
            : '20px'
    );
    this.overlayBody.setFontSize(
      isStart
        ? `${startMetrics.bodyFontPx}px`
        : isTurn
          ? (this.compactLayout ? '15px' : '16px')
          : '17px'
    );
    this.overlayBody.setLineSpacing(isStart ? startMetrics.bodyLineSpacing : isTurn ? 5 : 7);
    this.overlayBody.setColor('#f4f1df');
    this.overlayScoreboard.setColor('#7fe7dc');
    this.overlayBody.setFontFamily('"Trebuchet MS", "Verdana", sans-serif');
    this.overlayScoreboard.setFontFamily('"Trebuchet MS", "Verdana", sans-serif');
    this.overlayBody.setAlign('left');
    if (overlay.type === 'help') {
      this.overlayBody.setColor('#f7f3e6');
      this.overlayScoreboard.setColor('#94f3ec');
      this.overlayBody.setFontFamily('"Consolas", "Courier New", monospace');
      this.overlayScoreboard.setFontFamily('"Consolas", "Courier New", monospace');
    }
    this.overlayShade.setFillStyle(0x04070a, isStart ? 1 : isTurn ? 0.54 : 0.72);

    if (isStart) {
      // Hide game HUD elements while on the start screen
      this.panel.setVisible(false);
      this.hpBars.setVisible(false);
      this.phaseBadgeText.setVisible(false);
      this.leftText.setVisible(false);
      this.rightText.setVisible(false);
      this.centerText.setVisible(false);
      this.windText.setVisible(false);
      this.timerBar.setVisible(false);
      this.timerText.setVisible(false);
      this.hideObjectiveNotice(true);
      this.controlsText.setVisible(false);
    } else {
      // Restore HUD visibility for other overlays (like help or turn)
      this.panel.setVisible(true);
      this.hpBars.setVisible(true);
      this.phaseBadgeText.setVisible(true);
      this.leftText.setVisible(true);
      this.rightText.setVisible(true);
      this.centerText.setVisible(true);
      this.windText.setVisible(true);
      this.controlsText.setVisible(!isTurn);
    }
    if (isUnified) {
      // Unified turn/help/gameover dialogs render their own chrome layer.
      this.overlayPanel.setFillStyle(0x09131b, 0);
      this.overlayPanel.setStrokeStyle(0, 0xffffff, 0);
    } else {
      this.overlayPanel.setFillStyle(
        overlay.type === 'start' ? 0x071018 : 0x09131b,
        overlay.type === 'start' ? 0.98 : 0.96
      );
      this.overlayPanel.setStrokeStyle(2, 0xffffff, overlay.type === 'start' ? 0.1 : 0.14);
      this.turnDialogCard.clear();
    }

    // Reset all alphas for fade-in
    this.overlayShade.setAlpha(0);
    this.overlayPanel.setAlpha(0);
    this.turnDialogCard.setAlpha(0);
    this.overlayTitle.setAlpha(0);
    this.overlayBody.setAlpha(0);
    this.overlayScoreboard.setAlpha(0);
    this.overlayPrompt.setAlpha(0);
    this.startDeco.setAlpha(0);
    this.startOverlayContent.forEach((item) => { item.setAlpha(0); item.setScale(1); });

    // ── Panel size and positions ───────────────────────────────────────────────
    if (isStart) {
      this.overlayPanel.width = this.compactLayout ? 980 : 940;
      this.overlayPanel.height = startMetrics.panelHeight;
      this.overlayPanel.y = startMetrics.panelY;
    } else if (isUnified) {
      const layout = this.getUnifiedDialogLayout();
      this.overlayPanel.width = layout.panel.width;
      this.overlayPanel.height = layout.panel.height;
      this.overlayPanel.y = layout.panel.y;
    } else {
      this.overlayPanel.width = this.compactLayout ? 940 : 860;
      this.overlayPanel.height = this.compactLayout ? 560 : 520;
      this.overlayPanel.y = GAME_HEIGHT * 0.5 + 16;
    }

    if (isStart) {
      const startLayout = this.getStartOverlayLayout();

      // Title / kicker
      this.overlayTitle.y = startLayout.titleY;
      this.startKicker.y = startLayout.kickerY;
      this.startTagline.y = startLayout.taglineY;

      // Mode buttons
      this.startModeBacking.width = startLayout.modeBackingW;
      this.startModeBacking.height = startLayout.modeH;
      this.startModeBacking.y = startLayout.modeY;
      this.startModeCpuButton.width = startLayout.modeButtonW;
      this.startModeCpuButton.height = startLayout.modeButtonH;
      this.startModeCpuButton.x = GAME_WIDTH * 0.5 - startLayout.modeButtonOffsetX;
      this.startModeCpuButton.y = startLayout.modeY;
      this.startModeLocalButton.width = startLayout.modeButtonW;
      this.startModeLocalButton.height = startLayout.modeButtonH;
      this.startModeLocalButton.x = GAME_WIDTH * 0.5 + startLayout.modeButtonOffsetX;
      this.startModeLocalButton.y = startLayout.modeY;
      this.startModeCpuText.x = GAME_WIDTH * 0.5 - startLayout.modeButtonOffsetX;
      this.startModeCpuText.y = startLayout.modeY;
      this.startModeLocalText.x = GAME_WIDTH * 0.5 + startLayout.modeButtonOffsetX;
      this.startModeLocalText.y = startLayout.modeY;

      // Mission box text
      this.overlayBody.x = startLayout.contentX + startLayout.bodyInsetX;
      this.overlayBody.y = startLayout.contentY + startLayout.bodyInsetY;
      this.overlayBody.setWordWrapWidth(startLayout.missionW - startLayout.bodyInsetX * 2, true);

      // Score box labels
      this.startBodyLabel.x = startLayout.contentX + 12;
      this.startBodyLabel.y = startLayout.contentY + 9;
      this.startScoreLabel.x = startLayout.scoreX + 12;
      this.startScoreLabel.y = startLayout.contentY + 9;

      // Score cards
      this.startScoreAmberCard.width = Math.max(240, startLayout.scoreW - 24);
      this.startScoreAmberCard.height = startLayout.scoreCardH;
      this.startScoreCyanCard.width = Math.max(240, startLayout.scoreW - 24);
      this.startScoreCyanCard.height = startLayout.scoreCardH;
      this.startScoreAmberCard.x = startLayout.scoreCenterX;
      this.startScoreAmberCard.y = startLayout.scoreFirstY;
      this.startScoreCyanCard.x = startLayout.scoreCenterX;
      this.startScoreCyanCard.y = startLayout.scoreSecondY;
      this.startScoreAmber.x = startLayout.scoreCenterX;
      this.startScoreAmber.y = startLayout.scoreFirstY;
      this.startScoreCyan.x = startLayout.scoreCenterX;
      this.startScoreCyan.y = startLayout.scoreSecondY;

      // Action bar
      this.startActionBacking.width = startLayout.contentW;
      this.startActionBacking.height = startLayout.actionH;
      this.startActionBacking.x = GAME_WIDTH * 0.5;
      this.startActionBacking.y = startLayout.actionY;
      this.overlayPrompt.y = startLayout.actionY;
      this.overlayPrompt.setWordWrapWidth(startLayout.contentW - 24, true);

      // "How to Play" and "Switch Mode" links below action bar
      this.startHowToPlayText.x = GAME_WIDTH * 0.5 - startLayout.linkOffsetX;
      this.startHowToPlayText.y = startLayout.linksY;
      this.startSwitchModeText.x = GAME_WIDTH * 0.5 + startLayout.linkOffsetX;
      this.startSwitchModeText.y = startLayout.linksY;

      this.drawStartDecor(startLayout);
    } else if (isUnified) {
      this.layoutUnifiedDialog(true);
    } else {
      this.overlayTitle.y = GAME_HEIGHT * 0.5 - 188;
      this.overlayBody.x = GAME_WIDTH * 0.5 - 360;
      this.overlayBody.y = GAME_HEIGHT * 0.5 - 128;
      this.overlayBody.setWordWrapWidth(this.compactLayout ? 470 : 420, true);
      this.overlayPrompt.y = GAME_HEIGHT * 0.5 + 214;
    }

    // ── Fade-in animations ─────────────────────────────────────────────────────
    this.tweens.add({ targets: this.overlayShade, alpha: 1, duration: 180, ease: 'Quad.Out' });
    this.tweens.add(
      isStart
        ? { targets: this.overlayContent, alpha: 1, duration: 220, ease: 'Cubic.Out', stagger: 20 }
        : isUnified
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
    this.refreshShortcutButtons();
  }

  // ── Timer bars ────────────────────────────────────────────────────────────────
  updateTimer(timerState, legacyTotal) {
    this.hudLayout = this.hudLayout ?? this.computeHudLayout();
    const h = this.hudLayout;
    this.timerBar.clear();

    // Backward-compatible fallback for legacy payload shape.
    if (typeof timerState === 'number') {
      const remaining = timerState;
      const total = legacyTotal ?? 1;
      if (remaining >= total) {
        this.timerText.setText('');
        return;
      }
      const ratio = Phaser.Math.Clamp(remaining / Math.max(1, total), 0, 1);
      const barWidth = this.compactLayout ? 96 : 114;
      const barX = h.centerX - barWidth * 0.5;
      const barY = h.moveTimerBarY;
      const urgent = remaining <= 5;
      const color = urgent ? 0xff4444 : remaining <= 10 ? 0xf2b84b : 0x7fe7dc;

      this.timerBar.fillStyle(0x08121a, 0.72);
      this.timerBar.fillRoundedRect(barX - 2, barY - 2, barWidth + 4, 10, 4);
      this.timerBar.fillStyle(color, urgent ? (Math.floor(this.game.loop.frame / 8) % 2 === 0 ? 0.95 : 0.5) : 0.86);
      this.timerBar.fillRoundedRect(barX, barY, Math.round(barWidth * ratio), 6, 3);
      this.timerText.setText(`${Math.ceil(remaining)}s`);
      this.timerText.setColor(urgent ? '#ff6666' : '#f4f1df');
      this.timerText.setY(h.timerTextY);
      return;
    }

    if (!timerState) {
      this.timerText.setText('');
      return;
    }

    const move = timerState.move ?? { remaining: 0, total: 1 };
    const aim = timerState.aim ?? { remaining: 0, total: 1 };
    const activePhase = timerState.phase === 'aim' ? 'aim' : 'move';
    const barWidth = this.compactLayout ? 112 : 130;
    const barX = h.centerX - barWidth * 0.5;
    const frameParity = Math.floor(this.game.loop.frame / 8) % 2 === 0;

    const drawPhaseBar = (remainingRaw, totalRaw, y, baseColor, isActive) => {
      const total = Math.max(1, totalRaw ?? 1);
      const remaining = Phaser.Math.Clamp(remainingRaw ?? 0, 0, total);
      const ratio = Phaser.Math.Clamp(remaining / total, 0, 1);
      const urgent = remaining <= Math.max(2, total * 0.2);
      const fillAlpha = isActive && urgent
        ? (frameParity ? 0.95 : 0.5)
        : isActive
          ? 0.92
          : 0.56;

      this.timerBar.fillStyle(0x08121a, isActive ? 0.74 : 0.56);
      this.timerBar.fillRoundedRect(barX - 2, y - 2, barWidth + 4, 10, 4);
      this.timerBar.fillStyle(baseColor, fillAlpha);
      this.timerBar.fillRoundedRect(barX, y, Math.round(barWidth * ratio), 6, 3);
    };

    drawPhaseBar(move.remaining, move.total, h.moveTimerBarY, 0x7fe7dc, activePhase === 'move');
    drawPhaseBar(aim.remaining, aim.total, h.aimTimerBarY, 0xf2b84b, activePhase === 'aim');

    this.timerText.setText(`MOVE ${Math.ceil(move.remaining ?? 0)}s  |  AIM ${Math.ceil(aim.remaining ?? 0)}s`);
    this.timerText.setColor(activePhase === 'aim' ? '#f2b84b' : '#7fe7dc');
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
