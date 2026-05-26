/**
 * keywords.js
 * Definitions for every keyword ability that can appear on a card.
 * Each entry has:
 *   id          — machine-readable key used in CardSchema.keywords[]
 *   name        — display name shown on the card
 *   description — tooltip / flavour explanation shown in battle
 */

const KEYWORDS = {
  Taunt: {
    id: 'Taunt',
    name: 'Taunt',
    description: 'Enemy attacks must target this card while it is in play.',
  },

  Poison: {
    id: 'Poison',
    name: 'Poison',
    description: 'Deals 2 damage per turn for 3 turns after landing a hit.',
  },

  Shield: {
    id: 'Shield',
    name: 'Shield',
    description: 'Blocks the first instance of damage this card would take.',
  },

  Lifesteal: {
    id: 'Lifesteal',
    name: 'Lifesteal',
    description: 'Heals the attacker for 50 % of the damage dealt.',
  },

  Haste: {
    id: 'Haste',
    name: 'Haste',
    description: 'Can attack on the same turn it is played.',
  },

  Stun: {
    id: 'Stun',
    name: 'Stun',
    description: 'Each hit has a 20 % chance to cause the enemy to skip their next turn.',
  },
};

export default KEYWORDS;
