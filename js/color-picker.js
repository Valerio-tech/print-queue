function hslToHex(h, s, l) {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (n) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// Left column: bianco → nero (top to bottom)
const GRAY_COLUMN = ['#FFFFFF', '#B0B0B0', '#505050', '#000000'];

// 12 fundamental hues: Rosso → Rosso-Viola
const HUES = [0, 15, 30, 45, 55, 90, 120, 180, 220, 255, 280, 320];
const LIGHTNESS = [80, 62, 46, 30];
const SATURATION = 90;

function buildPalette() {
  const colors = [];
  for (let row = 0; row < LIGHTNESS.length; row++) {
    colors.push(GRAY_COLUMN[row]);
    for (const hue of HUES) {
      colors.push(hslToHex(hue, SATURATION, LIGHTNESS[row]));
    }
  }
  return colors;
}

export const COLOR_PALETTE = buildPalette();
export const PALETTE_COLUMNS = 13;
export const DEFAULT_COLOR = COLOR_PALETTE[1];

const HEX_RE = /^#[0-9A-F]{6}$/i;

export function isGrayColumnIndex(index) {
  return index % PALETTE_COLUMNS === 0;
}

export function isValidPaletteColor(color) {
  return typeof color === 'string' && HEX_RE.test(color) && COLOR_PALETTE.includes(color.toUpperCase());
}

export function normalizeColor(color) {
  if (!color || typeof color !== 'string') return DEFAULT_COLOR;
  const upper = color.toUpperCase();
  return COLOR_PALETTE.includes(upper) ? upper : DEFAULT_COLOR;
}

const HUE_FAMILY_META = [
  { id: 'red', label: 'Rosso' },
  { id: 'red-orange', label: 'Rosso-Arancio' },
  { id: 'orange', label: 'Arancione' },
  { id: 'yellow-orange', label: 'Giallo-Arancio' },
  { id: 'yellow', label: 'Giallo' },
  { id: 'yellow-green', label: 'Giallo-Verde' },
  { id: 'green', label: 'Verde' },
  { id: 'cyan', label: 'Verde-Blu' },
  { id: 'blue', label: 'Blu' },
  { id: 'blue-violet', label: 'Blu-Viola' },
  { id: 'violet', label: 'Viola' },
  { id: 'red-violet', label: 'Rosso-Viola' },
];

// Intermediate picker columns roll into the primary filter family above-left
const COLUMN_TO_FILTER = [
  'red',
  'red',
  'orange',
  'orange',
  'yellow',
  'yellow',
  'green',
  'green',
  'blue',
  'blue',
  'violet',
  'violet',
];

export const PRIMARY_FILTER_META = [
  { id: 'red', label: 'Rosso' },
  { id: 'orange', label: 'Arancione' },
  { id: 'yellow', label: 'Giallo' },
  { id: 'green', label: 'Verde' },
  { id: 'blue', label: 'Blu' },
  { id: 'violet', label: 'Viola' },
];

const FILTER_PRIMARY_COLUMN = {
  red: 0,
  orange: 2,
  yellow: 4,
  green: 6,
  blue: 8,
  violet: 10,
};

const LEGACY_FILTER_IDS = {
  'red-orange': 'red',
  'yellow-orange': 'orange',
  'yellow-green': 'yellow',
  cyan: 'green',
  'blue-violet': 'blue',
  'red-violet': 'violet',
};

function buildColorFamilies() {
  const map = new Map();
  map.set('white', [GRAY_COLUMN[0]]);
  map.set('gray', [GRAY_COLUMN[1], GRAY_COLUMN[2]]);
  map.set('black', [GRAY_COLUMN[3]]);

  for (const { id } of PRIMARY_FILTER_META) {
    map.set(id, []);
  }

  HUE_FAMILY_META.forEach((_, colIndex) => {
    const filterId = COLUMN_TO_FILTER[colIndex];
    const bucket = map.get(filterId);
    for (let row = 0; row < LIGHTNESS.length; row++) {
      bucket.push(COLOR_PALETTE[row * PALETTE_COLUMNS + 1 + colIndex]);
    }
  });

  const hexToFamily = new Map();
  for (const [familyId, colors] of map) {
    for (const hex of colors) {
      hexToFamily.set(hex.toUpperCase(), familyId);
    }
  }

  return { map, hexToFamily };
}

const { map: COLOR_FAMILIES, hexToFamily: HEX_TO_FAMILY } = buildColorFamilies();

export function getColorFamily(color) {
  if (!color || typeof color !== 'string') return null;
  return HEX_TO_FAMILY.get(color.toUpperCase()) || null;
}

export function getFamilySwatch(familyId) {
  if (familyId === 'white') return GRAY_COLUMN[0];
  if (familyId === 'gray') return '#808080';
  if (familyId === 'black') return GRAY_COLUMN[3];
  const col = FILTER_PRIMARY_COLUMN[familyId];
  if (col !== undefined) {
    return COLOR_PALETTE[1 * PALETTE_COLUMNS + 1 + col];
  }
  return '#808080';
}

export function normalizeFilterFamilyId(familyId) {
  if (!familyId) return '';
  if (LEGACY_FILTER_IDS[familyId]) return LEGACY_FILTER_IDS[familyId];
  const valid = ['white', 'gray', 'black', ...PRIMARY_FILTER_META.map((m) => m.id)];
  return valid.includes(familyId) ? familyId : '';
}

export const COLOR_FILTER_OPTIONS = [
  { id: '', label: 'Tutti i colori', swatch: null },
  { id: 'white', label: 'Bianco', swatch: GRAY_COLUMN[0] },
  { id: 'gray', label: 'Grigio', swatch: '#808080' },
  { id: 'black', label: 'Nero', swatch: GRAY_COLUMN[3] },
  ...PRIMARY_FILTER_META.map((meta) => ({
    id: meta.id,
    label: meta.label,
    swatch: getFamilySwatch(meta.id),
  })),
];

export function getColorFilterLabel(familyId) {
  const id = normalizeFilterFamilyId(familyId);
  if (!id) return 'Tutti i colori';
  const opt = COLOR_FILTER_OPTIONS.find((o) => o.id === id);
  return opt ? opt.label : 'Tutti i colori';
}
