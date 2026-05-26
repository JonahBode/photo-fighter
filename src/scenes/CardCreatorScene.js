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
    this._uploadMode = 'single';
    this._cardNameInput = null;
    this._previewImage = null;
    this._boundFileInput = null;
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

    this._makeButton(cx, 362, 'Upload Card Image', () => this._triggerUpload('single'));
    this._makeButton(cx, 426, 'Save Single Card', () => this._saveCard());
    this._makeButton(cx, 490, 'Import Tier Screenshot', () => this._triggerUpload('tierBoard'));

    const cards = this._loadCustomCards();
    this._countText = this.add
      .text(cx, height - 152, `Saved custom cards: ${cards.length}`, {
        fontSize: MOBILE.bodyFontSize,
        fontFamily: 'Arial, sans-serif',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    this.add
      .text(
        cx,
        height - 124,
        'Tier import: upload one board screenshot, then set rows/columns.\nBottom row becomes unlocked Tier 1.',
        {
          fontSize: '12px',
          fontFamily: 'Arial, sans-serif',
          color: '#888888',
          align: 'center',
        }
      )
      .setOrigin(0.5);

    this._statusText = this.add
      .text(cx, height - 84, '', {
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

    if (this._boundFileInput) {
      input.removeEventListener('change', this._boundFileInput);
    }

    this._boundFileInput = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64 = evt.target.result;
        if (this._uploadMode === 'tierBoard') {
          this._importTierBoard(base64);
          return;
        }

        this._pendingImage = base64;
        this._showImagePreview(this._pendingImage);
        this._setStatus('Image loaded! Give it a name and save.', '#44ff88');
      };
      reader.readAsDataURL(file);
      input.value = '';
    };

    input.addEventListener('change', this._boundFileInput);
  }

  _triggerUpload(mode = 'single') {
    this._uploadMode = mode;
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

  _importTierBoard(base64) {
    const rows = this._promptNumber('Tier rows (bottom row is Tier 1):', 5, 2, 8);
    if (rows == null) return;
    const cols = this._promptNumber('Cards per row (columns):', 6, 1, 12);
    if (cols == null) return;
    const leftPct = this._promptNumber('Left crop % (skip row labels area):', 14, 0, 45);
    if (leftPct == null) return;
    const rightPct = this._promptNumber('Right crop %:', 2, 0, 45);
    if (rightPct == null) return;
    const topPct = this._promptNumber('Top crop %:', 6, 0, 45);
    if (topPct == null) return;
    const bottomPct = this._promptNumber('Bottom crop %:', 2, 0, 45);
    if (bottomPct == null) return;

    const image = new Image();
    image.onload = () => {
      const imported = this._sliceTierBoard(image, {
        rows,
        cols,
        leftPct,
        rightPct,
        topPct,
        bottomPct,
      });

      if (imported.length === 0) {
        this._setStatus('No card cells detected. Try adjusting crop/rows/columns.', '#ff6644');
        return;
      }

      const cards = this._loadCustomCards();
      cards.push(...imported);
      this._saveCustomCards(cards);
      this._countText.setText(`Saved custom cards: ${cards.length}`);
      this._setStatus(
        `Imported ${imported.length} cards from screenshot. Bottom row starts unlocked.`,
        '#44ff88'
      );
    };
    image.onerror = () => this._setStatus('Could not read screenshot image.', '#ff6644');
    image.src = base64;
  }

  _sliceTierBoard(image, options) {
    const {
      rows, cols, leftPct, rightPct, topPct, bottomPct,
    } = options;
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);

    const boardX = Math.floor((leftPct / 100) * image.width);
    const boardY = Math.floor((topPct / 100) * image.height);
    const boardW = Math.max(1, Math.floor(image.width * (1 - ((leftPct + rightPct) / 100))));
    const boardH = Math.max(1, Math.floor(image.height * (1 - ((topPct + bottomPct) / 100))));
    const cellW = boardW / cols;
    const cellH = boardH / rows;
    const created = [];
    const rnd = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;

    for (let row = 0; row < rows; row += 1) {
      const y = boardY + row * cellH;
      const tier = Math.max(1, rows - row);
      for (let col = 0; col < cols; col += 1) {
        const x = boardX + col * cellW;
        if (!this._looksLikeCardCell(ctx, x, y, cellW, cellH)) continue;

        const crop = document.createElement('canvas');
        crop.width = Math.max(1, Math.floor(cellW));
        crop.height = Math.max(1, Math.floor(cellH));
        const cropCtx = crop.getContext('2d');
        cropCtx.drawImage(
          canvas,
          Math.floor(x),
          Math.floor(y),
          crop.width,
          crop.height,
          0,
          0,
          crop.width,
          crop.height
        );

        const imageData = crop.toDataURL('image/webp', 0.88);
        const card = createCard({
          id: `tier_import_${Date.now()}_${row}_${col}_${Math.random().toString(36).slice(2, 6)}`,
          name: `Tier ${tier} Card ${created.length + 1}`,
          image: imageData,
          tier,
          cost: rnd(1, Math.min(7, Math.max(1, tier + 2))),
          hp: rnd(14 + tier * 2, 30 + tier * 4),
          attack: [rnd(2 + tier, 4 + tier), rnd(6 + tier, 10 + tier * 2)],
          defense: rnd(0, Math.min(6, tier + 1)),
          speed: rnd(2, 9),
          critChance: parseFloat((Math.min(0.35, 0.08 + tier * 0.02)).toFixed(2)),
          critMultiplier: tier >= 3 ? 2.0 : 1.5,
          category: CATEGORIES[rnd(0, CATEGORIES.length - 1)],
          keywords: [],
          abilities: [],
          flavorText: '"Imported from your tier board screenshot."',
          unlocked: tier === 1,
        });

        created.push(card);
      }
    }

    return created;
  }

  _looksLikeCardCell(ctx, x, y, w, h) {
    const sx = Math.max(0, Math.floor(x));
    const sy = Math.max(0, Math.floor(y));
    const sw = Math.max(1, Math.floor(w));
    const sh = Math.max(1, Math.floor(h));

    const data = ctx.getImageData(sx, sy, sw, sh).data;
    let minLum = 255;
    let maxLum = 0;
    let alphaTotal = 0;
    let sampled = 0;
    const step = Math.max(1, Math.floor(Math.min(sw, sh) / 10));

    for (let py = 0; py < sh; py += step) {
      for (let px = 0; px < sw; px += step) {
        const i = (py * sw + px) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        minLum = Math.min(minLum, lum);
        maxLum = Math.max(maxLum, lum);
        alphaTotal += a;
        sampled += 1;
      }
    }

    if (!sampled) return false;
    const avgAlpha = alphaTotal / (sampled * 255);
    const contrast = maxLum - minLum;

    return avgAlpha > 0.2 && contrast > 22;
  }

  _promptNumber(message, defaultValue, min, max) {
    const raw = window.prompt(message, `${defaultValue}`);
    if (raw === null) return null;
    const value = Number.parseInt(raw, 10);
    if (!Number.isFinite(value)) return null;
    return Math.min(max, Math.max(min, value));
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
