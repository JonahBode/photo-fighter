/**
 * MainMenuScene.js
 * The main menu — entry point after the boot screen.
 * Buttons navigate to other scenes.
 */

export default class MainMenuScene extends Phaser.Scene { // eslint-disable-line no-undef
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;

    // ── Background ────────────────────────────────────────────────────────────
    this.add.rectangle(cx, height / 2, width, height, 0x1a1a2e);

    // Decorative gradient strip
    this.add.rectangle(cx, 0, width, 8, 0xf0a500).setOrigin(0.5, 0);
    this.add.rectangle(cx, height, width, 8, 0xf0a500).setOrigin(0.5, 1);

    // ── Title ─────────────────────────────────────────────────────────────────
    this.add
      .text(cx, 120, '⚔ PHOTO FIGHTER ⚔', {
        fontSize: '64px',
        fontFamily: 'Arial Black, sans-serif',
        color: '#f0a500',
        stroke: '#000',
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 195, 'Upload. Build. Battle.', {
        fontSize: '22px',
        fontFamily: 'Arial, sans-serif',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    // ── Menu buttons ──────────────────────────────────────────────────────────
    const buttons = [
      { label: '▶  Play Battle',      scene: 'BattleScene' },
      { label: '🃏  Build Deck',        scene: 'DeckBuilderScene' },
      { label: '📷  Card Creator',      scene: 'CardCreatorScene' },
      { label: '🏆  Progression',       scene: 'ProgressionScene' },
    ];

    buttons.forEach(({ label, scene }, i) => {
      const y = 310 + i * 80;
      this._makeButton(cx, y, label, () => this.scene.start(scene));
    });

    // ── Version watermark ─────────────────────────────────────────────────────
    this.add
      .text(width - 16, height - 12, 'v0.1.0', {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#555555',
      })
      .setOrigin(1, 1);
  }

  // ─── Helper ───────────────────────────────────────────────────────────────────

  _makeButton(x, y, label, onClick) {
    const btn = this.add
      .text(x, y, label, {
        fontSize: '28px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        backgroundColor: '#16213e',
        padding: { left: 28, right: 28, top: 12, bottom: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ color: '#f0a500' }));
    btn.on('pointerout', () => btn.setStyle({ color: '#ffffff' }));
    btn.on('pointerdown', onClick);

    return btn;
  }
}
