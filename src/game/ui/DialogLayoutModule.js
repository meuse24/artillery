import { GAME_HEIGHT, GAME_WIDTH } from '../constants.js';

export class DialogLayoutModule {
  constructor({ widthRatio = 0.8, heightRatio = 0.8 } = {}) {
    this.widthRatio = widthRatio;
    this.heightRatio = heightRatio;
  }

  compute({ compact = false } = {}) {
    const panelWidth = Math.round(GAME_WIDTH * (compact ? 0.88 : this.widthRatio));
    const panelHeight = Math.round(GAME_HEIGHT * (compact ? 0.84 : this.heightRatio));
    const panelX = GAME_WIDTH * 0.5;
    const panelY = GAME_HEIGHT * 0.5;
    const left = panelX - panelWidth * 0.5;
    const top = panelY - panelHeight * 0.5;
    const headerHeight = Math.max(84, Math.round(panelHeight * 0.18));
    const footerHeight = Math.max(72, Math.round(panelHeight * 0.15));
    const contentPad = compact ? 20 : 26;
    const scrollbarWidth = 6;
    const scrollbarGap = 10;
    const textX = left + contentPad;
    const textY = top + headerHeight + contentPad;
    const textWidth = Math.max(180, panelWidth - contentPad * 2 - scrollbarGap - scrollbarWidth);
    const textHeight = Math.max(96, panelHeight - headerHeight - footerHeight - contentPad * 2);
    const promptY = top + panelHeight - Math.round(footerHeight * 0.52);

    return {
      panel: {
        x: panelX,
        y: panelY,
        width: panelWidth,
        height: panelHeight,
        left,
        top
      },
      header: {
        height: headerHeight,
        titleY: top + Math.round(headerHeight * 0.5)
      },
      footer: {
        height: footerHeight,
        promptY
      },
      text: {
        x: textX,
        y: textY,
        width: textWidth,
        height: textHeight
      },
      scrollbar: {
        x: textX + textWidth + scrollbarGap,
        y: textY,
        width: scrollbarWidth,
        height: textHeight
      }
    };
  }
}
