/**
 * AIManager.js
 * Controls the AI opponent's decisions each turn.
 *
 * Decision logic:
 *  - 60–80 % random: pick a random legal action.
 *  - 20–40 % priority: prefer lowest-HP target, prefer highest-cost playable card.
 *  - Occasionally skip playing a card entirely (random chance).
 *
 * The AI manages its own ManaSystem and DeckManager instances which are passed
 * in at construction time.
 */

import { pickOne } from './RandomUtils.js';

// Probability of making a "smart" decision vs a random one
const SMART_CHANCE = 0.3; // 30 % of the time the AI acts intelligently

export default class AIManager {
  /**
   * @param {import('./ManaSystem.js').default}  manaSystem  - AI's mana state.
   * @param {import('./DeckManager.js').default} deckManager - AI's deck / hand.
   * @param {() => number} [rng=Math.random]
   */
  constructor(manaSystem, deckManager, rng = Math.random) {
    this.mana = manaSystem;
    this.deck = deckManager;
    this.rng = rng;
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Decide which card (if any) to play from the AI's hand.
   *
   * @returns {import('./CardSchema.js').Card | null}
   */
  chooseCardToPlay() {
    const hand = this.deck.getHand();
    const affordable = hand.filter((c) => this.mana.canPlay(c));

    if (affordable.length === 0) return null;

    // Occasionally skip playing a card (~20 % of the time)
    if (this.rng() < 0.2) return null;

    if (this.rng() < SMART_CHANCE) {
      // Smart choice: play the highest-cost affordable card
      return affordable.reduce((best, c) => (c.cost > best.cost ? c : best), affordable[0]);
    }

    // Random choice
    return pickOne(affordable, this.rng);
  }

  /**
   * Choose which enemy BattleCard to attack.
   *
   * @param {import('./CombatManager.js').BattleCard[]} targets - Player's active cards.
   * @returns {import('./CombatManager.js').BattleCard | null}
   */
  chooseTarget(targets) {
    const alive = targets.filter((c) => c.currentHp > 0);
    if (alive.length === 0) return null;

    // Taunt cards must be targeted if any are present
    const taunting = alive.filter((c) => c.keywords.includes('Taunt'));
    const pool = taunting.length > 0 ? taunting : alive;

    if (this.rng() < SMART_CHANCE) {
      // Smart choice: attack the card with the lowest current HP
      return pool.reduce((lowest, c) =>
        c.currentHp < lowest.currentHp ? c : lowest, pool[0]
      );
    }

    // Random choice
    return pickOne(pool, this.rng);
  }

  /**
   * Execute the AI's full turn:
   *  1. Play a card (if affordable and decides to).
   *  2. Attack with each AI card that can act.
   *
   * Returns a log of actions taken for animation / display purposes.
   *
   * @param {import('./CombatManager.js').BattleCard[]} aiField   - AI's active cards.
   * @param {import('./CombatManager.js').BattleCard[]} playerField - Player's active cards.
   * @param {Function} resolveAttackFn - CombatManager.resolveAttack bound with rng.
   * @returns {AITurnLog}
   */
  takeTurn(aiField, playerField, resolveAttackFn) {
    const log = { cardPlayed: null, attacks: [] };

    // --- Card play ---
    const cardToPlay = this.chooseCardToPlay();
    if (cardToPlay) {
      this.mana.spend(cardToPlay);
      this.deck.playCard(cardToPlay.id);
      log.cardPlayed = cardToPlay;
    }

    // --- Attacks ---
    for (const attacker of aiField) {
      if (attacker.currentHp <= 0) continue;  // already dead
      if (attacker.stunned) {
        attacker.stunned = false;              // consume stun
        log.attacks.push({ attacker, target: null, result: null, wasStunned: true });
        continue;
      }
      if (attacker.hasActed && !attacker.keywords.includes('Haste')) continue;

      const target = this.chooseTarget(playerField);
      if (!target) continue;

      const result = resolveAttackFn(attacker, target);
      attacker.hasActed = true;
      log.attacks.push({ attacker, target, result, wasStunned: false });
    }

    return log;
  }
}

/**
 * @typedef {Object} AITurnLog
 * @property {import('./CardSchema.js').Card | null} cardPlayed
 * @property {Array<{attacker: BattleCard, target: BattleCard|null, result: Object|null, wasStunned: boolean}>} attacks
 */
