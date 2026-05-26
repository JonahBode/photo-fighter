/**
 * ProgressionScene.js
 * Shown after each battle.
 * Displays the match result, newly unlocked cards, and stats.
 * Data is passed from BattleScene via scene start data.
 */

import ProgressionManager from '../systems/ProgressionManager.js';

export default class ProgressionScene extends Phaser.Scene { // eslint-disable-line no-undef
  constructor() {
    super({ key: 'ProgressionScene' });
  }

  /**
   * @param {{ outcome: 'win'|'loss', newCards: import('../systems/CardSchema.js').Card[] }} data
   */
  init(data) {
    this._outcome = data.outcome || 'loss';
    this._newCards = data.newCards || [];
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const progression = new ProgressionManager();
    const stats = progression.getStats();

    // ── Background ────────────────────────────────────────────────────────────
    this.add.rectangle(cx, height / 2, width, height, 0x0f0f23);

    // ── Result banner ─────────────────────────────────────────────────────────
    const isWin = this._outcome === 'win';
    const bannerColor = isWin ? '#f0a500' : '#ff4444';
    const bannerText = isWin ? '🏆  VICTORY!' : '💀  DEFEAT';

    this.add
      .text(cx, 100, bannerText, {
        fontSize: '72px',
        fontFamily: 'Arial Black, sans-serif',
        color: bannerColor,
        stroke: '#000',
        strokeThickness: 10,
      })
      .setOrigin(0.5);

    // ── Stats grid ────────────────────────────────────────────────────────────
    const statsLines = [
      `Wins: ${stats.wins}   Losses: ${stats.losses}`,
      `Win Streak: ${stats.winStreak}   Total Matches: ${stats.totalMatches}`,
      `Highest Tier Reached: ${stats.highestTierReached}`,
    ];

    statsLines.forEach((line, i) => {
      this.add
        .text(cx, 220 + i * 38, line, {
          fontSize: '22px',
          fontFamily: 'Arial, sans-serif',
          color: '#cccccc',
        })
        .setOrigin(0.5);
    });

    // ── Newly unlocked cards ──────────────────────────────────────────────────
    if (this._newCards.length > 0) {
      this.add
        .text(cx, 360, '🔓  New Cards Unlocked!', {
          fontSize: '28px',
          fontFamily: 'Arial Black, sans-serif',
          color: '#44ff88',
          stroke: '#000',
          strokeThickness: 4,
        })
        .setOrigin(0.5);

      this._newCards.forEach((card, i) => {
        const x = cx - (this._newCards.length - 1) * 80 + i * 160;
        this._renderUnlockCard(card, x, 460);
      });
    } else {
      const noUnlockMsg = isWin
        ? 'No new cards this time — keep winning!'
        : 'Consolation reward coming after 3 losses.';
      this.add
        .text(cx, 390, noUnlockMsg, {
          fontSize: '18px',
          fontFamily: 'Arial, sans-serif',
          color: '#888888',
        })
        .setOrigin(0.5);
    }

    // ── Action buttons ────────────────────────────────────────────────────────
    this._makeButton(cx - 160, height - 80, '⚔  Play Again', () =>
      this.scene.start('BattleScene')
    );
    this._makeButton(cx + 160, height - 80, '🏠  Main Menu', () =>
      this.scene.start('MainMenuScene')
    );
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  _renderUnlockCard(card, x, y) {
    this.add.rectangle(x, y, 140, 100, 0x1a2a4e).setStrokeStyle(2, 0x44ff88);

    this.add
      .text(x, y - 22, card.name, {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        wordWrap: { width: 130 },
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(x, y + 12, `Tier ${card.tier} · ${card.category}`, {
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    this.add
      .text(x, y + 34, card.flavorText || '', {
        fontSize: '10px',
        fontFamily: 'Arial, sans-serif',
        color: '#888888',
        wordWrap: { width: 130 },
        align: 'center',
        fontStyle: 'italic',
      })
      .setOrigin(0.5);
  }

  _makeButton(x, y, label, onClick) {
    const btn = this.add
      .text(x, y, label, {
        fontSize: '26px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        backgroundColor: '#16213e',
        padding: { left: 22, right: 22, top: 12, bottom: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ color: '#f0a500' }));
    btn.on('pointerout', () => btn.setStyle({ color: '#ffffff' }));
    btn.on('pointerdown', onClick);

    return btn;
  }
}
