import { createCard } from './CardSchema.js';

const STORAGE_KEY_CUSTOM = 'photoFighterCustomCards';
const FALLBACK_IMAGE_DATA =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clampInt(value, min, max) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return min;
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

  cards.forEach((raw, index) => {
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
      image:
        typeof raw.image === 'string' && raw.image.trim() ? raw.image.trim() : FALLBACK_IMAGE_DATA,
      tier,
      unlocked,
      attack: normalizeRange(raw.attack),
      category:
        typeof raw.category === 'string' && raw.category.trim() ? raw.category.trim() : 'Custom',
      keywords: normalizeStringArray(raw.keywords),
      abilities: normalizeStringArray(raw.abilities),
    });

    normalized.push(normalizedCard);
  });

  return normalized;
}

export function saveCustomCardsToStorage(cards) {
  const normalized = normalizeCustomCards(cards);
  localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(normalized));
  return normalized;
}

export function loadCustomCardsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM);
    const parsed = raw ? JSON.parse(raw) : [];
    const normalized = normalizeCustomCards(parsed);

    if (!raw || JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify(normalized));
    }

    return normalized;
  } catch {
    localStorage.setItem(STORAGE_KEY_CUSTOM, JSON.stringify([]));
    return [];
  }
}

export function isRenderableCard(card) {
  return (
    isObject(card) &&
    typeof card.id === 'string' &&
    Boolean(card.id.trim()) &&
    typeof card.name === 'string' &&
    Array.isArray(card.attack) &&
    card.attack.length === 2 &&
    Number.isFinite(Number(card.attack[0])) &&
    Number.isFinite(Number(card.attack[1]))
  );
}

