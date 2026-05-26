/**
 * config.js
 * Phaser game configuration — defines canvas size, renderer type, and which
 * scenes to load. Import this object into main.js to instantiate the game.
 */

import BootScene from './scenes/BootScene.js';
import MainMenuScene from './scenes/MainMenuScene.js';
import CardCreatorScene from './scenes/CardCreatorScene.js';
import DeckBuilderScene from './scenes/DeckBuilderScene.js';
import BattleScene from './scenes/BattleScene.js';
import ProgressionScene from './scenes/ProgressionScene.js';
import { MOBILE } from './utils/MobileLayout.js';

const GameConfig = {
  type: Phaser.AUTO,            // Use WebGL if available, fall back to Canvas
  width: MOBILE.width,
  height: MOBILE.height,
  backgroundColor: '#1a1a2e',
  parent: 'game-container',     // Mount into the div in index.html
  scene: [
    BootScene,         // First scene — load assets and init storage
    MainMenuScene,     // Title screen
    CardCreatorScene,  // Upload photos and create cards
    DeckBuilderScene,  // Assemble a deck from your card collection
    BattleScene,       // Core turn-based combat
    ProgressionScene,  // Post-match rewards and unlocks
  ],
  dom: {
    createContainer: true,      // Allow DOM elements (file input) inside Phaser
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    orientation: Phaser.Scale.PORTRAIT,
  },
};

export default GameConfig;
