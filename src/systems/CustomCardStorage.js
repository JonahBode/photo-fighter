import { createCard } from './CardSchema.js';

const STORAGE_KEY_CUSTOM = 'photoFighterCustomCards';
const FALLBACK_IMAGE_DATA =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
const MAX_CUSTOM_CARDS = 120;
const MAX_IMAGE_REF_LENGTH = 350000;

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clampInt(value, min, max) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalizeRange(value) {
  if (!Array.isArray(value) || value.length !== 2) return undefined;
  const first = Number(value[0]);
  const second = Number(value[1]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return undefined;
  const min = Math.min(first, second);
  const max = Math.max(first, second);
  return [min, max];
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v) => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean);
}

function normalizeImage(value) {
  if (typeof value !== 'string') return FALLBACK_IMAGE_DATA;
  const image = value.trim();
  if (!image) return FALLBACK_IMAGE_DATA;
  if (image.length > MAX_IMAGE_REF_LENGTH) return FALLBACK_IMAGE_DATA;
  if (image.startsWith('data:image/') && image.includes(',')) return image;
  if (image.startsWith('http://') || image.startsWith('https://')) return image;
  return FALLBACK_IMAGE_DATA;
}

function makeUniqueId(rawId, usedIds, index) {
  const base =
    typeof rawId === 'string' && rawId.trim()
      ? rawId.trim()
      : `custom_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`;

  let id = base;
  let counter = 1;
  while (usedIds.has(id)) {
    id = `${base}_${counter}`;
    counter += 1;
  }
  usedIds.add(id);
  return id;
}

function normalizeCustomCards(cards) {
  if (!Array.isArray(cards)) return [];
  const usedIds = new Set();
  const normalized = [];
  const sourceCards = cards.slice(-MAX_CUSTOM_CARDS);

  sourceCards.forEach((raw, index) => {
    if (!isObject(raw)) return;

    const tier = clampInt(raw.tier ?? 1, 1, 8);
    const hasUnlocked = typeof raw.unlocked === 'boolean';
    const unlocked = hasUnlocked ? raw.unlocked : tier === 1;

    const normalizedCard = createCard({
      ...raw,
      id: makeUniqueId(raw.id, usedIds, index),
      name:
        typeof raw.name === 'string' && raw.name.trim()
          ? raw.name.trim()
          : `Custom Card ${normalized.length + 1}`,
      image: normalizeImage(raw.image),
      tier,
      unlocked,
      cost: clampInt(raw.cost ?? 1, 1, 7),
      hp: clampInt(raw.hp ?? 10, 1, 100),
      attack: normalizeRange(raw.attack),
      defense: clampInt(raw.defense ?? 0, 0, 20),
      speed: clampInt(raw.speed ?? 5, 1, 10),
      critChance: clampNumber(raw.critChance, 0, 1, 0.1),
      critMultiplier: clampNumber(raw.critMultiplier, 1, 5, 1.5),
      category:
        typeof raw.category === 'string' && raw.category.trim() ? raw.category.trim() : 'Custom',
      keywords: normalizeStringArray(raw.keywords),
      abilities: normalizeStringArray(raw.abilities),
    });

    normalized.push(normalizedCard);
  });

  return normalized;
}

function safeStorageRead() {
  try {
    return localStorage.getItem(STORAGE_KEY_CUSTOM);
  } catch {
    return null;
  }
}

function safeStorageWrite(cards) {
  if (!Array.isArray(cards)) return null;
  for (let i = 0; i <= cards.length; i += 1) {
    const candidate = cards.slice(i);
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(candidate));
      return candidate;
    } catch {
      // Drop oldest cards until storage write fits, then keep playable subset.
    }
  }
  return null;
}

function parseStoredCards(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomCardsToStorage(cards) {
  const normalized = normalizeCustomCards(cards);
  const persisted = safeStorageWrite(normalized);
  if (Array.isArray(persisted)) return persisted;
  return loadCustomCardsFromStorage();
}

export function loadCustomCardsFromStorage() {
  const raw = safeStorageRead();
  const parsed = parseStoredCards(raw);
  const normalized = normalizeCustomCards(parsed);

  if (!raw || JSON.stringify(parsed) !== JSON.stringify(normalized)) {
    const persisted = safeStorageWrite(normalized);
    if (Array.isArray(persisted)) return persisted;
  }

  return normalized;
}

export function isRenderableCard(card) {
  const hasValidImage =
    typeof card?.image === 'string' &&
    Boolean(card.image.trim()) &&
    card.image.length <= MAX_IMAGE_REF_LENGTH &&
    (card.image.startsWith('data:image/') ||
      card.image.startsWith('http://') ||
      card.image.startsWith('https://'));

  return (
    isObject(card) &&
    typeof card.id === 'string' &&
    Boolean(card.id.trim()) &&
    typeof card.name === 'string' &&
    hasValidImage &&
    Array.isArray(card.attack) &&
    card.attack.length === 2 &&
    Number.isFinite(Number(card.attack[0])) &&
    Number.isFinite(Number(card.attack[1]))
  );
}
