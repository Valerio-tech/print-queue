const STORAGE_KEY = 'print-queue-theme';

export function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.setAttribute('data-theme', 'light');
  } else {
    root.removeAttribute('data-theme');
  }

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === 'light' ? '#eef0f3' : '#0f1419';
}

export function initTheme() {
  applyTheme(getStoredTheme());
}

export function setTheme(theme) {
  const value = theme === 'light' ? 'light' : 'dark';
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
  applyTheme(value);
  syncThemeToggle(value);
}

export function bindThemeToggle(selector) {
  const input = document.querySelector(selector);
  if (!input) return;

  syncThemeToggle(getStoredTheme());
  input.addEventListener('change', () => {
    setTheme(input.checked ? 'light' : 'dark');
  });
}

function syncThemeToggle(theme) {
  const input = document.getElementById('theme-toggle');
  if (!input) return;
  input.checked = theme === 'light';
  input.setAttribute('aria-checked', String(theme === 'light'));
}
