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
    this.overlayContent = [
      this.overlayPanel,
      this.overlayTitle,
      this.overlayBody,
      this.overlayScoreboard,
      this.overlayPrompt
    ];

    const game = this.scene.get('game');
    game.events.on('hud:update', this.updateHud, this);
    game.events.on('turn:banner', this.showBanner, this);
    game.events.on('overlay:update', this.updateOverlay, this);

    if (typeof game.getHudState === 'function') {
      this.updateHud(game.getHudState());
    }
    if (game.overlayState) {
      this.updateOverlay(game.overlayState);
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
    this.overlayTitle.setFontSize(this.compactLayout ? '34px' : this.overlayTitle.style.fontSize);
    this.drawFrame();
    this.drawHpBars(this.displayHp[0], this.displayHp[1]);
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
    this.tweens.killTweensOf([this.overlayShade, ...this.overlayContent]);
    this.overlayShade.setVisible(visible);
    this.overlayPanel.setVisible(visible);
    this.overlayTitle.setVisible(visible);
    this.overlayBody.setVisible(visible);
    this.overlayScoreboard.setVisible(visible);
    this.overlayPrompt.setVisible(visible);

    if (!visible) {
      this.overlayShade.setAlpha(0);
      this.overlayContent.forEach((item) => {
        item.setAlpha(0);
        item.y += 0;
      });
      return;
    }

    this.overlayTitle.setText(overlay.title ?? '');
    this.overlayBody.setText(overlay.body ?? '');
    this.overlayScoreboard.setText(overlay.scoreboard ?? '');
    this.overlayPrompt.setText(overlay.prompt ?? '');
    this.overlayTitle.setScale(1);
    this.overlayPrompt.setAlpha(1);
    this.overlayTitle.setFontSize(overlay.type === 'start' ? '62px' : '40px');
    this.overlayTitle.setColor(overlay.type === 'start' ? '#f2b84b' : '#f4f1df');
    this.overlayPrompt.setColor(overlay.type === 'start' ? '#7fe7dc' : '#f2b84b');

    this.overlayShade.setAlpha(0);
    this.overlayPanel.setAlpha(0);
    this.overlayTitle.setAlpha(0);
    this.overlayBody.setAlpha(0);
    this.overlayScoreboard.setAlpha(0);
    this.overlayPrompt.setAlpha(0);

    this.overlayPanel.y = GAME_HEIGHT * 0.5 + 16;
    this.overlayTitle.y = GAME_HEIGHT * 0.5 - 188;
    this.overlayBody.y = GAME_HEIGHT * 0.5 - 128;
    this.overlayScoreboard.y = GAME_HEIGHT * 0.5 - 128;
    this.overlayPrompt.y = GAME_HEIGHT * 0.5 + 214;

    this.tweens.add({
      targets: this.overlayShade,
      alpha: 1,
      duration: 180,
      ease: 'Quad.Out'
    });
    this.tweens.add({
      targets: this.overlayContent,
      alpha: 1,
      y: '-=16',
      duration: 220,
      ease: 'Cubic.Out',
      stagger: 20
    });

    if (overlay.type === 'start') {
      this.tweens.add({
        targets: this.overlayTitle,
        scale: 1.04,
        yoyo: true,
        repeat: -1,
        duration: 1600,
        ease: 'Sine.InOut'
      });
      this.tweens.add({
        targets: this.overlayPrompt,
        alpha: 0.45,
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
