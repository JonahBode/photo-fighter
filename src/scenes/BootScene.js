/**
 * BootScene.js
 * The first scene that runs when the game starts.
 * Responsibilities:
 *  - Preload any global assets (fonts, UI sprites, etc.).
 *  - Initialise localStorage with default values if this is a new player.
 *  - Transition to MainMenuScene once loading is complete.
 */

import STARTER_CARDS from '../data/starterCards.js';

const STORAGE_KEYS = {
  progression: 'photoFighterProgress',
  customCards: 'photoFighterCustomCards',
  playerDeck: 'photoFighterPlayerDeck',
};

export default class BootScene extends Phaser.Scene { // eslint-disable-line no-undef
  constructor() {
    super({ key: 'BootScene' });
  }

  // ─── Phaser lifecycle ────────────────────────────────────────────────────────

  preload() {
    // Show a simple loading bar while assets load
    this._createLoadingBar();

    // Preload placeholder card back image
    // (In a full build you'd load spritesheets, audio, etc. here)
    this.load.on('progress', (value) => {
      if (this.loadingBar) this.loadingBar.scaleX = value;
    });
  }

  create() {
    this._initLocalStorage();
    // Brief pause so the loading bar is visible, then move to the main menu
    this.time.delayedCall(500, () => {
      this.scene.start('MainMenuScene');
    });
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  _createLoadingBar() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    // Title text
    this.add
      .text(cx, cy - 60, 'PHOTO FIGHTER', {
        fontSize: '48px',
        fontFamily: 'Arial Black, sans-serif',
        color: '#f0a500',
        stroke: '#000',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy - 10, 'Loading…', {
        fontSize: '20px',
        fontFamily: 'Arial, sans-serif',
        color: '#cccccc',
      })
      .setOrigin(0.5);

    // Background bar
    this.add.rectangle(cx, cy + 30, 400, 20, 0x333333).setOrigin(0.5);

    // Foreground bar (scales via scaleX in preload progress callback)
    this.loadingBar = this.add
      .rectangle(cx - 200, cy + 30, 400, 20, 0xf0a500)
      .setOrigin(0, 0.5);
  }

  /** Initialise localStorage keys that don't exist yet. */
  _initLocalStorage() {
    // Progression state — handled by ProgressionManager; skip if already set
    if (!localStorage.getItem(STORAGE_KEYS.progression)) {
      // ProgressionManager will create the default on first instantiation
    }

    // Custom cards — default to empty array
    if (!localStorage.getItem(STORAGE_KEYS.customCards)) {
      try {
        localStorage.setItem(STORAGE_KEYS.customCards, JSON.stringify([]));
      } catch (e) {
        console.warn('BootScene: could not write customCards to localStorage', e);
      }
    }

    // Player deck — default to first 15 starter cards (tier 1)
    if (!localStorage.getItem(STORAGE_KEYS.playerDeck)) {
      try {
        const defaultDeck = STARTER_CARDS.filter((c) => c.unlocked).map((c) => c.id);
        localStorage.setItem(STORAGE_KEYS.playerDeck, JSON.stringify(defaultDeck));
      } catch (e) {
        console.warn('BootScene: could not write playerDeck to localStorage', e);
      }
    }
  }
}
