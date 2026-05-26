/**
 * main.js
 * Entry point for the Photo Fighter Phaser game.
 * Imports the config and starts the Phaser.Game instance.
 */

import GameConfig from './config.js';

// Phaser is loaded globally from the CDN in index.html, so we can reference
// it directly here without an npm import.
const game = new Phaser.Game(GameConfig); // eslint-disable-line no-undef

export default game;
