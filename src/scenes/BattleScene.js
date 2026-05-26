/**
 * BattleScene.js
 * Core combat loop for Photo Fighter.
 *
 * Game flow:
 *  1. Both sides draw opening hands.
 *  2. Each turn:
 *     a. Mana increments for both sides.
 *     b. Each side draws a card (or takes fatigue).
 *     c. Player chooses a card to play (or passes).
 *     d. AI takes its turn.
 *     e. Combat phase: cards attack in speed order.
 *     f. Poison ticks.
 *     g. Check win/loss condition.
 *  3. Match ends when one side has no cards left (or forfeits).
 */

import STARTER_CARDS from '../data/starterCards.js';
import DeckManager from '../systems/DeckManager.js';
import ManaSystem from '../systems/ManaSystem.js';
import AIManager from '../systems/AIManager.js';
import ProgressionManager from '../systems/ProgressionManager.js';
import {
  createBattleCard,
  resolveAttack,
  tickPoison,
  buildTurnOrder,
} from '../systems/CombatManager.js';
import { shuffleArray, pickRandom } from '../systems/RandomUtils.js';

const STORAGE_KEY_DECK = 'photoFighterPlayerDeck';
const STORAGE_KEY_CUSTOM = 'photoFighterCustomCards';

// Visual layout constants
const CARD_W = 140;
const CARD_H = 190;
const PLAYER_ROW_Y = 540;
const AI_ROW_Y = 150;
const HAND_Y = 660;
const LOG_X = 1100;
const LOG_Y = 200;

export default class BattleScene extends Phaser.Scene { // eslint-disable-line no-undef
  constructor() {
    super({ key: 'BattleScene' });
  }

  // ─── Phaser lifecycle ────────────────────────────────────────────────────────

  create() {
    const { width, height } = this.scale;

    // ── Background ────────────────────────────────────────────────────────────
    this.add.rectangle(width / 2, height / 2, width, height, 0x0d1b2a);

    // ── Build decks ───────────────────────────────────────────────────────────
    const allCards = this._getAllCards();
    const playerDeckCards = this._buildPlayerDeck(allCards);
    const aiDeckCards = this._buildAIDeck(allCards);

    // ── Systems ───────────────────────────────────────────────────────────────
    this._playerMana = new ManaSystem();
    this._aiMana = new ManaSystem();
    this._playerDeck = new DeckManager(playerDeckCards);
    this._aiDeck = new DeckManager(aiDeckCards);
    this._progression = new ProgressionManager();
    this._ai = new AIManager(this._aiMana, this._aiDeck);

    // Battle state
    this._playerField = [];   // BattleCard[] currently in play (player side)
    this._aiField = [];       // BattleCard[] currently in play (AI side)
    this._turn = 1;
    this._playerHp = 30;      // player hero HP
    this._aiHp = 30;          // AI hero HP
    this._gameOver = false;
    this._waitingForPlayer = false;
    this._selectedHandIndex = -1;

    // ── Draw opening hands ────────────────────────────────────────────────────
    this._playerDeck.drawOpeningHand();
    this._aiDeck.drawOpeningHand();

    // ── UI ────────────────────────────────────────────────────────────────────
    this._buildUI(width, height);

    // ── Start first turn ──────────────────────────────────────────────────────
    this._startTurn();
  }

  // ─── Turn structure ──────────────────────────────────────────────────────────

  _startTurn() {
    if (this._gameOver) return;

    // Increment mana for both sides
    this._playerMana.onTurnStart();
    this._aiMana.onTurnStart();

    // Draw for both (or apply fatigue)
    const { card: pCard, fatigue: pFatigue } = this._playerDeck.drawCard();
    if (pFatigue > 0) {
      this._playerHp -= pFatigue;
      this._log(`⚠ Fatigue! You take ${pFatigue} damage.`);
    }
    this._aiDeck.drawCard(); // AI silently draws

    this._turn += 1;
    this._refreshUI();

    // Reset "hasActed" flags for this turn
    [...this._playerField, ...this._aiField].forEach((c) => (c.hasActed = false));

    // Wait for player action
    this._waitingForPlayer = true;
    this._log(`--- Turn ${this._turn} ---`);
    this._updateManaText();
    this._renderHand();
    this._checkGameOver();
  }

  _endPlayerTurn() {
    if (!this._waitingForPlayer || this._gameOver) return;
    this._waitingForPlayer = false;

    // AI takes its turn
    this._ai.takeTurn(this._aiField, this._playerField, (att, def) =>
      resolveAttack(att, def)
    );

    // Combat phase — all cards attack
    this._doCombatPhase();

    // Poison ticks
    this._doPoison();

    // Check win/loss
    if (!this._checkGameOver()) {
      // Brief delay then start next turn
      this.time.delayedCall(600, () => this._startTurn());
    }
  }

  // ─── Combat phase ────────────────────────────────────────────────────────────

  _doCombatPhase() {
    const order = buildTurnOrder(this._playerField, this._aiField);

    for (const { card: attacker, owner } of order) {
      if (attacker.currentHp <= 0) continue;
      if (attacker.hasActed) continue;
      if (attacker.stunned) {
        attacker.stunned = false;
        this._log(`${attacker.name} is stunned and skips this turn.`);
        continue;
      }

      const targets = owner === 'player' ? this._aiField : this._playerField;
      const heroTarget = owner === 'player' ? '_aiHp' : '_playerHp';

      // Find a valid target (prefer Taunt)
      const aliveTargets = targets.filter((c) => c.currentHp > 0);
      const tauntTargets = aliveTargets.filter((c) => c.keywords.includes('Taunt'));
      const pool = tauntTargets.length > 0 ? tauntTargets : aliveTargets;

      if (pool.length === 0) {
        // Attack hero directly
        const dmg = Math.max(1, (attacker.attack[0] + attacker.attack[1]) / 2 | 0);
        this[heroTarget] -= dmg;
        this._log(`${attacker.name} attacks ${owner === 'player' ? 'enemy' : 'your'} hero for ${dmg}!`);
      } else {
        const target = pool[Math.floor(Math.random() * pool.length)];
        const result = resolveAttack(attacker, target);
        this._logAttackResult(attacker, target, result);

        // Remove dead cards from fields
        this._playerField = this._playerField.filter((c) => c.currentHp > 0);
        this._aiField = this._aiField.filter((c) => c.currentHp > 0);
      }

      attacker.hasActed = true;
    }

    this._refreshUI();
  }

  _doPoison() {
    const allField = [...this._playerField, ...this._aiField];
    const results = tickPoison(allField);
    results.forEach(({ card, damage }) => {
      this._log(`☠ ${card.name} takes ${damage} poison damage.`);
    });

    // Clean up dead cards
    this._playerField = this._playerField.filter((c) => c.currentHp > 0);
    this._aiField = this._aiField.filter((c) => c.currentHp > 0);
    this._refreshUI();
  }

  // ─── Win/loss checking ───────────────────────────────────────────────────────

  _checkGameOver() {
    if (this._gameOver) return true;

    const playerLost = this._playerHp <= 0;
    const aiLost = this._aiHp <= 0;

    if (!playerLost && !aiLost) return false;

    this._gameOver = true;
    const outcome = aiLost ? 'win' : 'loss';
    const allCards = this._getAllCards();
    const newCards = this._progression.recordMatch(outcome, allCards);

    this.time.delayedCall(800, () => {
      this.scene.start('ProgressionScene', { outcome, newCards });
    });

    return true;
  }

  // ─── Player card actions ──────────────────────────────────────────────────────

  /**
   * Called when the player taps a card in their hand.
   * If affordable, moves the card to the field.
   */
  _playCardFromHand(index) {
    const hand = this._playerDeck.getHand();
    const card = hand[index];
    if (!card) return;

    if (!this._playerMana.canPlay(card)) {
      this._log(`Not enough mana to play ${card.name} (cost ${card.cost}).`);
      return;
    }

    this._playerMana.spend(card);
    this._playerDeck.playCard(card.id);

    // Create a battle card and add to field
    const battleCard = createBattleCard(card);
    this._playerField.push(battleCard);

    this._log(`You played ${card.name}!`);
    this._updateManaText();
    this._renderHand();
    this._renderField();
  }

  // ─── UI building ─────────────────────────────────────────────────────────────

  _buildUI(width, height) {
    // Hero HP bars labels
    this.add
      .text(width / 2, AI_ROW_Y - 80, '🤖  AI', {
        fontSize: '22px',
        fontFamily: 'Arial, sans-serif',
        color: '#ff6644',
        stroke: '#000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, PLAYER_ROW_Y + 80, '🧑  YOU', {
        fontSize: '22px',
        fontFamily: 'Arial, sans-serif',
        color: '#44aaff',
        stroke: '#000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // Hero HP texts (updated each turn)
    this._aiHpText = this.add
      .text(width / 2, AI_ROW_Y - 50, `❤ ${this._aiHp}`, {
        fontSize: '28px',
        fontFamily: 'Arial Black, sans-serif',
        color: '#ff6644',
      })
      .setOrigin(0.5);

    this._playerHpText = this.add
      .text(width / 2, PLAYER_ROW_Y + 50, `❤ ${this._playerHp}`, {
        fontSize: '28px',
        fontFamily: 'Arial Black, sans-serif',
        color: '#44aaff',
      })
      .setOrigin(0.5);

    // Mana text
    this._manaText = this.add
      .text(40, height - 30, '', {
        fontSize: '20px',
        fontFamily: 'Arial, sans-serif',
        color: '#88aaff',
      })
      .setOrigin(0, 1);

    // End Turn button
    this._makeButton(width - 120, height - 50, 'End Turn', () => this._endPlayerTurn());

    // Back to menu button
    this._makeButton(120, height - 50, '⬅ Forfeit', () => {
      this._progression.recordMatch('loss', this._getAllCards());
      this.scene.start('MainMenuScene');
    });

    // Combat log (scrollable via text wrapping)
    this.add
      .text(LOG_X, LOG_Y - 30, '── Combat Log ──', {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#888888',
      })
      .setOrigin(0.5);

    this._logLines = [];
    this._logText = this.add.text(LOG_X - 80, LOG_Y, '', {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      color: '#cccccc',
      wordWrap: { width: 200 },
    });

    // Turn label
    this._turnText = this.add
      .text(width / 2, height / 2, '', {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#555577',
      })
      .setOrigin(0.5);

    // Containers for dynamic card objects (re-created each render)
    this._handContainer = this.add.container(0, 0);
    this._fieldContainer = this.add.container(0, 0);
  }

  // ─── Dynamic UI refresh ───────────────────────────────────────────────────────

  _refreshUI() {
    this._aiHpText.setText(`❤ ${Math.max(0, this._aiHp)}`);
    this._playerHpText.setText(`❤ ${Math.max(0, this._playerHp)}`);
    this._renderField();
  }

  _updateManaText() {
    const { current, max } = this._playerMana.getState();
    this._manaText.setText(`💎 Mana: ${current} / ${max}`);
  }

  _renderHand() {
    this._handContainer.removeAll(true); // destroy old card objects

    const hand = this._playerDeck.getHand();
    const totalW = hand.length * (CARD_W + 12);
    const startX = (this.scale.width - totalW) / 2 + CARD_W / 2;

    hand.forEach((card, i) => {
      const x = startX + i * (CARD_W + 12);
      const y = HAND_Y;
      const cardGfx = this._createCardGfx(card, x, y, false);
      cardGfx.forEach((obj) => this._handContainer.add(obj));

      // Make the background interactive
      const bg = cardGfx[0]; // first element is the background rect
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this._playCardFromHand(i));
      bg.on('pointerover', () => bg.setFillStyle(0x2a3a6e));
      bg.on('pointerout', () => bg.setFillStyle(0x16213e));
    });
  }

  _renderField() {
    this._fieldContainer.removeAll(true);

    // Player field
    this._playerField.forEach((card, i) => {
      const x = 200 + i * (CARD_W + 16);
      const y = PLAYER_ROW_Y;
      this._createBattleCardGfx(card, x, y, '#44aaff').forEach((obj) =>
        this._fieldContainer.add(obj)
      );
    });

    // AI field
    this._aiField.forEach((card, i) => {
      const x = 200 + i * (CARD_W + 16);
      const y = AI_ROW_Y;
      this._createBattleCardGfx(card, x, y, '#ff6644').forEach((obj) =>
        this._fieldContainer.add(obj)
      );
    });
  }

  // ─── Card graphics factories ──────────────────────────────────────────────────

  /**
   * Build a list of display objects representing a hand card.
   * Returns them so they can be added to a container.
   */
  _createCardGfx(card, x, y, isField) {
    const bg = this.add.rectangle(x, y, CARD_W, CARD_H, 0x16213e)
      .setStrokeStyle(2, 0x4444aa);

    const name = this.add.text(x, y - 60, card.name, {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      wordWrap: { width: CARD_W - 10 },
      align: 'center',
    }).setOrigin(0.5);

    const stats = this.add.text(
      x, y + 30,
      `ATK: ${card.attack[0]}–${card.attack[1]}\nHP: ${card.hp}  DEF: ${card.defense}\nSPD: ${card.speed}  Cost: ${card.cost}`,
      {
        fontSize: '11px',
        fontFamily: 'Arial, sans-serif',
        color: '#aaaaaa',
        align: 'center',
      }
    ).setOrigin(0.5);

    const kws = card.keywords.length
      ? this.add.text(x, y + 78, card.keywords.join(' · '), {
          fontSize: '10px',
          fontFamily: 'Arial, sans-serif',
          color: '#ffcc44',
          align: 'center',
        }).setOrigin(0.5)
      : null;

    return [bg, name, stats, ...(kws ? [kws] : [])];
  }

  /** Build graphics for a card on the battlefield (showing currentHp). */
  _createBattleCardGfx(card, x, y, borderHex) {
    const color = parseInt(borderHex.replace('#', ''), 16);
    const bg = this.add.rectangle(x, y, CARD_W, CARD_H, 0x0a1628)
      .setStrokeStyle(2, color);

    const name = this.add.text(x, y - 60, card.name, {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      wordWrap: { width: CARD_W - 10 },
      align: 'center',
    }).setOrigin(0.5);

    const hpColor = card.currentHp / card.hp > 0.5 ? '#44ff88' : '#ff6644';
    const hpText = this.add.text(x, y + 20, `❤ ${card.currentHp} / ${card.hp}`, {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: hpColor,
    }).setOrigin(0.5);

    const kws = card.keywords.length
      ? this.add.text(x, y + 55, card.keywords.join(' · '), {
          fontSize: '10px',
          fontFamily: 'Arial, sans-serif',
          color: '#ffcc44',
        }).setOrigin(0.5)
      : null;

    // Poison indicator
    const poison = card.poisonStacks > 0
      ? this.add.text(x + CARD_W / 2 - 14, y - CARD_H / 2 + 10, `☠${card.poisonStacks}`, {
          fontSize: '12px',
          fontFamily: 'Arial, sans-serif',
          color: '#88ff44',
        }).setOrigin(1, 0)
      : null;

    return [bg, name, hpText, ...(kws ? [kws] : []), ...(poison ? [poison] : [])];
  }

  // ─── Combat log ───────────────────────────────────────────────────────────────

  _log(msg) {
    this._logLines.unshift(msg);
    if (this._logLines.length > 12) this._logLines.pop();
    if (this._logText) this._logText.setText(this._logLines.join('\n'));
  }

  _logAttackResult(attacker, target, result) {
    if (result.shieldBlocked) {
      this._log(`🛡 ${target.name}'s Shield blocked ${attacker.name}'s attack!`);
      return;
    }
    let msg = `${attacker.name} → ${target.name}: ${result.finalDamage} dmg`;
    if (result.isCrit) msg += ' ⚡CRIT!';
    if (result.poisonApplied) msg += ' ☠';
    if (result.stunApplied) msg += ' 💫 STUN!';
    if (result.healAmount > 0) msg += ` (+${result.healAmount}hp)`;
    if (result.defenderDied) msg += ' 💀';
    this._log(msg);
  }

  // ─── Data helpers ─────────────────────────────────────────────────────────────

  _getAllCards() {
    try {
      const custom = JSON.parse(localStorage.getItem('photoFighterCustomCards') || '[]');
      return [...STARTER_CARDS, ...custom];
    } catch {
      return [...STARTER_CARDS];
    }
  }

  _buildPlayerDeck(allCards) {
    try {
      const ids = JSON.parse(localStorage.getItem(STORAGE_KEY_DECK) || '[]');
      const deck = ids.map((id) => allCards.find((c) => c.id === id)).filter(Boolean);
      if (deck.length >= 15) return deck;
    } catch { /* fall through */ }
    // Fallback: use first 15 starter cards
    return STARTER_CARDS.filter((c) => c.unlocked).slice(0, 15);
  }

  _buildAIDeck(allCards) {
    // AI gets a random 15-card deck from tier 1 cards
    const pool = allCards.filter((c) => c.tier === 1);
    const shuffled = shuffleArray([...pool]);
    return shuffled.slice(0, Math.min(15, shuffled.length));
  }

  // ─── Button helper ────────────────────────────────────────────────────────────

  _makeButton(x, y, label, onClick) {
    const btn = this.add
      .text(x, y, label, {
        fontSize: '20px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        backgroundColor: '#16213e',
        padding: { left: 16, right: 16, top: 8, bottom: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ color: '#f0a500' }));
    btn.on('pointerout', () => btn.setStyle({ color: '#ffffff' }));
    btn.on('pointerdown', onClick);

    return btn;
  }
}
