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
    this.panel = this.add.graphics().setDepth(100);
    this.hpBars = this.add.graphics().setDepth(101);
    this.bannerBacking = this.add.rectangle(GAME_WIDTH * 0.5, 108, 320, 56, 0x09131b, 0.82).setDepth(101);
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
        fontSize: '20px',
        color: '#f4f1df',
        lineSpacing: 5
      })
      .setDepth(102);

    this.rightText = this.add
      .text(GAME_WIDTH - 28, 24, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '20px',
        color: '#f4f1df',
        align: 'right',
        lineSpacing: 5
      })
      .setOrigin(1, 0)
      .setDepth(102);

    this.centerText = this.add
      .text(GAME_WIDTH * 0.5, 28, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '18px',
        color: '#d7e9aa',
        align: 'center'
      })
      .setOrigin(0.5, 0)
      .setDepth(102);

    this.windText = this.add
      .text(GAME_WIDTH * 0.5, 52, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '16px',
        color: '#f4f1df',
        align: 'center'
      })
      .setOrigin(0.5, 0)
      .setDepth(102);

    this.objectiveText = this.add
      .text(GAME_WIDTH * 0.5, 118, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '15px',
        color: '#d7e9aa',
        align: 'center'
      })
      .setOrigin(0.5, 0)
      .setDepth(102);

    this.controlsText = this.add
      .text(
        GAME_WIDTH * 0.5,
        GAME_HEIGHT - 28,
        'Move Left/Right  |  Aim Up/Down  |  A/D or J/L Power  |  Q/E Weapon  |  Space Fire  |  R Restart',
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
    this.overlayTitle = this.add
      .text(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5 - 196, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '40px',
        fontStyle: 'bold',
        color: '#f4f1df',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(122)
      .setVisible(false);
    this.overlayBody = this.add
      .text(GAME_WIDTH * 0.5 - 360, GAME_HEIGHT * 0.5 - 136, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '19px',
        color: '#f4f1df',
        lineSpacing: 6,
        wordWrap: { width: 420 }
      })
      .setDepth(122)
      .setVisible(false);
    this.overlayScoreboard = this.add
      .text(GAME_WIDTH * 0.5 + 110, GAME_HEIGHT * 0.5 - 136, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '18px',
        color: '#7fe7dc',
        lineSpacing: 6,
        wordWrap: { width: 270 }
      })
      .setDepth(122)
      .setVisible(false);
    this.overlayPrompt = this.add
      .text(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5 + 204, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '20px',
        color: '#f2b84b',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(122)
      .setVisible(false);
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
    this.startHint = this.add
      .text(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5 + 240, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '15px',
        color: '#b6c7c3',
        align: 'center'
      })
      .setOrigin(0.5)
      .setDepth(122)
      .setVisible(false);
    this.startBodyLabel = this.add
      .text(0, 0, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#7fe7dc'
      })
      .setDepth(123)
      .setVisible(false);
    this.startScoreLabel = this.add
      .text(0, 0, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#f2b84b'
      })
      .setDepth(123)
      .setVisible(false);
    this.startScoreAmberCard = this.add
      .rectangle(0, 0, 182, 56, PLAYER_COLORS[0], 0.12)
      .setStrokeStyle(2, PLAYER_COLORS[0], 0.28)
      .setDepth(123)
      .setVisible(false);
    this.startScoreCyanCard = this.add
      .rectangle(0, 0, 182, 56, PLAYER_COLORS[1], 0.12)
      .setStrokeStyle(2, PLAYER_COLORS[1], 0.28)
      .setDepth(123)
      .setVisible(false);
    this.startScoreAmber = this.add
      .text(0, 0, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#ffd995'
      })
      .setDepth(124)
      .setVisible(false);
    this.startScoreCyan = this.add
      .text(0, 0, '', {
        fontFamily: '"Trebuchet MS", "Verdana", sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#9bf7ef'
      })
      .setDepth(124)
      .setVisible(false);
    this.startActionBacking = this.add
      .rectangle(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.5 + 194, 388, 54, 0xf2b84b, 0.16)
      .setStrokeStyle(2, 0xf2b84b, 0.42)
      .setDepth(122)
      .setVisible(false);
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
      this.startHint,
      this.startBodyLabel,
      this.startScoreLabel,
      this.startScoreAmberCard,
      this.startScoreCyanCard,
      this.startScoreAmber,
      this.startScoreCyan,
      this.startActionBacking
    ];

    this.gameScene = this.scene.get('game');
    this.gameScene.events.on('hud:update', this.updateHud, this);
    this.gameScene.events.on('turn:banner', this.showBanner, this);
    this.gameScene.events.on('overlay:update', this.updateOverlay, this);

    [this.startModeCpuButton, this.startModeCpuText].forEach((item) => {
      item.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.setStartMode('cpu'));
    });
    [this.startModeLocalButton, this.startModeLocalText].forEach((item) => {
      item.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.setStartMode('local'));
    });
    [this.startActionBacking, this.overlayPrompt].forEach((item) => {
      item.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.startFromOverlay());
    });

    if (typeof this.gameScene.getHudState === 'function') {
      this.updateHud(this.gameScene.getHudState());
    }
    if (this.gameScene.overlayState) {
      this.updateOverlay(this.gameScene.overlayState);
    }

    this.drawFrame();
    this.applyResponsiveLayout();
    this.scale.on('resize', this.applyResponsiveLayout, this);
  }

  drawFrame() {
    this.panel.clear();
    this.panel.fillStyle(0x09131b, 0.55);
    this.panel.fillRoundedRect(16, 16, GAME_WIDTH - 32, 84, 18);
    this.panel.lineStyle(2, 0xffffff, 0.08);
    this.panel.strokeRoundedRect(16, 16, GAME_WIDTH - 32, 84, 18);
  }

  setStartMode(mode) {
    if (!this.gameScene || this.gameScene.overlayState?.type !== 'start') {
      return;
    }

    this.gameScene.setMode(mode);
    this.gameScene.showStartOverlay();
    this.gameScene.syncHud();
  }

  startFromOverlay() {
    if (!this.gameScene || this.gameScene.overlayState?.type !== 'start') {
      return;
    }

    this.gameScene.clearOverlay();
    this.gameScene.presentTurnOverlay();
    this.gameScene.syncHud();
  }

  drawHpBars(left, right) {
    this.hpBars.clear();

    const bars = [
      { x: 28, y: 92, width: this.compactLayout ? 180 : 220, value: left, color: PLAYER_COLORS[0] },
      { x: GAME_WIDTH - (this.compactLayout ? 208 : 248), y: 92, width: this.compactLayout ? 180 : 220, value: right, color: PLAYER_COLORS[1] }
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

    this.leftText.setFontSize(this.compactLayout ? '18px' : '20px');
    this.rightText.setFontSize(this.compactLayout ? '18px' : '20px');
    this.centerText.setFontSize(this.compactLayout ? '16px' : '18px');
    this.windText.setFontSize(this.compactLayout ? '14px' : '16px');
    this.objectiveText.setFontSize(this.compactLayout ? '13px' : '15px');
    this.controlsText.setFontSize(this.compactLayout ? '14px' : '16px');
    this.controlsText.setWordWrapWidth(this.compactLayout ? 860 : 1120, true);
    this.overlayPanel.width = this.compactLayout ? 940 : 860;
    this.overlayPanel.height = this.compactLayout ? 560 : 520;
    this.overlayBody.setWordWrapWidth(this.compactLayout ? 470 : 420, true);
    this.overlayScoreboard.setWordWrapWidth(this.compactLayout ? 310 : 270, true);
    this.startTagline.setFontSize(this.compactLayout ? '21px' : '24px');
    this.startHint.setFontSize(this.compactLayout ? '14px' : '15px');
    this.startModeCpuText.setFontSize(this.compactLayout ? '14px' : '15px');
    this.startModeLocalText.setFontSize(this.compactLayout ? '14px' : '15px');
    this.startBodyLabel.setFontSize(this.compactLayout ? '13px' : '14px');
    this.startScoreLabel.setFontSize(this.compactLayout ? '13px' : '14px');
    this.startScoreAmber.setFontSize(this.compactLayout ? '17px' : '18px');
    this.startScoreCyan.setFontSize(this.compactLayout ? '17px' : '18px');
    this.overlayTitle.setFontSize(this.compactLayout ? '34px' : this.overlayTitle.style.fontSize);
    this.drawFrame();
    this.drawHpBars(this.displayHp[0], this.displayHp[1]);
  }

  drawStartDecor() {
    this.startDeco.clear();

    const panelWidth = this.overlayPanel.width;
    const panelHeight = this.overlayPanel.height;
    const panelX = this.overlayPanel.x;
    const panelY = this.overlayPanel.y;
    const left = panelX - panelWidth * 0.5;
    const top = panelY - panelHeight * 0.5;

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

    this.startDeco.lineStyle(3, 0xf2b84b, 0.22);
    this.startDeco.beginPath();
    this.startDeco.moveTo(left + 34, top + 50);
    this.startDeco.lineTo(left + 180, top + 50);
    this.startDeco.lineTo(left + 206, top + 76);
    this.startDeco.lineTo(left + 320, top + 76);
    this.startDeco.strokePath();

    this.startDeco.lineStyle(3, 0x7fe7dc, 0.2);
    this.startDeco.beginPath();
    this.startDeco.moveTo(left + panelWidth - 34, top + panelHeight - 52);
    this.startDeco.lineTo(left + panelWidth - 188, top + panelHeight - 52);
    this.startDeco.lineTo(left + panelWidth - 214, top + panelHeight - 78);
    this.startDeco.lineTo(left + panelWidth - 338, top + panelHeight - 78);
    this.startDeco.strokePath();

    this.startDeco.fillStyle(0x08141d, 0.94);
    this.startDeco.fillRoundedRect(panelX - 336, panelY + 2, 454, 158, 18);
    this.startDeco.fillStyle(0x0d1d27, 0.96);
    this.startDeco.fillRoundedRect(panelX + 138, panelY + 2, 198, 158, 18);
    this.startDeco.fillStyle(0x071018, 0.98);
    this.startDeco.fillRoundedRect(panelX - 336, panelY + 180, 672, 62, 18);

    this.startDeco.fillStyle(0x103040, 0.65);
    this.startDeco.fillRoundedRect(panelX - 336, panelY + 2, 454, 34, 18);
    this.startDeco.fillStyle(0x3a2a0f, 0.62);
    this.startDeco.fillRoundedRect(panelX + 138, panelY + 2, 198, 34, 18);

    this.startDeco.lineStyle(2, 0x7fe7dc, 0.16);
    this.startDeco.strokeRoundedRect(panelX - 336, panelY + 2, 454, 158, 18);
    this.startDeco.lineStyle(2, 0xf2b84b, 0.16);
    this.startDeco.strokeRoundedRect(panelX + 138, panelY + 2, 198, 158, 18);
    this.startDeco.lineStyle(2, 0xffffff, 0.08);
    this.startDeco.strokeRoundedRect(panelX - 336, panelY + 180, 672, 62, 18);
  }

  updateHud(state) {
    if (!state) {
      return;
    }

    const left = state.players[0];
    const right = state.players[1];
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
      if (this.hpTargets[index] === hp) {
        return;
      }

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

    this.leftText.setText(
      `${left.name}\nHP ${left.hp}   Wins ${left.wins}\nWeapon ${left.weapon}`
    );
    this.rightText.setText(
      `${right.name}\nHP ${right.hp}   Wins ${right.wins}\nWeapon ${right.weapon}`
    );
    this.centerText.setColor(`rgb(${red}, ${green}, ${blue})`);
    this.windText.setColor(windColor);
    this.objectiveText.setText(`Goal: ${state.objective}`);
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

    this.centerText.setText(
      state.gameOver
        ? state.winner
          ? `${state.winner} wins  |  Press R for a new map`
          : 'Draw  |  Press R for a new map'
        : `${state.mode}  |  ${state.activePlayerName} ${state.phase.toUpperCase()}  |  Power ${state.players[state.activePlayerIndex].power}  |  Move ${state.remainingMove.toFixed(0)}`
    );
    this.controlsText.setText(
      state.gameOver
        ? 'Press R to restart on a fresh map  |  H Help'
        : state.phase === 'move'
          ? 'Move Phase: Left/Right move  |  Space end movement early  |  H Help  |  R Restart'
          : 'Aim Phase: Up/Down aim  |  A/D or J/L Power  |  Q/E Weapon  |  Space Fire  |  H Help  |  R Restart'
    );
  }

  updateOverlay(overlay) {
    const visible = Boolean(overlay);
    const isStart = Boolean(overlay && overlay.type === 'start');
    this.tweens.killTweensOf([this.overlayShade, ...this.overlayContent]);
    this.tweens.killTweensOf(this.startOverlayContent);
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
    this.startHint.setVisible(isStart);
    this.startBodyLabel.setVisible(isStart);
    this.startScoreLabel.setVisible(isStart);
    this.startScoreAmberCard.setVisible(isStart);
    this.startScoreCyanCard.setVisible(isStart);
    this.startScoreAmber.setVisible(isStart);
    this.startScoreCyan.setVisible(isStart);
    this.startActionBacking.setVisible(isStart);

    if (!visible) {
      this.overlayShade.setAlpha(0);
      this.overlayContent.forEach((item) => {
        item.setAlpha(0);
        item.y += 0;
      });
      this.startDeco.setAlpha(0);
      this.startOverlayContent.forEach((item) => {
        item.setAlpha(0);
      });
      return;
    }

    this.overlayTitle.setText(overlay.title ?? '');
    this.overlayBody.setText(overlay.body ?? '');
    this.overlayScoreboard.setText(overlay.scoreboard ?? '');
    this.overlayPrompt.setText(overlay.prompt ?? '');
    this.startKicker.setText(overlay.kicker ?? '');
    this.startTagline.setText(overlay.tagline ?? '');
    this.startHint.setText(overlay.hint ?? '');
    this.startBodyLabel.setText('Mission');
    this.startScoreLabel.setText('Highscore');
    const scoreEntries = overlay.scores ?? [];
    this.startScoreAmber.setText(`${scoreEntries[0]?.name ?? 'Amber'}  ${scoreEntries[0]?.wins ?? 0} wins`);
    this.startScoreCyan.setText(`${scoreEntries[1]?.name ?? 'Cyan'}  ${scoreEntries[1]?.wins ?? 0} wins`);
    const cpuActive = overlay.modeKey === 'cpu';
    this.startModeCpuButton.setFillStyle(cpuActive ? 0x154458 : 0x112531, cpuActive ? 1 : 0.96);
    this.startModeCpuButton.setStrokeStyle(2, 0x7fe7dc, cpuActive ? 0.46 : 0.16);
    this.startModeLocalButton.setFillStyle(cpuActive ? 0x1b2230 : 0x43331a, cpuActive ? 0.96 : 1);
    this.startModeLocalButton.setStrokeStyle(2, 0xf2b84b, cpuActive ? 0.14 : 0.42);
    this.startModeCpuText.setAlpha(cpuActive ? 1 : 0.72);
    this.startModeLocalText.setAlpha(cpuActive ? 0.72 : 1);
    this.overlayTitle.setScale(1);
    this.overlayPrompt.setAlpha(1);
    this.overlayTitle.setFontSize(overlay.type === 'start' ? '78px' : '40px');
    this.overlayTitle.setColor(overlay.type === 'start' ? '#f2b84b' : '#f4f1df');
    this.overlayPrompt.setColor(overlay.type === 'start' ? '#f4f1df' : '#f2b84b');
    this.overlayPrompt.setFontSize(overlay.type === 'start' ? '26px' : '20px');
    this.overlayBody.setColor(overlay.type === 'start' ? '#f4f1df' : '#f4f1df');
    this.overlayScoreboard.setColor(overlay.type === 'start' ? '#e7f3ef' : '#7fe7dc');
    this.overlayBody.setFontSize(overlay.type === 'start' ? '23px' : '19px');
    this.overlayScoreboard.setFontSize(overlay.type === 'start' ? '18px' : '18px');
    this.overlayPanel.setFillStyle(overlay.type === 'start' ? 0x071018 : 0x09131b, overlay.type === 'start' ? 0.98 : 0.96);
    this.overlayPanel.setStrokeStyle(2, 0xffffff, overlay.type === 'start' ? 0.1 : 0.14);

    this.overlayShade.setAlpha(0);
    this.overlayPanel.setAlpha(0);
    this.overlayTitle.setAlpha(0);
    this.overlayBody.setAlpha(0);
    this.overlayScoreboard.setAlpha(0);
    this.overlayPrompt.setAlpha(0);
    this.startDeco.setAlpha(0);
    this.startOverlayContent.forEach((item) => {
      item.setAlpha(0);
      item.setScale(1);
    });

    this.overlayPanel.width = isStart ? (this.compactLayout ? 960 : 900) : this.compactLayout ? 940 : 860;
    this.overlayPanel.height = isStart ? (this.compactLayout ? 548 : 512) : this.compactLayout ? 560 : 520;
    this.overlayPanel.y = GAME_HEIGHT * 0.5 + 16;
    this.startDeco.setPosition(0, 0);

    if (isStart) {
      this.overlayTitle.y = GAME_HEIGHT * 0.5 - 164;
      this.overlayBody.x = GAME_WIDTH * 0.5 - 312;
      this.overlayBody.y = this.overlayPanel.y + 42;
      this.overlayBody.setWordWrapWidth(this.compactLayout ? 392 : 408, true);
      this.overlayScoreboard.x = GAME_WIDTH * 0.5 + 156;
      this.overlayScoreboard.y = this.overlayPanel.y + 42;
      this.overlayScoreboard.setWordWrapWidth(164, true);
      this.overlayPrompt.y = this.overlayPanel.y + 202;
      this.startKicker.y = GAME_HEIGHT * 0.5 - 226;
      this.startTagline.y = GAME_HEIGHT * 0.5 - 94;
      this.startModeBacking.y = GAME_HEIGHT * 0.5 - 52;
      this.startModeCpuButton.x = GAME_WIDTH * 0.5 - 82;
      this.startModeCpuButton.y = GAME_HEIGHT * 0.5 - 52;
      this.startModeLocalButton.x = GAME_WIDTH * 0.5 + 82;
      this.startModeLocalButton.y = GAME_HEIGHT * 0.5 - 52;
      this.startModeCpuText.x = GAME_WIDTH * 0.5 - 82;
      this.startModeCpuText.y = GAME_HEIGHT * 0.5 - 52;
      this.startModeLocalText.x = GAME_WIDTH * 0.5 + 82;
      this.startModeLocalText.y = GAME_HEIGHT * 0.5 - 52;
      this.startHint.y = this.overlayPanel.y + 226;
      this.startBodyLabel.x = GAME_WIDTH * 0.5 - 312;
      this.startBodyLabel.y = this.overlayPanel.y + 12;
      this.startScoreLabel.x = GAME_WIDTH * 0.5 + 156;
      this.startScoreLabel.y = this.overlayPanel.y + 12;
      this.startScoreAmberCard.x = GAME_WIDTH * 0.5 + 156;
      this.startScoreAmberCard.y = this.overlayPanel.y + 58;
      this.startScoreCyanCard.x = GAME_WIDTH * 0.5 + 156;
      this.startScoreCyanCard.y = this.overlayPanel.y + 122;
      this.startScoreAmber.x = GAME_WIDTH * 0.5 + 106;
      this.startScoreAmber.y = this.overlayPanel.y + 46;
      this.startScoreCyan.x = GAME_WIDTH * 0.5 + 106;
      this.startScoreCyan.y = this.overlayPanel.y + 110;
      this.startActionBacking.y = this.overlayPanel.y + 202;
      this.drawStartDecor();
    } else {
      this.overlayTitle.y = GAME_HEIGHT * 0.5 - 188;
      this.overlayBody.x = GAME_WIDTH * 0.5 - 360;
      this.overlayBody.y = GAME_HEIGHT * 0.5 - 128;
      this.overlayBody.setWordWrapWidth(this.compactLayout ? 470 : 420, true);
      this.overlayScoreboard.x = GAME_WIDTH * 0.5 + 110;
      this.overlayScoreboard.y = GAME_HEIGHT * 0.5 - 128;
      this.overlayScoreboard.setWordWrapWidth(this.compactLayout ? 310 : 270, true);
      this.overlayPrompt.y = GAME_HEIGHT * 0.5 + 214;
    }

    this.tweens.add({
      targets: this.overlayShade,
      alpha: 1,
      duration: 180,
      ease: 'Quad.Out'
    });
    this.tweens.add(
      isStart
        ? {
            targets: this.overlayContent,
            alpha: 1,
            duration: 220,
            ease: 'Cubic.Out',
            stagger: 20
          }
        : {
            targets: this.overlayContent,
            alpha: 1,
            y: '-=16',
            duration: 220,
            ease: 'Cubic.Out',
            stagger: 20
          }
    );
    if (isStart) {
      this.tweens.add({
        targets: this.startDeco,
        alpha: 1,
        duration: 240,
        ease: 'Cubic.Out'
      });
      this.tweens.add({
        targets: this.startOverlayContent,
        alpha: 1,
        duration: 240,
        ease: 'Cubic.Out',
        stagger: 18
      });
    }

    if (overlay.type === 'start') {
      this.tweens.add({
        targets: this.overlayTitle,
        scale: 1.03,
        yoyo: true,
        repeat: -1,
        duration: 1800,
        ease: 'Sine.InOut'
      });
      this.tweens.add({
        targets: this.overlayPrompt,
        alpha: 0.5,
        yoyo: true,
        repeat: -1,
        duration: 1000,
        ease: 'Sine.InOut'
      });
      this.tweens.add({
        targets: this.startTagline,
        alpha: 0.72,
        yoyo: true,
        repeat: -1,
        duration: 1800,
        ease: 'Sine.InOut'
      });
      this.tweens.add({
        targets: this.startModeBacking,
        scaleX: 1.02,
        scaleY: 1.02,
        yoyo: true,
        repeat: -1,
        duration: 1400,
        ease: 'Sine.InOut'
      });
      this.tweens.add({
        targets: this.startActionBacking,
        alpha: 0.34,
        yoyo: true,
        repeat: -1,
        duration: 920,
        ease: 'Sine.InOut'
      });
    }
  }

  showBanner(text) {
    this.bannerText.setText(text);
    this.bannerText.setAlpha(1);
    this.bannerText.setScale(0.92);
    this.tweens.killTweensOf(this.bannerText);
    this.tweens.killTweensOf(this.bannerBacking);
    this.tweens.add({
      targets: this.bannerText,
      scale: 1,
      duration: 180,
      ease: 'Back.Out'
    });
    this.tweens.add({
      targets: [this.bannerText, this.bannerBacking],
      alpha: { from: 1, to: 0 },
      duration: 900,
      ease: 'Cubic.Out'
    });
    this.bannerBacking.setAlpha(0.82);
  }
}
