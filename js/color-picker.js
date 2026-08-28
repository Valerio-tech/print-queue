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

const GRAY_ROW = [
  '#FFFFFF',
  '#EBEBEB',
  '#D6D6D6',
  '#C2C2C2',
  '#ADADAD',
  '#999999',
  '#858585',
  '#707070',
  '#5C5C5C',
  '#474747',
  '#333333',
  '#000000',
];

const HUES = [210, 225, 240, 255, 270, 285, 300, 315, 330, 345, 0, 15];
const LIGHTNESS = [78, 66, 54, 42, 34, 26, 18];

function buildPalette() {
  const colors = [...GRAY_ROW];
  for (const lightness of LIGHTNESS) {
    for (const hue of HUES) {
      colors.push(hslToHex(hue, 82, lightness));
    }
  }
  return colors;
}

export const COLOR_PALETTE = buildPalette();
export const DEFAULT_COLOR = COLOR_PALETTE[0];
export const PALETTE_COLUMNS = 12;

const HEX_RE = /^#[0-9A-F]{6}$/i;

export function isValidPaletteColor(color) {
  return typeof color === 'string' && HEX_RE.test(color) && COLOR_PALETTE.includes(color.toUpperCase());
}

export function normalizeColor(color) {
  if (!color || typeof color !== 'string') return DEFAULT_COLOR;
  const upper = color.toUpperCase();
  return COLOR_PALETTE.includes(upper) ? upper : DEFAULT_COLOR;
}
