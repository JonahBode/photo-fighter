/**
 * DeckBuilderScene.js
 * Lets the player assemble a deck of 15–20 cards from their unlocked collection.
 * The chosen deck IDs are saved to localStorage under 'photoFighterPlayerDeck'.
 */

import STARTER_CARDS from '../data/starterCards.js';
import ProgressionManager from '../systems/ProgressionManager.js';

const STORAGE_KEY_DECK = 'photoFighterPlayerDeck';
const STORAGE_KEY_CUSTOM = 'photoFighterCustomCards';
const MIN_DECK = 15;
const MAX_DECK = 20;

export default class DeckBuilderScene extends Phaser.Scene { // eslint-disable-line no-undef
  constructor() {
    super({ key: 'DeckBuilderScene' });
    this._selectedIds = new Set(); // card IDs currently in the deck
    this._cardButtons = [];
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;

    // ── Background ────────────────────────────────────────────────────────────
    this.add.rectangle(cx, height / 2, width, height, 0x0f0f23);

    // ── Title ─────────────────────────────────────────────────────────────────
    this.add
      .text(cx, 36, '🃏  Deck Builder', {
        fontSize: '36px',
        fontFamily: 'Arial Black, sans-serif',
        color: '#f0a500',
        stroke: '#000',
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    // ── Load data ─────────────────────────────────────────────────────────────
    const progression = new ProgressionManager();
    const customCards = this._loadCustomCards();
    const allCards = [...STARTER_CARDS, ...customCards];
    const available = progression.getUnlockedCards(allCards);

    // Pre-populate from saved deck
    const savedDeck = this._loadSavedDeck();
    savedDeck.forEach((id) => this._selectedIds.add(id));

    // ── Deck count label ──────────────────────────────────────────────────────
    this._deckCountText = this.add
      .text(cx, 76, this._deckCountLabel(), {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#cccccc',
      })
      .setOrigin(0.5);

    // ── Card grid ─────────────────────────────────────────────────────────────
    this._renderCardGrid(available);

    // ── Action buttons ────────────────────────────────────────────────────────
    this._makeButton(width - 180, height - 50, '💾  Save Deck', () => this._saveDeck());
    this._makeButton(180, height - 50, '← Back', () => this.scene.start('MainMenuScene'));

    // ── Status ────────────────────────────────────────────────────────────────
    this._statusText = this.add
      .text(cx, height - 50, '', {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#44ff88',
      })
      .setOrigin(0.5);
  }

  // ─── Card grid ───────────────────────────────────────────────────────────────

  _renderCardGrid(cards) {
    const cols = 8;
    const cardW = 130;
    const cardH = 90;
    const padX = 18;
    const padY = 12;
    const startX = 80;
    const startY = 120;

    cards.forEach((card, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + padX);
      const y = startY + row * (cardH + padY);

      this._renderMiniCard(card, x, y, cardW, cardH);
    });
  }

  _renderMiniCard(card, x, y, w, h) {
    const isSelected = this._selectedIds.has(card.id);
    const borderColor = isSelected ? 0x44ff88 : 0x444466;

    const bg = this.add
      .rectangle(x + w / 2, y + h / 2, w, h, 0x1a1a3e)
      .setStrokeStyle(2, borderColor)
      .setInteractive({ useHandCursor: true });

    const nameText = this.add
      .text(x + w / 2, y + h / 2 - 10, card.name, {
        fontSize: '13px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        wordWrap: { width: w - 8 },
        align: 'center',
      })
      .setOrigin(0.5);

    const tierText = this.add
      .text(x + w / 2, y + h / 2 + 16, `Tier ${card.tier} · ${card.category}`, {
        fontSize: '11px',
        fontFamily: 'Arial, sans-serif',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    const costText = this.add
      .text(x + w - 8, y + 8, `${card.cost}💎`, {
        fontSize: '12px',
        fontFamily: 'Arial, sans-serif',
        color: '#88aaff',
      })
      .setOrigin(1, 0);

    // Toggle selection on click
    bg.on('pointerdown', () => {
      if (this._selectedIds.has(card.id)) {
        this._selectedIds.delete(card.id);
        bg.setStrokeStyle(2, 0x444466);
      } else {
        if (this._selectedIds.size >= MAX_DECK) {
          this._setStatus(`Deck is full (max ${MAX_DECK} cards).`, '#ff6644');
          return;
        }
        this._selectedIds.add(card.id);
        bg.setStrokeStyle(2, 0x44ff88);
      }
      this._deckCountText.setText(this._deckCountLabel());
    });

    bg.on('pointerover', () => bg.setFillStyle(0x2a2a5e));
    bg.on('pointerout', () => bg.setFillStyle(0x1a1a3e));

    return { bg, nameText, tierText, costText };
  }

  // ─── Save deck ───────────────────────────────────────────────────────────────

  _saveDeck() {
    if (this._selectedIds.size < MIN_DECK) {
      this._setStatus(`Need at least ${MIN_DECK} cards (have ${this._selectedIds.size}).`, '#ff6644');
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY_DECK, JSON.stringify([...this._selectedIds]));
      this._setStatus('✅ Deck saved!', '#44ff88');
    } catch (e) {
      this._setStatus('Error saving deck.', '#ff6644');
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  _deckCountLabel() {
    return `Deck: ${this._selectedIds.size} / ${MAX_DECK}  (min ${MIN_DECK})`;
  }

  _loadSavedDeck() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DECK);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  _loadCustomCards() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CUSTOM);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  _setStatus(msg, color = '#ffffff') {
    if (this._statusText) {
      this._statusText.setText(msg).setStyle({ color });
    }
  }

  _makeButton(x, y, label, onClick) {
    const btn = this.add
      .text(x, y, label, {
        fontSize: '22px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        backgroundColor: '#16213e',
        padding: { left: 20, right: 20, top: 10, bottom: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ color: '#f0a500' }));
    btn.on('pointerout', () => btn.setStyle({ color: '#ffffff' }));
    btn.on('pointerdown', onClick);

    return btn;
  }
}
