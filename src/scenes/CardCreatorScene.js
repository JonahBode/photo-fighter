/**
 * CardCreatorScene.js
 * Lets the player upload their own photos and name cards.
 * Created cards are saved to localStorage under 'photoFighterCustomCards'.
 *
 * Flow:
 *  1. Player clicks "Upload Image" → file picker opens.
 *  2. Image is read as base64 via FileReader.
 *  3. Player types a card name.
 *  4. Player clicks "Save Card" → card is created with random Tier 1 stats
 *     and added to the custom card pool.
 */

import { createCard } from '../systems/CardSchema.js';

const STORAGE_KEY = 'photoFighterCustomCards';
const CATEGORIES = ['Tank', 'Assassin', 'Mage', 'Support'];
const KEYWORD_POOL = ['Taunt', 'Poison', 'Shield', 'Lifesteal', 'Haste', 'Stun'];

export default class CardCreatorScene extends Phaser.Scene { // eslint-disable-line no-undef
  constructor() {
    super({ key: 'CardCreatorScene' });
    this._pendingImage = null;  // base64 string of the loaded image
    this._cardNameInput = null; // Phaser DOM element wrapping a text <input>
    this._previewImage = null;  // Phaser Image object shown as preview
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;

    // ── Background ────────────────────────────────────────────────────────────
    this.add.rectangle(cx, height / 2, width, height, 0x0f0f23);

    // ── Title ─────────────────────────────────────────────────────────────────
    this.add
      .text(cx, 40, '📷  Card Creator', {
        fontSize: '40px',
        fontFamily: 'Arial Black, sans-serif',
        color: '#f0a500',
        stroke: '#000',
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    // ── Card preview box ──────────────────────────────────────────────────────
    const previewX = 320;
    const previewY = 300;
    this.add.rectangle(previewX, previewY, 200, 260, 0x222244, 1).setOrigin(0.5);
    this.add.rectangle(previewX, previewY, 200, 260, 0xf0a500, 0)
      .setStrokeStyle(2, 0xf0a500)
      .setOrigin(0.5);

    this._previewPlaceholder = this.add
      .text(previewX, previewY, 'No image\nuploaded', {
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        color: '#888888',
        align: 'center',
      })
      .setOrigin(0.5);

    // ── Form area ─────────────────────────────────────────────────────────────
    const formX = cx + 120;

    // Card name label + DOM input
    this.add
      .text(formX, 180, 'Card Name:', {
        fontSize: '20px',
        fontFamily: 'Arial, sans-serif',
        color: '#cccccc',
      })
      .setOrigin(0.5);

    this._cardNameInput = this.add
      .dom(formX, 220)
      .createFromHTML(
        '<input type="text" id="cardNameField" maxlength="24" ' +
        'placeholder="Enter card name…" ' +
        'style="width:240px;padding:8px;font-size:18px;border-radius:6px;' +
        'border:2px solid #f0a500;background:#1a1a2e;color:#fff;text-align:center;" />'
      );

    // Upload button
    this._makeButton(formX, 300, '📁  Upload Image', () => this._triggerUpload());

    // Save button
    this._makeButton(formX, 380, '💾  Save Card', () => this._saveCard());

    // Back button
    this._makeButton(formX, 460, '← Back to Menu', () =>
      this.scene.start('MainMenuScene')
    );

    // ── Status text ───────────────────────────────────────────────────────────
    this._statusText = this.add
      .text(cx, height - 50, '', {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#44ff88',
      })
      .setOrigin(0.5);

    // ── Wire up the hidden file input ─────────────────────────────────────────
    this._bindFileInput();

    // ── Show existing custom cards count ─────────────────────────────────────
    const cards = this._loadCustomCards();
    this.add
      .text(cx, height - 90, `You have ${cards.length} custom card(s) saved.`, {
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);
  }

  // ─── File input ──────────────────────────────────────────────────────────────

  _bindFileInput() {
    const input = document.getElementById('card-image-upload');
    if (!input) return;

    input.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        this._pendingImage = evt.target.result; // base64 data URL
        this._showImagePreview(this._pendingImage);
        this._setStatus('Image loaded! Give it a name and save.', '#44ff88');
      };
      reader.readAsDataURL(file);

      // Reset so the same file can be re-selected
      input.value = '';
    });
  }

  _triggerUpload() {
    const input = document.getElementById('card-image-upload');
    if (input) input.click();
  }

  // ─── Image preview ───────────────────────────────────────────────────────────

  _showImagePreview(base64) {
    // Remove old preview texture if it exists
    if (this.textures.exists('cardPreview')) {
      this.textures.remove('cardPreview');
    }
    if (this._previewImage) {
      this._previewImage.destroy();
      this._previewImage = null;
    }
    if (this._previewPlaceholder) {
      this._previewPlaceholder.setVisible(false);
    }

    // Phaser can load a base64 image as a texture
    this.textures.once('addtexture-cardPreview', () => {
      this._previewImage = this.add
        .image(320, 300, 'cardPreview')
        .setDisplaySize(190, 190)
        .setOrigin(0.5);
    });
    this.textures.addBase64('cardPreview', base64);
  }

  // ─── Card creation ───────────────────────────────────────────────────────────

  _saveCard() {
    if (!this._pendingImage) {
      this._setStatus('Please upload an image first.', '#ff6644');
      return;
    }

    const nameField = document.getElementById('cardNameField');
    const name = nameField ? nameField.value.trim() : '';
    if (!name) {
      this._setStatus('Please enter a card name.', '#ff6644');
      return;
    }

    // Assign random Tier 1 stats with a splash of randomness
    const rnd = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
    const category = CATEGORIES[rnd(0, CATEGORIES.length - 1)];
    const kw = Math.random() < 0.5 ? [KEYWORD_POOL[rnd(0, KEYWORD_POOL.length - 1)]] : [];

    const card = createCard({
      id: `custom_${Date.now()}`,
      name,
      image: this._pendingImage,
      tier: 1,
      cost: rnd(1, 3),
      hp: rnd(15, 35),
      attack: [rnd(2, 5), rnd(6, 10)],
      defense: rnd(0, 3),
      speed: rnd(3, 8),
      critChance: parseFloat((Math.random() * 0.2).toFixed(2)),
      critMultiplier: 1.5,
      keywords: kw,
      abilities: [],
      flavorText: `"A custom fighter crafted by you."`,
      category,
      unlocked: true,
    });

    const cards = this._loadCustomCards();
    cards.push(card);
    this._saveCustomCards(cards);

    // Clear form
    if (nameField) nameField.value = '';
    this._pendingImage = null;

    this._setStatus(`✅ "${card.name}" saved to your collection!`, '#44ff88');
  }

  // ─── localStorage helpers ─────────────────────────────────────────────────────

  _loadCustomCards() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  _saveCustomCards(cards) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
    } catch (e) {
      this._setStatus('Error saving card — storage may be full.', '#ff6644');
    }
  }

  // ─── UI helpers ───────────────────────────────────────────────────────────────

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
