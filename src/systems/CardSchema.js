/**
 * CardSchema.js
 * Defines the canonical shape of a card object and a factory function that
 * creates new card instances with safe defaults.  Use createCard() whenever
 * you need to build a card from a partial data object.
 */

/**
 * createCard(data)
 * Merges the provided data with sensible defaults to produce a valid card.
 *
 * @param {Partial<Card>} data - Any subset of card fields.
 * @returns {Card} A fully populated card object.
 */
export function createCard(data = {}) {
  return {
    // Unique identifier — caller should always supply this
    id: data.id ?? `card_${Date.now()}_${Math.random().toString(36).slice(2)}`,

    // Display fields
    name: data.name ?? 'Unknown Card',
    image: data.image ?? '',          // base64 string or URL
    flavorText: data.flavorText ?? '',
    category: data.category ?? 'Generic',

    // Progression
    tier: data.tier ?? 1,
    unlocked: data.unlocked ?? false,

    // Cost
    cost: clamp(data.cost ?? 1, 1, 7),

    // Combat stats
    hp: clamp(data.hp ?? 10, 1, 100),
    attack: validateRange(data.attack, [3, 5]),
    defense: clamp(data.defense ?? 0, 0, 20),
    speed: clamp(data.speed ?? 5, 1, 10),

    // Crit
    critChance: clamp(data.critChance ?? 0.1, 0, 1),
    critMultiplier: data.critMultiplier ?? 1.5,

    // Keyword / ability strings
    keywords: Array.isArray(data.keywords) ? [...data.keywords] : [],
    abilities: Array.isArray(data.abilities) ? [...data.abilities] : [],
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Clamp a number between min and max (inclusive). */
function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

/**
 * Validate that a value is a two-element [min, max] array of numbers.
 * Falls back to defaultRange if validation fails.
 */
function validateRange(value, defaultRange) {
  if (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    value[0] <= value[1]
  ) {
    return [value[0], value[1]];
  }
  return [...defaultRange];
}

/**
 * @typedef {Object} Card
 * @property {string}   id
 * @property {string}   name
 * @property {string}   image           base64 or URL
 * @property {number}   tier            1–5
 * @property {number}   cost            1–7
 * @property {number}   hp              1–100
 * @property {number[]} attack          [min, max]
 * @property {number}   defense         flat damage reduction
 * @property {number}   speed           1–10, higher = attacks first
 * @property {number}   critChance      0.0–1.0
 * @property {number}   critMultiplier  e.g. 1.5
 * @property {string[]} keywords        e.g. ["Taunt","Poison"]
 * @property {string[]} abilities       human-readable ability descriptions
 * @property {string}   flavorText
 * @property {string}   category        e.g. "Tank", "Assassin", "Mage", "Support"
 * @property {boolean}  unlocked
 */
