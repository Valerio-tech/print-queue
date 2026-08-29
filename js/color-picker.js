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
