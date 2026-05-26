/**
 * DeckBuilderScene.js
 * Lets the player assemble a deck of 15–20 cards from their unlocked collection.
 * The chosen deck IDs are saved to localStorage under 'photoFighterPlayerDeck'.
 */

import STARTER_CARDS from '../data/starterCards.js';
import ProgressionManager from '../systems/ProgressionManager.js';
import { MOBILE } from '../utils/MobileLayout.js';

const STORAGE_KEY_DECK = 'photoFighterPlayerDeck';
const STORAGE_KEY_CUSTOM = 'photoFighterCustomCards';
const MIN_DECK = 15;
const MAX_DECK = 20;

export default class DeckBuilderScene extends Phaser.Scene { // eslint-disable-line no-undef
  constructor() {
    super({ key: 'DeckBuilderScene' });
    this._selectedIds = new Set();
    this._gridContainer = null;
    this._gridMeta = null;
    this._statsOverlay = [];
    this._infoTapped = false;
    this._isDragging = false;
  }

  preload() {
    // Load all card images so they display in the grid
    const customCards = this._loadCustomCards();
    const allCards = [...STARTER_CARDS, ...customCards];
    allCards.forEach((card) => {
      if (card.image && !this.textures.exists(card.id)) {
        this.load.image(card.id, card.image);
      }
    });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    this.input.setTopOnly(false);

    this.add.rectangle(cx, height / 2, width, height, 0x0f0f23);

    this.add
      .text(cx, 44, 'Deck Builder', {
        fontSize: '36px',
        fontFamily: 'Arial Black, sans-serif',
        color: '#f0a500',
        stroke: '#000',
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    const customCards = this._loadCustomCards();
    const allCards = [...STARTER_CARDS, ...customCards];
    let available;
    try {
      const progression = new ProgressionManager();
      available = progression.getUnlockedCards(allCards);
    } catch (e) {
      console.warn('DeckBuilder: ProgressionManager failed, showing tier 1 cards', e);
      available = allCards.filter((c) => c.tier === 1 && c.unlocked);
    }
    if (!available.length) {
      available = allCards.filter((c) => c.tier === 1 && c.unlocked);
    }

    const savedDeck = this._loadSavedDeck();
    savedDeck.forEach((id) => this._selectedIds.add(id));

    this._deckCountText = this.add
      .text(cx, 84, this._deckCountLabel(), {
        fontSize: '20px',
        fontFamily: 'Arial, sans-serif',
        color: '#cccccc',
      })
      .setOrigin(0.5);

    this._renderCardGrid(available);

    this._statusText = this.add
      .text(cx, height - 172, '', {
        fontSize: MOBILE.bodyFontSize,
        fontFamily: 'Arial, sans-serif',
        color: '#44ff88',
        wordWrap: { width: width - MOBILE.padding * 2 },
        align: 'center',
      })
      .setOrigin(0.5);

    this._makeButton(cx, height - 108, 'Save Deck', () => this._saveDeck());
    this._makeButton(cx, height - 44, 'Back', () => this.scene.start('MainMenuScene'));
  }

  _renderCardGrid(cards) {
    const cols = 3;
    const cardW = 110;
    const cardH = 110; // taller to accommodate image
    const gap = 6;
    const viewportX = 24;
    const viewportY = 116;
    const viewportW = 342;
    const viewportH = 520;

    this.add.rectangle(viewportX + viewportW / 2, viewportY + viewportH / 2, viewportW, viewportH, 0x16213e, 0.45)
      .setStrokeStyle(2, 0x2a3b56);

    this._gridContainer = this.add.container(viewportX, viewportY);

    cards.forEach((card, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * (cardW + gap);
      const y = row * (cardH + gap);
      this._renderMiniCard(card, x, y, cardW, cardH);
    });

    const rowCount = Math.ceil(cards.length / cols);
    const contentHeight = rowCount * (cardH + gap) - gap;
    this._gridMeta = {
      viewportY,
      viewportH,
      contentHeight,
      minY: Math.min(0, viewportH - contentHeight),
      maxY: 0,
    };

    const maskGfx = this.make.graphics();
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillRect(viewportX, viewportY, viewportW, viewportH);
    const mask = maskGfx.createGeometryMask();
    this._gridContainer.setMask(mask);

    const dragZone = this.add.zone(viewportX + viewportW / 2, viewportY + viewportH / 2, viewportW, viewportH)
      .setRectangleDropZone(viewportW, viewportH)
      .setInteractive();

    let startY = 0;
    let baseY = 0;

    dragZone.on('pointerdown', (pointer) => {
      this._isDragging = false;
      startY = pointer.y;
      baseY = this._gridContainer.y;
    });

    this.input.on('pointermove', (pointer) => {
      if (Math.abs(pointer.y - startY) > 8) {
        this._isDragging = true;
      }
      if (!this._isDragging) return;
      const nextY = baseY + (pointer.y - startY);
      this._gridContainer.y = Phaser.Math.Clamp(nextY, viewportY + this._gridMeta.minY, viewportY + this._gridMeta.maxY); // eslint-disable-line no-undef
    });

    const stopDrag = () => {
      // reset dragging flag after a short delay so pointerup handlers can read it
      this.time.delayedCall(50, () => { this._isDragging = false; });
    };
    this.input.on('pointerup', stopDrag);
    this.input.on('pointerupoutside', stopDrag);
  }

  _renderMiniCard(card, x, y, w, h) {
    const isSelected = this._selectedIds.has(card.id);
    const borderColor = isSelected ? 0x44ff88 : 0x444466;

    const bg = this.add
      .rectangle(x + w / 2, y + h / 2, w, h, 0x1a1a3e)
      .setStrokeStyle(2, borderColor)
      .setInteractive({ useHandCursor: true });

    const items = [bg];

    // Card image (top portion of card)
    if (this.textures.exists(card.id)) {
      const img = this.add.image(x + w / 2, y + 28, card.id).setDisplaySize(w - 8, 44);
      items.push(img);
    }

    const nameText = this.add
      .text(x + w / 2, y + h / 2 + 14, card.name, {
        fontSize: '11px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        wordWrap: { width: w - 8 },
        align: 'center',
      })
      .setOrigin(0.5);

    const tierText = this.add
      .text(x + w / 2, y + h - 14, `Tier ${card.tier}  •  Cost ${card.cost}`, {
        fontSize: '9px',
        fontFamily: 'Arial, sans-serif',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    // Info button — top-left corner of card
    const infoBtnX = x + 10;
    const infoBtnY = y + 10;
    const infoBtn = this.add
      .rectangle(infoBtnX, infoBtnY, 18, 18, 0x223355)
      .setStrokeStyle(1, 0x5588bb)
      .setInteractive({ useHandCursor: true });
    const infoBtnLabel = this.add
      .text(infoBtnX, infoBtnY, 'ℹ', {
        fontSize: '11px',
        fontFamily: 'Arial, sans-serif',
        color: '#88ccff',
      })
      .setOrigin(0.5);

    items.push(nameText, tierText, infoBtn, infoBtnLabel);

    infoBtn.on('pointerdown', () => {
      this._infoTapped = true;
    });
    infoBtn.on('pointerup', () => {
      if (this._infoTapped && !this._isDragging) {
        this._infoTapped = false;
        this._showStatsOverlay(card);
      } else {
        this._infoTapped = false;
      }
    });

    bg.on('pointerdown', () => {
      this._infoTapped = false; // reset — info button sets its own flag
    });
    bg.on('pointerup', () => {
      if (this._isDragging || this._infoTapped) {
        this._infoTapped = false;
        return;
      }
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

    this._gridContainer.add(items);
  }

  _showStatsOverlay(card) {
    this._hideStatsOverlay();
    const { width, height } = this.scale;
    const cx = width / 2;
    const objs = [];

    // Semi-transparent dark backdrop
    const darkBg = this.add
      .rectangle(cx, height / 2, width, height, 0x000000, 0.78)
      .setInteractive()
      .setDepth(10);
    darkBg.on('pointerdown', () => this._hideStatsOverlay());
    objs.push(darkBg);

    // Panel
    const panelW = 340;
    const panelH = 480;
    const panelY = height / 2;
    const panelTop = panelY - panelH / 2;
    objs.push(
      this.add
        .rectangle(cx, panelY, panelW, panelH, 0x1a1a3e)
        .setStrokeStyle(2, 0xffffff)
        .setDepth(10)
    );

    // Card name
    objs.push(
      this.add
        .text(cx, panelTop + 32, card.name, {
          fontSize: '24px',
          fontFamily: 'Arial Black, sans-serif',
          color: '#f0a500',
        })
        .setOrigin(0.5)
        .setDepth(10)
    );

    // Category + Tier
    objs.push(
      this.add
        .text(cx, panelTop + 64, `${card.category || ''}  •  Tier ${card.tier}`, {
          fontSize: '16px',
          fontFamily: 'Arial, sans-serif',
          color: '#aaaaaa',
        })
        .setOrigin(0.5)
        .setDepth(10)
    );

    // Stats rows
    const statsLeft = cx - 120;
    const stats = [
      `❤ HP: ${card.hp}`,
      `⚔ ATK: ${card.attack[0]} – ${card.attack[1]}`,
      `🛡 DEF: ${card.defense}`,
      `⚡ SPD: ${card.speed}`,
      `💎 Cost: ${card.cost}`,
      `🎯 Crit: ${Math.round((card.critChance || 0) * 100)}%`,
    ];
    let yPos = panelTop + 100;
    stats.forEach((line) => {
      objs.push(
        this.add
          .text(statsLeft, yPos, line, {
            fontSize: '16px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
          })
          .setOrigin(0, 0.5)
          .setDepth(10)
      );
      yPos += 28;
    });

    // Keywords
    if (card.keywords && card.keywords.length) {
      objs.push(
        this.add
          .text(cx, yPos + 4, card.keywords.join(' · '), {
            fontSize: '16px',
            fontFamily: 'Arial, sans-serif',
            color: '#f0a500',
          })
          .setOrigin(0.5)
          .setDepth(10)
      );
      yPos += 32;
    }

    // Flavor text
    if (card.flavorText) {
      objs.push(
        this.add
          .text(cx, yPos + 8, card.flavorText, {
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            color: '#aaaaaa',
            fontStyle: 'italic',
            wordWrap: { width: panelW - 40 },
            align: 'center',
          })
          .setOrigin(0.5)
          .setDepth(10)
      );
      yPos += 48;
    }

    // Abilities
    if (card.abilities && card.abilities.length) {
      card.abilities.forEach((ab) => {
        objs.push(
          this.add
            .text(cx, yPos + 8, ab, {
              fontSize: '14px',
              fontFamily: 'Arial, sans-serif',
              color: '#ffffff',
              wordWrap: { width: panelW - 40 },
              align: 'center',
            })
            .setOrigin(0.5)
            .setDepth(10)
        );
        yPos += 44;
      });
    }

    // Close button — anchored to bottom of panel
    const closeBtnY = panelY + panelH / 2 - 34;
    const closeBtn = this.add
      .rectangle(cx, closeBtnY, panelW - 20, 52, 0x2a2a5e)
      .setStrokeStyle(2, 0xf0a500)
      .setInteractive({ useHandCursor: true })
      .setDepth(10);
    const closeBtnText = this.add
      .text(cx, closeBtnY, '✕ Close', {
        fontSize: '22px',
        fontFamily: 'Arial, sans-serif',
        color: '#f0a500',
      })
      .setOrigin(0.5)
      .setDepth(10);
    closeBtn.on('pointerdown', () => this._hideStatsOverlay());
    objs.push(closeBtn, closeBtnText);

    this._statsOverlay = objs;
  }

  _hideStatsOverlay() {
    this._statsOverlay.forEach((obj) => obj.destroy());
    this._statsOverlay = [];
  }

  _saveDeck() {
    if (this._selectedIds.size < MIN_DECK) {
      this._setStatus(`Need at least ${MIN_DECK} cards (have ${this._selectedIds.size}).`, '#ff6644');
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY_DECK, JSON.stringify([...this._selectedIds]));
      this._setStatus('Deck saved!', '#44ff88');
    } catch (e) {
      this._setStatus('Error saving deck.', '#ff6644');
    }
  }

  _deckCountLabel() {
    return `${this._selectedIds.size} / ${MAX_DECK} cards selected`;
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