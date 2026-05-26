/**
 * ProgressionManager.js
 * Tracks player statistics and manages card unlocks.
 * All data is persisted in localStorage under the key 'photoFighterProgress'.
 *
 * Unlock rules:
 *  - After each WIN: unlock 1–2 random cards from the next tier.
 *  - Every 3 LOSSES: unlock 1 random card as a consolation reward.
 *  - Tiers 1+ (Tier 1 = basic row; higher tiers unlock progressively).
 */

import { pickRandom } from './RandomUtils.js';

const STORAGE_KEY = 'photoFighterProgress';

/** Default progression state for a brand-new player. */
function defaultState() {
  return {
    wins: 0,
    losses: 0,
    totalMatches: 0,
    winStreak: 0,
    highestTierReached: 1,
    unlockedCardIds: [],      // ids of cards the player has earned
    consolationCounter: 0,   // losses since last consolation reward
  };
}

export default class ProgressionManager {
  constructor() {
    this.state = this._load();
  }

  // ─── Match result recording ──────────────────────────────────────────────────

  /**
   * Record a match result and return any newly unlocked cards.
   *
   * @param {'win'|'loss'} outcome
   * @param {import('./CardSchema.js').Card[]} allCards - Full card pool to unlock from.
   * @returns {import('./CardSchema.js').Card[]} Array of newly unlocked cards.
   */
  recordMatch(outcome, allCards) {
    const newlyUnlocked = [];

    this.state.totalMatches += 1;

    if (outcome === 'win') {
      this.state.wins += 1;
      this.state.winStreak += 1;
      this.state.consolationCounter = 0;

      // Unlock 1–2 random cards from the next tier
      const nextTier = Math.min(this.state.highestTierReached + 1, this._maxTier(allCards));
      const candidates = this._getLockedCardsOfTier(allCards, nextTier);
      const count = candidates.length > 1 ? Math.floor(Math.random() * 2) + 1 : Math.min(1, candidates.length);
      const unlocks = pickRandom(candidates, count);

      unlocks.forEach((card) => {
        this._unlock(card.id);
        newlyUnlocked.push(card);
      });

      // Advance the player's highest tier if all cards of the current tier are unlocked
      this._updateHighestTier(allCards);

    } else {
      this.state.losses += 1;
      this.state.winStreak = 0;
      this.state.consolationCounter += 1;

      // Every 3 losses, grant a consolation card
      if (this.state.consolationCounter >= 3) {
        this.state.consolationCounter = 0;
        const currentTier = this.state.highestTierReached;
        const candidates = this._getLockedCardsOfTier(allCards, currentTier);
        const [consolation] = pickRandom(candidates, 1);
        if (consolation) {
          this._unlock(consolation.id);
          newlyUnlocked.push(consolation);
        }
      }
    }

    this._save();
    return newlyUnlocked;
  }

  // ─── Unlock helpers ──────────────────────────────────────────────────────────

  /**
   * Check whether a card is unlocked.
   *
   * @param {string} cardId
   * @returns {boolean}
   */
  isUnlocked(cardId) {
    return this.state.unlockedCardIds.includes(cardId);
  }

  /**
   * Get all cards the player currently has access to.
   * Includes cards that were already unlocked in the base card data AND
   * any ids stored in progression state.
   *
   * @param {import('./CardSchema.js').Card[]} allCards
   * @returns {import('./CardSchema.js').Card[]}
   */
  getUnlockedCards(allCards) {
    return allCards.filter(
      (c) => c.unlocked || this.state.unlockedCardIds.includes(c.id)
    );
  }

  // ─── Stats accessors ─────────────────────────────────────────────────────────

  /** @returns {Object} Snapshot of current progression stats. */
  getStats() {
    return { ...this.state };
  }

  /** Reset all progression data (use for debug / new game). */
  reset() {
    this.state = defaultState();
    this._save();
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  _unlock(cardId) {
    if (!this.state.unlockedCardIds.includes(cardId)) {
      this.state.unlockedCardIds.push(cardId);
    }
  }

  _getLockedCardsOfTier(allCards, tier) {
    return allCards.filter(
      (c) => c.tier === tier && !c.unlocked && !this.state.unlockedCardIds.includes(c.id)
    );
  }

  _updateHighestTier(allCards) {
    // Check whether all cards at the current highest tier are now unlocked
    const currentTierCards = allCards.filter(
      (c) => c.tier === this.state.highestTierReached
    );
    const allUnlocked = currentTierCards.every(
      (c) => c.unlocked || this.state.unlockedCardIds.includes(c.id)
    );
    if (allUnlocked && this.state.highestTierReached < this._maxTier(allCards)) {
      this.state.highestTierReached += 1;
    }
  }

  _maxTier(allCards) {
    if (!allCards.length) return 1;
    return allCards.reduce((maxTier, card) => Math.max(maxTier, card.tier || 1), 1);
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('ProgressionManager: could not save to localStorage', e);
    }
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return { ...defaultState(), ...JSON.parse(raw) };
      }
    } catch (e) {
      console.warn('ProgressionManager: could not load from localStorage', e);
    }
    return defaultState();
  }
}
