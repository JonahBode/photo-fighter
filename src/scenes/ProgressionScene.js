/**
 * ProgressionScene.js
 * Shown after each battle.
 * Displays the match result, newly unlocked cards, and stats.
 */

import ProgressionManager from '../systems/ProgressionManager.js';
import { MOBILE } from '../utils/MobileLayout.js';

export default class ProgressionScene extends Phaser.Scene { // eslint-disable-line no-undef
  constructor() {
    super({ key: 'ProgressionScene' });
  }

  init(data) {
    this._outcome = data.outcome || 'loss';
    this._newCards = data.newCards || [];
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const progression = new ProgressionManager();
    const stats = progression.getStats();

    this.add.rectangle(cx, height / 2, width, height, 0x0f0f23);

    const isWin = this._outcome === 'win';
    this.add
      .text(cx, 70, isWin ? 'VICTORY!' : 'DEFEAT', {
        fontSize: '42px',
        fontFamily: 'Arial Black, sans-serif',
        color: isWin ? '#f0a500' : '#ff4444',
        stroke: '#000',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    const statsLines = [
      `Wins: ${stats.wins}   Losses: ${stats.losses}`,
      `Win Streak: ${stats.winStreak}`,
      `Matches Played: ${stats.totalMatches}`,
      `Highest Tier: ${stats.highestTierReached}`,
    ];

    statsLines.forEach((line, i) => {
      this.add
        .text(cx, 132 + i * 30, line, {
          fontSize: '18px',
          fontFamily: 'Arial, sans-serif',
          color: '#cccccc',
        })
        .setOrigin(0.5);
    });

    this.add
      .text(cx, 272, 'Unlocked Cards', {
        fontSize: '24px',
        fontFamily: 'Arial Black, sans-serif',
        color: '#44ff88',
      })
      .setOrigin(0.5);

    if (this._newCards.length === 0) {
      this.add
        .text(cx, 320, isWin ? 'No unlocks this match.' : 'Consolation reward after 3 losses.', {
          fontSize: MOBILE.bodyFontSize,
          fontFamily: 'Arial, sans-serif',
          color: '#888888',
          align: 'center',
        })
        .setOrigin(0.5);
    } else {
      this._newCards.slice(0, 3).forEach((card, i) => this._renderUnlockCard(card, 320 + i * 92));
    }

    this._makeButton(cx, height - 108, 'Play Again', () => this.scene.start('BattleScene'));
    this._makeButton(cx, height - 44, 'Main Menu', () => this.scene.start('MainMenuScene'));
  }

  _renderUnlockCard(card, y) {
    const cx = this.scale.width / 2;
    this.add.rectangle(cx, y, 340, 80, 0x1a2a4e).setStrokeStyle(2, 0x44ff88);

    this.add
      .text(cx - 160, y, card.name, {
        fontSize: MOBILE.bodyFontSize,
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        wordWrap: { width: 170 },
      })
      .setOrigin(0, 0.5);

    this.add
      .text(cx + 160, y - 10, `Tier ${card.tier}`, {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#aaaaaa',
      })
      .setOrigin(1, 0.5);

    this.add
      .text(cx + 160, y + 14, card.category, {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#aaaaaa',
      })
      .setOrigin(1, 0.5);
  }

  _makeButton(x, y, label, onClick) {
    const bg = this.add
      .rectangle(x, y, MOBILE.buttonWidth, MOBILE.buttonHeight, 0x16213e)
      .setStrokeStyle(2, 0xf0a500)
      .setInteractive({ useHandCursor: true });

    const text = this.add
      .text(x, y, label, {
        fontSize: MOBILE.buttonFontSize,
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    bg.on('pointerdown', onClick);
    bg.on('pointerover', () => text.setStyle({ color: '#f0a500' }));
    bg.on('pointerout', () => text.setStyle({ color: '#ffffff' }));

    return { bg, text };
  }
}
