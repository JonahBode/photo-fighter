/**
 * MainMenuScene.js
 * The main menu — entry point after the boot screen.
 * Buttons navigate to other scenes.
 */

import { MOBILE } from '../utils/MobileLayout.js';

export default class MainMenuScene extends Phaser.Scene { // eslint-disable-line no-undef
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;

    this.add.rectangle(cx, height / 2, width, height, 0x1a1a2e);

    this.add
      .text(cx, 92, 'PHOTO FIGHTER', {
        fontSize: '48px',
        fontFamily: 'Arial Black, sans-serif',
        color: '#f0a500',
        stroke: '#000',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 146, 'Upload. Build. Battle.', {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 174, 'Create a deck from your photos and duel the AI.', {
        fontSize: MOBILE.bodyFontSize,
        fontFamily: 'Arial, sans-serif',
        color: '#aaaaaa',
        align: 'center',
      })
      .setOrigin(0.5);

    const buttons = [
      { label: 'Play Battle', scene: 'BattleScene' },
      { label: 'Build Deck', scene: 'DeckBuilderScene' },
      { label: 'Card Creator', scene: 'CardCreatorScene' },
      { label: 'Progression', scene: 'ProgressionScene' },
    ];

    const startY = height / 2 - 92;
    buttons.forEach(({ label, scene }, i) => {
      this._makeButton(cx, startY + i * 70, label, () => this.scene.start(scene));
    });
  }

  _makeButton(x, y, label, onClick) {
    const bg = this.add
      .rectangle(x, y, 300, 56, 0x16213e)
      .setStrokeStyle(2, 0xf0a500)
      .setInteractive({ useHandCursor: true });

    const text = this.add
      .text(x, y, label, {
        fontSize: '24px',
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
