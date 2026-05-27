# ⚔ Photo Fighter

A browser-based, head-to-head card combat game where **you supply the fighters**.
Upload your own photos, build a deck, and battle an AI opponent in a simplified
Magic: The Gathering-inspired combat system — with randomised damage, crit hits,
keyword abilities, and a progression system that unlocks new tiers as you win.

---

## 🚀 How to run locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)

### Steps

```bash
# 1. Install dependencies (only Vite as a dev server)
npm install

# 2. Start the development server
npm run dev
```

Open the URL printed in your terminal (usually `http://localhost:5173`) in any
modern browser. No backend or build step required for development.

To produce a production-ready bundle:

```bash
npm run build      # outputs to dist/
npm run preview    # serve the built files locally
```

---

## 🃏 How the card system works

The shipped starter pool now includes **34 cards across tiers 1–3** (expanded
from the original 20-card pool), with Tier 1 available immediately and higher
tiers unlocked through progression.

Every card has the following fields:

| Field | Description |
|---|---|
| `name` | Display name |
| `image` | Base64 data URL (user upload) or placeholder URL |
| `tier` | 1+ (bottom/basic row is tier 1, rows above are higher tiers) |
| `cost` | Mana cost to play (1–7) |
| `hp` | Health points (10–50) |
| `attack` | Damage range `[min, max]` |
| `defense` | Flat damage reduction applied to incoming hits |
| `speed` | Determines attack order (higher = attacks first) |
| `critChance` | Probability of a critical hit (0.0–1.0) |
| `critMultiplier` | Damage multiplier on a crit (e.g. 1.5×) |
| `keywords` | Array of keyword strings: `Taunt`, `Poison`, `Shield`, `Lifesteal`, `Haste`, `Stun` |
| `abilities` | Human-readable ability descriptions |
| `flavorText` | Optional fun text shown on the card |
| `category` | `Tank`, `Assassin`, `Mage`, or `Support` |

### Keywords

| Keyword | Effect |
|---|---|
| **Taunt** | Enemy attacks must target this card |
| **Poison** | Deals 2 damage/turn for 3 turns after hitting |
| **Shield** | Blocks the first instance of damage |
| **Lifesteal** | Heals attacker for 50 % of damage dealt |
| **Haste** | Can attack the turn it's played |
| **Stun** | 20 % chance to skip enemy's next turn |

### Combat formula

```
rawDamage  = random integer within attack [min, max]
if crit:   rawDamage × critMultiplier
finalDamage = max(1, rawDamage − defender.defense)
```

Speed determines turn order; ties are resolved randomly.

### Importing a tier-list screenshot

You can now import a full tier-board screenshot directly in **Card Creator**:

1. Tap **Import Tier Screenshot** and choose your image.
2. Enter row/column counts and crop percentages when prompted.
3. The importer slices cards from the board grid.
4. **Bottom row** imports as **Tier 1 (unlocked)**; each row above imports as a higher locked tier.

After import, go to **Build Deck** to pick unlocked cards and save a playable deck.

---

## 📈 How progression works

- **Wins** → unlock 1–2 random cards from the next tier.
- **Every 3 losses** → consolation reward: 1 random card from the current tier.
- Tiers advance automatically once all cards in a tier are unlocked.
- Stats (wins, losses, streaks, highest tier) are tracked in `localStorage`.

---

## 🎮 UI & UX updates

### Battle scene

- Card images are shown on both field cards and hand cards.
- Opening hand is **4 cards** (reduced from 5 for better mobile readability).
- Hand cards are sized to fit cleanly in portrait (390 × 844) without overlap.
- Selected hand cards visually lift when tapped.
- Layout labels are shown for **ENEMY FIELD**, **YOUR FIELD**, and **YOUR HAND**.
- Forfeit uses a confirmation overlay (**Yes / Cancel**) instead of instant exit.
- A helper hint is shown during battle: *Tap to select · Tap again to play*.

### Deck builder scene

- Card images are shown in the card grid tiles.
- Card tiles are 110px tall to fit image + name + tier/cost info cleanly.

---

## 🗂 Project structure

```
photo-fighter/
├── index.html              # Game page — loads Phaser from CDN
├── src/
│   ├── main.js             # Phaser game entry point
│   ├── config.js           # Scene list and Phaser settings
│   ├── scenes/
│   │   ├── BootScene.js         # Asset loading + localStorage init
│   │   ├── MainMenuScene.js     # Title screen
│   │   ├── CardCreatorScene.js  # Upload photos, name and save custom cards
│   │   ├── DeckBuilderScene.js  # Pick 15–20 cards for your deck
│   │   ├── BattleScene.js       # Turn-based combat loop
│   │   └── ProgressionScene.js  # Post-match rewards
│   ├── systems/
│   │   ├── CardSchema.js        # Card data model + createCard factory
│   │   ├── DeckManager.js       # Deck / hand / draw / fatigue logic
│   │   ├── CombatManager.js     # Damage calc, crits, keyword effects
│   │   ├── ManaSystem.js        # Per-turn mana gain and spending
│   │   ├── AIManager.js         # AI decision logic (weighted random)
│   │   ├── ProgressionManager.js# Win/loss tracking, card unlocks
│   │   └── RandomUtils.js       # Seeded RNG, shuffles, crit rolls
│   └── data/
│       ├── starterCards.js      # 34 starter cards across tiers 1–3
│       └── keywords.js          # Keyword definitions and descriptions
└── assets/                 # Placeholder for custom images/fonts
```

---

## 🛠 Tech stack

| Layer | Technology |
|---|---|
| Game engine | [Phaser 3](https://phaser.io/) (loaded from CDN) |
| Dev server | [Vite](https://vitejs.dev/) |
| Persistence | Browser `localStorage` |
| Randomisation | Plain JS (`Math.random` + Mulberry32 seeded RNG) |
| Image uploads | Browser `FileReader` API (no server needed) |
| Packaging | Export as HTML5 → deploy anywhere / upload to itch.io |