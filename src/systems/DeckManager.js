/**
 * DeckManager.js
 * Handles deck construction, shuffling, drawing, and fatigue.
 *
 * Rules (from design doc):
 *  - Deck size: 15–20 cards
 *  - Hand size: 5 cards
 *  - Draw 1 card per turn
 *  - If deck is empty, the player takes escalating fatigue damage
 */

import { shuffleArray } from './RandomUtils.js';

const HAND_SIZE = 5;
const MIN_DECK_SIZE = 15;
const MAX_DECK_SIZE = 20;

export default class DeckManager {
  /**
   * @param {import('./CardSchema.js').Card[]} cards - The full deck (15–20 cards).
   * @param {() => number} [rng=Math.random] - Optional seeded RNG for shuffling.
   */
  constructor(cards, rng = Math.random) {
    if (cards.length < MIN_DECK_SIZE || cards.length > MAX_DECK_SIZE) {
      console.warn(
        `DeckManager: deck size ${cards.length} is outside the ${MIN_DECK_SIZE}–${MAX_DECK_SIZE} card range.`
      );
    }

    this.rng = rng;
    this.drawPile = shuffleArray([...cards], this.rng); // working copy, shuffled
    this.hand = [];
    this.discardPile = [];
    this.fatigueDamage = 0; // escalating damage when deck is empty
  }

  // ─── Initial hand ───────────────────────────────────────────────────────────

  /**
   * Draw the opening hand of HAND_SIZE cards.
   * Should only be called once at match start.
   */
  drawOpeningHand() {
    for (let i = 0; i < HAND_SIZE; i++) {
      this._drawOne();
    }
  }

  // ─── Per-turn draw ──────────────────────────────────────────────────────────

  /**
   * Draw one card at the start of a turn.
   * If the draw pile is empty, deal escalating fatigue damage instead.
   *
   * @returns {{ card: import('./CardSchema.js').Card|null, fatigue: number }}
   *   card    — the drawn card, or null if the deck is empty
   *   fatigue — amount of fatigue damage dealt this draw (0 if a card was drawn)
   */
  drawCard() {
    if (this.drawPile.length === 0) {
      // Deck is empty — escalating fatigue
      this.fatigueDamage += 1;
      return { card: null, fatigue: this.fatigueDamage };
    }
    const card = this._drawOne();
    return { card, fatigue: 0 };
  }

  // ─── Playing / discarding ───────────────────────────────────────────────────

  /**
   * Remove a card from hand and move it to the discard pile.
   *
   * @param {string} cardId
   * @returns {import('./CardSchema.js').Card|null} The played card, or null if not found.
   */
  playCard(cardId) {
    const index = this.hand.findIndex((c) => c.id === cardId);
    if (index === -1) return null;
    const [card] = this.hand.splice(index, 1);
    this.discardPile.push(card);
    return card;
  }

  // ─── State helpers ──────────────────────────────────────────────────────────

  /** @returns {import('./CardSchema.js').Card[]} A copy of the current hand. */
  getHand() {
    return [...this.hand];
  }

  /** @returns {number} Cards remaining in the draw pile. */
  deckSize() {
    return this.drawPile.length;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /** Draw one card from the top of the draw pile into hand. */
  _drawOne() {
    const card = this.drawPile.pop();
    this.hand.push(card);
    return card;
  }
}

export { HAND_SIZE, MIN_DECK_SIZE, MAX_DECK_SIZE };
