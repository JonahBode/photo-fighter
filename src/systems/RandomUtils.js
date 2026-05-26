/**
 * RandomUtils.js
 * Centralised randomisation helpers used throughout the game.
 * Seeded shuffle ensures reproducible card draws when a seed is supplied.
 */

// ─── Seeded PRNG (Mulberry32) ────────────────────────────────────────────────

/**
 * Create a seeded pseudo-random number generator.
 * Returns a function that produces values in [0, 1) — same API as Math.random.
 *
 * @param {number} seed - Integer seed value.
 * @returns {() => number}
 */
export function createSeededRng(seed) {
  let s = seed >>> 0; // ensure unsigned 32-bit integer
  return function () {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Fisher-Yates shuffle ────────────────────────────────────────────────────

/**
 * Shuffle an array in-place using Fisher-Yates.
 * Optionally supply a seeded RNG for reproducibility.
 *
 * @template T
 * @param {T[]} array - The array to shuffle (mutated in place).
 * @param {() => number} [rng=Math.random] - RNG function.
 * @returns {T[]} The same array, now shuffled.
 */
export function shuffleArray(array, rng = Math.random) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ─── Damage roll ─────────────────────────────────────────────────────────────

/**
 * Roll a random integer within an attack range [min, max] (inclusive).
 *
 * @param {number} min
 * @param {number} max
 * @param {() => number} [rng=Math.random]
 * @returns {number}
 */
export function rollDamage(min, max, rng = Math.random) {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return Math.floor(rng() * (hi - lo + 1)) + lo;
}

// ─── Crit check ──────────────────────────────────────────────────────────────

/**
 * Return true if a critical hit should occur.
 *
 * @param {number} critChance - Probability in [0, 1].
 * @param {() => number} [rng=Math.random]
 * @returns {boolean}
 */
export function rollCrit(critChance, rng = Math.random) {
  return rng() < critChance;
}

// ─── Random selection ────────────────────────────────────────────────────────

/**
 * Pick `count` unique items at random from `pool`.
 * Returns fewer items if the pool is smaller than count.
 *
 * @template T
 * @param {T[]} pool
 * @param {number} count
 * @param {() => number} [rng=Math.random]
 * @returns {T[]}
 */
export function pickRandom(pool, count, rng = Math.random) {
  const copy = [...pool];
  shuffleArray(copy, rng);
  return copy.slice(0, count);
}

/**
 * Pick a single random item from an array.
 *
 * @template T
 * @param {T[]} array
 * @param {() => number} [rng=Math.random]
 * @returns {T | undefined}
 */
export function pickOne(array, rng = Math.random) {
  if (!array.length) return undefined;
  return array[Math.floor(rng() * array.length)];
}
