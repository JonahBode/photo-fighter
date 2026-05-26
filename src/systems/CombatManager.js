/**
 * CombatManager.js
 * Handles a single attack between two cards including damage calculation,
 * crit checks, defense reduction, and keyword side-effects.
 *
 * Damage formula:
 *   1. Roll raw damage within attacker's [min, max] range.
 *   2. If crit fires, multiply by critMultiplier.
 *   3. Subtract defender's defense (minimum 1 damage).
 *   4. Apply keyword effects: Shield, Lifesteal, Poison, Stun.
 *   5. Speed determines who attacks first; ties broken with a coin flip.
 */

import { rollDamage, rollCrit } from './RandomUtils.js';
import KEYWORDS from '../data/keywords.js';

// ─── Battle card wrapper ─────────────────────────────────────────────────────

/**
 * Create a mutable battle instance of a card that tracks runtime state
 * (current HP, active statuses) without mutating the original card data.
 *
 * @param {import('./CardSchema.js').Card} card
 * @returns {BattleCard}
 */
export function createBattleCard(card) {
  return {
    ...card,
    currentHp: card.hp,           // tracks HP during combat
    shieldActive: card.keywords.includes(KEYWORDS.Shield.id),
    poisonStacks: 0,              // number of remaining poison ticks
    stunned: false,               // if true, skip this card's next attack
    hasActed: false,              // whether card already attacked this turn
  };
}

// ─── Core attack resolution ──────────────────────────────────────────────────

/**
 * Resolve one attack from `attacker` against `defender`.
 * Mutates both BattleCard objects in place.
 *
 * @param {BattleCard} attacker
 * @param {BattleCard} defender
 * @param {() => number} [rng=Math.random]
 * @returns {AttackResult}
 */
export function resolveAttack(attacker, defender, rng = Math.random) {
  const result = {
    rawDamage: 0,
    isCrit: false,
    finalDamage: 0,
    healAmount: 0,
    poisonApplied: false,
    stunApplied: false,
    shieldBlocked: false,
    attackerDied: false,
    defenderDied: false,
  };

  // 1. Roll raw damage
  const [min, max] = attacker.attack;
  result.rawDamage = rollDamage(min, max, rng);

  // 2. Crit check
  result.isCrit = rollCrit(attacker.critChance, rng);
  let damage = result.isCrit
    ? Math.floor(result.rawDamage * attacker.critMultiplier)
    : result.rawDamage;

  // 3. Shield check — first hit is blocked
  if (defender.shieldActive) {
    defender.shieldActive = false;
    result.shieldBlocked = true;
    // No damage dealt this hit
    return result;
  }

  // 4. Apply defense reduction (minimum 1 damage)
  damage = Math.max(1, damage - defender.defense);
  result.finalDamage = damage;

  // 5. Apply damage to defender
  defender.currentHp -= damage;
  if (defender.currentHp <= 0) result.defenderDied = true;

  // 6. Lifesteal — attacker recovers 50 % of damage dealt
  if (attacker.keywords.includes(KEYWORDS.Lifesteal.id)) {
    result.healAmount = Math.floor(damage * 0.5);
    attacker.currentHp = Math.min(attacker.hp, attacker.currentHp + result.healAmount);
  }

  // 7. Poison — apply 3-turn poison stack to defender
  if (attacker.keywords.includes(KEYWORDS.Poison.id) && !result.defenderDied) {
    defender.poisonStacks = Math.max(defender.poisonStacks, 3); // refresh / apply
    result.poisonApplied = true;
  }

  // 8. Stun — 20 % chance to stun the defender
  if (attacker.keywords.includes(KEYWORDS.Stun.id) && !result.defenderDied) {
    if (rng() < 0.2) {
      defender.stunned = true;
      result.stunApplied = true;
    }
  }

  return result;
}

// ─── Poison tick ─────────────────────────────────────────────────────────────

/**
 * Apply one tick of poison damage to all affected BattleCards in an array.
 * Decrements their poison stack counter.
 *
 * @param {BattleCard[]} cards
 * @returns {{ card: BattleCard, damage: number }[]} Records of damage dealt.
 */
export function tickPoison(cards) {
  return cards
    .filter((c) => c.poisonStacks > 0 && c.currentHp > 0)
    .map((c) => {
      const damage = 2;
      c.currentHp -= damage;
      c.poisonStacks -= 1;
      return { card: c, damage };
    });
}

// ─── Turn order ──────────────────────────────────────────────────────────────

/**
 * Sort two BattleCard arrays into a unified turn order (descending speed).
 * Each entry is { card, owner: 'player'|'ai' }.
 * Ties are resolved randomly.
 *
 * @param {BattleCard[]} playerCards
 * @param {BattleCard[]} aiCards
 * @param {() => number} [rng=Math.random]
 * @returns {{ card: BattleCard, owner: string }[]}
 */
export function buildTurnOrder(playerCards, aiCards, rng = Math.random) {
  const entries = [
    ...playerCards.map((c) => ({ card: c, owner: 'player' })),
    ...aiCards.map((c) => ({ card: c, owner: 'ai' })),
  ];

  entries.sort((a, b) => {
    const diff = b.card.speed - a.card.speed;
    if (diff !== 0) return diff;
    return rng() < 0.5 ? -1 : 1; // random tie-break
  });

  return entries;
}

/**
 * @typedef {Object} BattleCard
 * @property {number}  currentHp
 * @property {boolean} shieldActive
 * @property {number}  poisonStacks
 * @property {boolean} stunned
 * @property {boolean} hasActed
 */

/**
 * @typedef {Object} AttackResult
 * @property {number}  rawDamage
 * @property {boolean} isCrit
 * @property {number}  finalDamage
 * @property {number}  healAmount
 * @property {boolean} poisonApplied
 * @property {boolean} stunApplied
 * @property {boolean} shieldBlocked
 * @property {boolean} attackerDied
 * @property {boolean} defenderDied
 */
