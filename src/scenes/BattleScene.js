/**
 * BattleScene.js
 * Core combat loop for Photo Fighter.
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
import { shuffleArray } from '../systems/RandomUtils.js';
import { MOBILE } from '../utils/MobileLayout.js';

const STORAGE_KEY_DECK = 'photoFighterPlayerDeck';
const STORAGE_KEY_CUSTOM = 'photoFighterCustomCards';

const HAND_CARD_W = 75;
const HAND_CARD_H = 140;
const FIELD_CARD_W = 100;
const FIELD_CARD_H = 150;

export default class BattleScene extends Phaser.Scene { // eslint-disable-line no-undef
  constructor() {
    super({ key: 'BattleScene' });
  }

  preload() {
    // Load all card images dynamically so they're available for rendering
    const allCards = this._getAllCards();
    allCards.forEach((card) => {
      if (card.image && !this.textures.exists(card.id)) {
        this.load.image(card.id, card.image);
      }
    });
  }

  create() {
    const { width, height } = this.scale;
    this.input.setTopOnly(false);

    this.add.rectangle(width / 2, height / 2, width, height, 0x0d1b2a);

    const allCards = this._getAllCards();
    const playerDeckCards = this._buildPlayerDeck(allCards);
    const aiDeckCards = this._buildAIDeck(allCards);

    this._playerMana = new ManaSystem();
    this._aiMana = new ManaSystem();
    this._playerDeck = new DeckManager(playerDeckCards);
    this._aiDeck = new DeckManager(aiDeckCards);
    this._progression = new ProgressionManager();
    this._ai = new AIManager(this._aiMana, this._aiDeck);

    this._playerField = [];
    this._aiField = [];
    this._turn = 1;
    this._playerHp = 30;
    this._aiHp = 30;
    this._gameOver = false;
    this._waitingForPlayer = false;
    this._selectedHandIndex = -1;

    this._playerDeck.drawOpeningHand();
    this._aiDeck.drawOpeningHand();

    this._buildUI(width, height);
    this._startTurn();
  }

  _startTurn() {
    if (this._gameOver) return;

    this._playerMana.onTurnStart();
    this._aiMana.onTurnStart();

    const { fatigue: pFatigue } = this._playerDeck.drawCard();
    if (pFatigue > 0) {
      this._playerHp -= pFatigue;
      this._log(`⚠ Fatigue! You take ${pFatigue} damage.`);
    }
    this._aiDeck.drawCard();

    this._turn += 1;

    [...this._playerField, ...this._aiField].forEach((c) => {
      c.hasActed = false;
    });

    this._waitingForPlayer = true;
    this._selectedHandIndex = -1;
    this._log(`--- Turn ${this._turn} ---`);

    this._refreshUI();
    this._checkGameOver();
  }

  _endPlayerTurn() {
    if (!this._waitingForPlayer || this._gameOver) return;
    this._waitingForPlayer = false;

    const aiLog = this._ai.takeTurn(this._aiField, this._playerField, (att, def) =>
      resolveAttack(att, def)
    );
    if (aiLog.cardPlayed) {
      this._log(`AI played ${aiLog.cardPlayed.name}.`);
    }

    this._doCombatPhase();
    this._doPoison();

    if (!this._checkGameOver()) {
      this.time.delayedCall(600, () => this._startTurn());
    }
  }

  _playSelectedCard() {
    if (this._selectedHandIndex < 0) return;
    this._playCardFromHand(this._selectedHandIndex);
  }

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

    const battleCard = createBattleCard(card);
    this._playerField.push(battleCard);

    this._selectedHandIndex = -1;
    this._log(`You played ${card.name}!`);
    this._refreshUI();
  }

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

      const aliveTargets = targets.filter((c) => c.currentHp > 0);
      const tauntTargets = aliveTargets.filter((c) => c.keywords.includes('Taunt'));
      const pool = tauntTargets.length > 0 ? tauntTargets : aliveTargets;

      if (pool.length === 0) {
        const dmg = Math.max(1, (attacker.attack[0] + attacker.attack[1]) / 2 | 0);
        this[heroTarget] -= dmg;
        this._log(`${attacker.name} attacks ${owner === 'player' ? 'enemy' : 'your'} hero for ${dmg}!`);
      } else {
        const target = pool[Math.floor(Math.random() * pool.length)];
        const result = resolveAttack(attacker, target);
        this._logAttackResult(attacker, target, result);

        this._playerField = this._playerField.filter((c) => c.currentHp > 0);
        this._aiField = this._aiField.filter((c) => c.currentHp > 0);
      }

      attacker.hasActed = true;
    }
  }

  _doPoison() {
    const allField = [...this._playerField, ...this._aiField];
    const results = tickPoison(allField);
    results.forEach(({ card, damage }) => {
      this._log(`☠ ${card.name} takes ${damage} poison damage.`);
    });

    this._playerField = this._playerField.filter((c) => c.currentHp > 0);
    this._aiField = this._aiField.filter((c) => c.currentHp > 0);
    this._refreshUI();
  }

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

  _buildUI(width, height) {
    // ── Background panels ──
    this.add.rectangle(width / 2, 60, width - 20, 112, 0x16213e, 0.55).setStrokeStyle(2, 0x2a3b56);
    this.add.rectangle(width / 2, 202, width - 20, 160, 0x16213e, 0.35).setStrokeStyle(1, 0x2a3b56);
    this.add.rectangle(width / 2, 302, width - 20, 40, 0x16213e, 0.35);
    this.add.rectangle(width / 2, 406, width - 20, 160, 0x16213e, 0.35).setStrokeStyle(1, 0x2a3b56);
    this.add.rectangle(width / 2, 534, width - 20, 72, 0x16213e, 0.55).setStrokeStyle(2, 0x2a3b56);
    this.add.rectangle(width / 2, 658, width - 20, 170, 0x16213e, 0.35).setStrokeStyle(1, 0x2a3b56);

    // ── AI hero area ──
    this._aiHpLabel = this.add.text(24, 20, '', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    });

    this._aiHpBarBg = this.add.rectangle(120, 54, 220, 18, 0x2a2a3a).setOrigin(0, 0.5);
    this._aiHpBarFill = this.add.rectangle(120, 54, 220, 18, 0xff6644).setOrigin(0, 0.5);

    this._aiManaText = this.add.text(24, 76, '', {
      fontSize: MOBILE.bodyFontSize,
      fontFamily: 'Arial, sans-serif',
      color: '#f0a500',
    });

    this._aiHandText = this.add.text(width - 24, 76, '', {
      fontSize: MOBILE.bodyFontSize,
      fontFamily: 'Arial, sans-serif',
      color: '#cccccc',
    }).setOrigin(1, 0);

    // ── Section labels ──
    this.add.text(16, 108, 'ENEMY FIELD', {
      fontSize: '11px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ff6644',
      alpha: 0.85,
    });

    this.add.text(16, 312, 'YOUR FIELD', {
      fontSize: '11px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#44aaff',
      alpha: 0.85,
    });

    this.add.text(16, 560, 'YOUR HAND', {
      fontSize: '11px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffffff',
      alpha: 0.75,
    });

    // ── Turn label ──
    this._turnText = this.add.text(width / 2, 302, '', {
      fontSize: '28px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#f0a500',
    }).setOrigin(0.5);

    // ── Player hero area ──
    this._playerHpLabel = this.add.text(24, 506, '', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
    });

    this._playerHpBarBg = this.add.rectangle(120, 540, 220, 18, 0x2a2a3a).setOrigin(0, 0.5);
    this._playerHpBarFill = this.add.rectangle(120, 540, 220, 18, 0x44aaff).setOrigin(0, 0.5);

    this._playerManaText = this.add.text(24, 554, '', {
      fontSize: MOBILE.bodyFontSize,
      fontFamily: 'Arial, sans-serif',
      color: '#f0a500',
    });

    this._playButton = this._makeButton(316, 552, 64, 48, 'Play', () => this._playSelectedCard(), 0x16213e, '18px');

    // ── Card rows ──
    this._aiFieldRow = this._createScrollableRow(16, 122, 358, 160);
    this._playerFieldRow = this._createScrollableRow(16, 326, 358, 160);
    this._handRow = this._createScrollableRow(16, 574, 358, 170);

    // ── Play hint ──
    this.add.text(width / 2, 756, 'Tap to select · Tap again to play', {
      fontSize: '11px',
      fontFamily: 'Arial, sans-serif',
      color: '#888888',
    }).setOrigin(0.5);

    // ── End Turn button ──
    this._endTurnButton = this._makeButton(width / 2, 812, width - 24, MOBILE.buttonHeight, 'End Turn', () => this._endPlayerTurn(), 0xf0a500, '24px', '#1a1a2e');

    // ── Forfeit button (top-left, clearly visible) ──
    this._forfeitBtn = this._makeButton(44, 14, 80, 28, '⚑ Forfeit', () => this._showForfeitConfirm(), 0x2a1a1a, '13px', '#ff8888');

    // ── Combat log ──
    this._logLines = [];
    this._logToggle = this.add.text(width - 12, 10, '📋 Log', {
      fontSize: MOBILE.bodyFontSize,
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      backgroundColor: '#16213e',
      padding: { left: 8, right: 8, top: 6, bottom: 6 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    this._logOverlayVisible = false;
    this._logOverlay = this.add.container(0, height).setDepth(10).setVisible(false);
    const overlayBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.72);
    const overlayPanel = this.add.rectangle(width / 2, height / 2 + 120, width - 32, 300, 0x16213e, 0.92)
      .setStrokeStyle(2, 0xf0a500);
    const overlayTitle = this.add.text(width / 2, height / 2 - 12, 'Combat Log', {
      fontSize: '24px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#f0a500',
    }).setOrigin(0.5);
    this._logOverlayText = this.add.text(28, height / 2 + 30, '', {
      fontSize: MOBILE.bodyFontSize,
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      wordWrap: { width: width - 56 },
    });

    this._logOverlay.add([overlayBg, overlayPanel, overlayTitle, this._logOverlayText]);
    this._logOverlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains); // eslint-disable-line no-undef
    this._logOverlay.on('pointerdown', () => this._toggleLog(false));
    this._logToggle.on('pointerdown', () => this._toggleLog(!this._logOverlayVisible));

    // ── Forfeit confirm overlay (hidden by default) ──
    this._forfeitOverlay = this.add.container(0, 0).setDepth(20).setVisible(false);
    const fBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    const fPanel = this.add.rectangle(width / 2, height / 2, width - 60, 160, 0x1a0a0a, 0.95)
      .setStrokeStyle(2, 0xff6644);
    const fTitle = this.add.text(width / 2, height / 2 - 44, 'Forfeit the battle?', {
      fontSize: '22px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ff8888',
    }).setOrigin(0.5);
    const fSub = this.add.text(width / 2, height / 2 - 12, 'This counts as a loss.', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    // Yes button
    const fYesBg = this.add.rectangle(width / 2 - 70, height / 2 + 40, 120, 40, 0x660000)
      .setStrokeStyle(2, 0xff6644).setInteractive({ useHandCursor: true });
    const fYesTxt = this.add.text(width / 2 - 70, height / 2 + 40, 'Yes, Forfeit', {
      fontSize: '15px', fontFamily: 'Arial, sans-serif', color: '#ff8888',
    }).setOrigin(0.5);
    fYesBg.on('pointerdown', () => {
      this._progression.recordMatch('loss', this._getAllCards());
      this.scene.start('MainMenuScene');
    });

    // Cancel button
    const fCancelBg = this.add.rectangle(width / 2 + 70, height / 2 + 40, 100, 40, 0x163016)
      .setStrokeStyle(2, 0x44ff88).setInteractive({ useHandCursor: true });
    const fCancelTxt = this.add.text(width / 2 + 70, height / 2 + 40, 'Cancel', {
      fontSize: '15px', fontFamily: 'Arial, sans-serif', color: '#44ff88',
    }).setOrigin(0.5);
    fCancelBg.on('pointerdown', () => {
      this._forfeitOverlay.setVisible(false);
    });

    this._forfeitOverlay.add([fBg, fPanel, fTitle, fSub, fYesBg, fYesTxt, fCancelBg, fCancelTxt]);
  }

  _showForfeitConfirm() {
    this._forfeitOverlay.setVisible(true);
  }

  _refreshUI() {
    this._refreshHeroArea();
    this._renderFields();
    this._renderHand();
  }

  _refreshHeroArea() {
    this._aiHpLabel.setText(`AI HP ${Math.max(0, this._aiHp)} / 30`);
    this._playerHpLabel.setText(`Your HP ${Math.max(0, this._playerHp)} / 30`);

    this._aiHpBarFill.width = Phaser.Math.Clamp((Math.max(0, this._aiHp) / 30) * 220, 0, 220); // eslint-disable-line no-undef
    this._playerHpBarFill.width = Phaser.Math.Clamp((Math.max(0, this._playerHp) / 30) * 220, 0, 220); // eslint-disable-line no-undef

    const pMana = this._playerMana.getState();
    const aiMana = this._aiMana.getState();

    this._playerManaText.setText(`Mana ${this._manaDots(pMana.current, pMana.max)}`);
    this._aiManaText.setText(`Mana ${this._manaDots(aiMana.current, aiMana.max)}`);
    this._aiHandText.setText(`Hand: ${this._aiDeck.getHand().length} cards`);

    this._turnText.setText(this._waitingForPlayer ? 'YOUR TURN' : 'AI TURN');
  }

  _manaDots(current, max) {
    let out = '';
    for (let i = 0; i < max; i += 1) {
      out += i < current ? '● ' : '○ ';
    }
    return out.trim();
  }

  _renderFields() {
    this._renderFieldRow(this._aiFieldRow, this._aiField, '#ff6644');
    this._renderFieldRow(this._playerFieldRow, this._playerField, '#44aaff');
  }

  _renderFieldRow(row, cards, borderColor) {
    row.container.removeAll(true);

    cards.forEach((card, i) => {
      const x = FIELD_CARD_W / 2 + i * (FIELD_CARD_W + 10);
      const y = row.h / 2;
      const bg = this.add.rectangle(x, y, FIELD_CARD_W, FIELD_CARD_H, 0x0a1628)
        .setStrokeStyle(2, parseInt(borderColor.replace('#', ''), 16));

      // Card image
      if (this.textures.exists(card.id)) {
        const img = this.add.image(x, y - 38, card.id).setDisplaySize(FIELD_CARD_W - 6, 56);
        row.container.add(img);
      }

      const name = this.add.text(x, y + 18, card.name, {
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        wordWrap: { width: FIELD_CARD_W - 8 },
        align: 'center',
      }).setOrigin(0.5);

      const hp = this.add.text(x, y + 38, `HP ${Math.max(0, card.currentHp)}`, {
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
      }).setOrigin(0.5);

      const keywords = this.add.text(x, y + 56, card.keywords.join(', ') || '-', {
        fontSize: '10px',
        fontFamily: 'Arial, sans-serif',
        color: '#f0a500',
        wordWrap: { width: FIELD_CARD_W - 8 },
        align: 'center',
      }).setOrigin(0.5);

      row.container.add([bg, name, hp, keywords]);
    });

    this._clampScrollRow(row, cards.length * (FIELD_CARD_W + 10) - 10);
  }

  _renderHand() {
    this._handRow.container.removeAll(true);
    const hand = this._playerDeck.getHand();

    hand.forEach((card, i) => {
      const x = HAND_CARD_W / 2 + i * (HAND_CARD_W + 10);
      const y = this._handRow.h / 2;
      const selected = this._selectedHandIndex === i;
      const cardY = selected ? y - 8 : y; // lift selected card
      const bg = this.add.rectangle(x, cardY, HAND_CARD_W, HAND_CARD_H, selected ? 0x1e2e4e : 0x16213e)
        .setStrokeStyle(selected ? 3 : 2, selected ? 0xf0a500 : 0x4444aa)
        .setInteractive({ useHandCursor: true });

      const name = this.add.text(x, cardY - 16, card.name, {
        fontSize: '11px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        wordWrap: { width: HAND_CARD_W - 8 },
        align: 'center',
      }).setOrigin(0.5);

      const cost = this.add.text(x, cardY + 8, `Cost ${card.cost}`, {
        fontSize: '11px',
        fontFamily: 'Arial, sans-serif',
        color: '#44aaff',
      }).setOrigin(0.5);

      const atk = this.add.text(x, cardY + 26, `ATK ${card.attack[0]}-${card.attack[1]}`, {
        fontSize: '11px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
      }).setOrigin(0.5);

      const keywords = this.add.text(x, cardY + 50, card.keywords.join(', ') || '-', {
        fontSize: '10px',
        fontFamily: 'Arial, sans-serif',
        color: '#f0a500',
        wordWrap: { width: HAND_CARD_W - 8 },
        align: 'center',
      }).setOrigin(0.5);

      bg.on('pointerdown', () => {
        if (this._selectedHandIndex === i) {
          this._playCardFromHand(i);
          return;
        }
        this._selectedHandIndex = i;
        this._renderHand();
      });

      const items = [bg, name, cost, atk, keywords];
      if (this.textures.exists(card.id)) {
        items.push(this.add.image(x, cardY - 44, card.id).setDisplaySize(HAND_CARD_W - 6, 44));
      }
      this._handRow.container.add(items);
    });

    this._clampScrollRow(this._handRow, hand.length * (HAND_CARD_W + 10) - 10);
  }

  _createScrollableRow(x, y, w, h) {
    const row = {
      x,
      y,
      w,
      h,
      container: this.add.container(x, y),
      minX: x,
      maxX: x,
    };

    const maskGfx = this.make.graphics();
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillRect(x, y, w, h);
    row.container.setMask(maskGfx.createGeometryMask());

    const dragZone = this.add.zone(x + w / 2, y + h / 2, w, h).setInteractive();
    let dragging = false;
    let startX = 0;
    let baseX = x;
    let dragDist = 0;

    dragZone.on('pointerdown', (pointer) => {
      dragging = true;
      dragDist = 0;
      startX = pointer.x;
      baseX = row.container.x;
    });

    this.input.on('pointermove', (pointer) => {
      if (!dragging) return;
      dragDist += Math.abs(pointer.velocity.x);
      const nextX = baseX + (pointer.x - startX);
      row.container.x = Phaser.Math.Clamp(nextX, row.minX, row.maxX); // eslint-disable-line no-undef
    });

    const stop = () => {
      dragging = false;
    };
    this.input.on('pointerup', stop);
    this.input.on('pointerupoutside', stop);

    return row;
  }

  _clampScrollRow(row, contentWidth) {
    const delta = Math.max(0, contentWidth - row.w);
    row.minX = row.x - delta;
    row.maxX = row.x;
    row.container.x = Phaser.Math.Clamp(row.container.x, row.minX, row.maxX); // eslint-disable-line no-undef
  }

  _toggleLog(show) {
    if (show === this._logOverlayVisible) return;
    this._logOverlayVisible = show;
    this._refreshLogOverlay();

    if (show) {
      this._logOverlay.setVisible(true);
      this.tweens.add({
        targets: this._logOverlay,
        y: 0,
        duration: 180,
        ease: 'Quad.Out',
      });
      return;
    }

    this.tweens.add({
      targets: this._logOverlay,
      y: this.scale.height,
      duration: 180,
      ease: 'Quad.In',
      onComplete: () => this._logOverlay.setVisible(false),
    });
  }

  _log(msg) {
    this._logLines.unshift(msg);
    if (this._logLines.length > 12) this._logLines.pop();
    this._refreshLogOverlay();
  }

  _refreshLogOverlay() {
    if (!this._logOverlayText) return;
    this._logOverlayText.setText(this._logLines.slice(0, 8).join('\n'));
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

  _makeButton(x, y, width, height, label, onClick, color = 0x16213e, fontSize = MOBILE.buttonFontSize, textColor = '#ffffff') {
    const bg = this.add
      .rectangle(x, y, width, height, color)
      .setStrokeStyle(2, 0xf0a500)
      .setInteractive({ useHandCursor: true });

    const text = this.add
      .text(x, y, label, {
        fontSize,
        fontFamily: 'Arial, sans-serif',
        color: textColor,
      })
      .setOrigin(0.5);

    bg.on('pointerdown', onClick);

    return { bg, text };
  }

  _getAllCards() {
    try {
      const custom = JSON.parse(localStorage.getItem(STORAGE_KEY_CUSTOM) || '[]');
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
    } catch {
      // fall back to default deck
    }
    return STARTER_CARDS.filter((c) => c.unlocked).slice(0, 15);
  }

  _buildAIDeck(allCards) {
    const pool = allCards.filter((c) => c.tier === 1);
    const shuffled = shuffleArray([...pool]);
    return shuffled.slice(0, Math.min(15, shuffled.length));
  }
}