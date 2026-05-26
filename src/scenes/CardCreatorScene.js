/**
 * CardCreatorScene.js
 * Lets the player upload their own photos and name cards.
 * Created cards are saved to localStorage under 'photoFighterCustomCards'.
 */

import { createCard } from '../systems/CardSchema.js';
import { MOBILE } from '../utils/MobileLayout.js';

const STORAGE_KEY = 'photoFighterCustomCards';
const CATEGORIES = ['Tank', 'Assassin', 'Mage', 'Support'];
const KEYWORD_POOL = ['Taunt', 'Poison', 'Shield', 'Lifesteal', 'Haste', 'Stun'];

export default class CardCreatorScene extends Phaser.Scene { // eslint-disable-line no-undef
  constructor() {
    super({ key: 'CardCreatorScene' });
    this._pendingImage = null;
    this._cardNameInput = null;
    this._previewImage = null;
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;

    this.add.rectangle(cx, height / 2, width, height, 0x0f0f23);

    this.add
      .text(cx, 44, 'Card Creator', {
        fontSize: '36px',
        fontFamily: 'Arial Black, sans-serif',
        color: '#f0a500',
        stroke: '#000',
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    const previewY = 170;
    this.add.rectangle(cx, previewY, 160, 160, 0x222244).setStrokeStyle(2, 0xf0a500);
    this._previewPlaceholder = this.add
      .text(cx, previewY, 'No image\nuploaded', {
        fontSize: MOBILE.bodyFontSize,
        fontFamily: 'Arial, sans-serif',
        color: '#888888',
        align: 'center',
      })
      .setOrigin(0.5);

    this._cardNameInput = this.add
      .dom(cx, 290)
      .createFromHTML(
        '<input type="text" id="cardNameField" maxlength="24" ' +
        'placeholder="Enter card name…" ' +
        'style="width:340px;height:48px;padding:10px;font-size:18px;border-radius:8px;' +
        'border:2px solid #f0a500;background:#1a1a2e;color:#fff;text-align:center;" />'
      );

    this._makeButton(cx, 370, 'Upload Image', () => this._triggerUpload());
    this._makeButton(cx, 438, 'Save Card', () => this._saveCard());

    const cards = this._loadCustomCards();
    this._countText = this.add
      .text(cx, height - 132, `Saved custom cards: ${cards.length}`, {
        fontSize: MOBILE.bodyFontSize,
        fontFamily: 'Arial, sans-serif',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    this._statusText = this.add
      .text(cx, height - 104, '', {
        fontSize: MOBILE.bodyFontSize,
        fontFamily: 'Arial, sans-serif',
        color: '#44ff88',
        wordWrap: { width: width - MOBILE.padding * 2 },
        align: 'center',
      })
      .setOrigin(0.5);

    this._makeButton(cx, height - 44, 'Back to Menu', () => this.scene.start('MainMenuScene'));

    this._bindFileInput();
  }

  _bindFileInput() {
    const input = document.getElementById('card-image-upload');
    if (!input) return;

    input.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        this._pendingImage = evt.target.result;
        this._showImagePreview(this._pendingImage);
        this._setStatus('Image loaded! Give it a name and save.', '#44ff88');
      };
      reader.readAsDataURL(file);
      input.value = '';
    });
  }

  _triggerUpload() {
    const input = document.getElementById('card-image-upload');
    if (input) input.click();
  }

  _showImagePreview(base64) {
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

    this.textures.once('addtexture-cardPreview', () => {
      this._previewImage = this.add
        .image(this.scale.width / 2, 170, 'cardPreview')
        .setDisplaySize(152, 152)
        .setOrigin(0.5);
    });
    this.textures.addBase64('cardPreview', base64);
  }

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
      flavorText: '"A custom fighter crafted by you."',
      category,
      unlocked: true,
    });

    const cards = this._loadCustomCards();
    cards.push(card);
    this._saveCustomCards(cards);

    if (nameField) nameField.value = '';
    this._pendingImage = null;
    if (this._previewImage) {
      this._previewImage.destroy();
      this._previewImage = null;
    }
    if (this._previewPlaceholder) {
      this._previewPlaceholder.setVisible(true);
    }

    this._countText.setText(`Saved custom cards: ${cards.length}`);
    this._setStatus(`Saved "${card.name}" to your collection.`, '#44ff88');
  }

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
