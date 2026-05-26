/**
 * ManaSystem.js
 * Manages mana for a single player (player or AI).
 * Rules:
 *  - Both sides start with 1 mana on turn 1.
 *  - Max mana increases by 1 each turn, capped at MAX_MANA (10).
 *  - Current mana refills to max at the start of every turn.
 *  - Cards cost mana to play; canPlay() checks affordability.
 */

const MAX_MANA = 10;

export default class ManaSystem {
  /**
   * @param {number} [startingMana=1] - Initial max mana (usually 1).
   */
  constructor(startingMana = 1) {
    this.maxMana = startingMana;
    this.currentMana = startingMana;
  }

  // ─── Turn lifecycle ─────────────────────────────────────────────────────────

  /**
   * Call at the start of each turn.
   * Increases max mana by 1 (up to the cap) and refills current mana.
   */
  onTurnStart() {
    this.maxMana = Math.min(this.maxMana + 1, MAX_MANA);
    this.currentMana = this.maxMana;
  }

  // ─── Spending mana ──────────────────────────────────────────────────────────

  /**
   * Determine whether a card is affordable with current mana.
   *
   * @param {import('./CardSchema.js').Card} card
   * @returns {boolean}
   */
  canPlay(card) {
    return this.currentMana >= card.cost;
  }

  /**
   * Spend mana to play a card.
   * Throws if there is not enough mana (call canPlay first).
   *
   * @param {import('./CardSchema.js').Card} card
   */
  spend(card) {
    if (!this.canPlay(card)) {
      throw new Error(
        `Not enough mana to play "${card.name}" (cost: ${card.cost}, have: ${this.currentMana})`
      );
    }
    this.currentMana -= card.cost;
  }

  // ─── Accessors ──────────────────────────────────────────────────────────────

  /** @returns {{ current: number, max: number }} */
  getState() {
    return { current: this.currentMana, max: this.maxMana };
  }

  /** Reset mana to initial state (call between matches). */
  reset() {
    this.maxMana = 1;
    this.currentMana = 1;
  }
}
