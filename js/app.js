import { loadProjects, saveProjects, createProject, exportData, importData } from './storage.js';
import { parseTags, getAllTags, detectSource, getSourceIcon } from './metadata.js';
import { COLOR_PALETTE, DEFAULT_COLOR, normalizeColor, isGrayColumnIndex, COLOR_FILTER_OPTIONS, getColorFamily, getColorFilterLabel, getFamilySwatch, normalizeFilterFamilyId } from './color-picker.js';
import { initTheme, bindThemeToggle } from './theme.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let projects = loadProjects();
let filter = 'todo';
let activeTag = '';
let activeColorFamily = '';
let searchQuery = '';
let tagFilterOpen = false;
let colorFilterOpen = false;
let tagSuggestionsOpen = false;
let selectedColor = DEFAULT_COLOR;

const els = {
  header: $('.header'),
  list: $('#project-list'),
  empty: $('#empty-state'),
  countTodo: $('#count-todo'),
  countDone: $('#count-done'),
  tagFilterWrap: $('#tag-filter-wrap'),
  secondaryFiltersWrap: $('#secondary-filters-wrap'),
  tagFilterBtn: $('#tag-filter-btn'),
  tagFilterLabel: $('#tag-filter-label'),
  tagFilterMenu: $('#tag-filter-menu'),
  tagFilterOptions: $('#tag-filter-options'),
  colorFilterBtn: $('#color-filter-btn'),
  colorFilterLabelText: $('#color-filter-label-text'),
  colorFilterBtnSwatch: $('#color-filter-btn-swatch'),
  colorFilterMenu: $('#color-filter-menu'),
  colorFilterOptions: $('#color-filter-options'),
  search: $('#search-input'),
  addSheet: $('#add-sheet'),
  addForm: $('#add-form'),
  urlInput: $('#url-input'),
  titleInput: $('#title-input'),
  colorInput: $('#color-input'),
  colorGrid: $('#color-grid'),
  colorPreview: $('#color-preview'),
  colorHex: $('#color-hex'),
  tagsInput: $('#tags-input'),
  tagSuggestions: $('#tag-suggestions'),
  tagSuggestionsList: $('#tag-suggestions-list'),
  addStatus: $('#add-status'),
  addBtn: $('#add-btn'),
  fab: $('#fab-add'),
  overlay: $('#overlay'),
  importFile: $('#import-file'),
  toast: $('#toast'),
};

function init() {
  initTheme();
  bindThemeToggle('#theme-toggle');
  bindEvents();
  buildColorGrid();
  setSelectedColor(DEFAULT_COLOR);
  render();
  registerServiceWorker();
  const shared = consumeIncomingShare();
  if (shared.url) {
    openAddSheet({ url: shared.url, title: shared.title });
  }
}

function bindEvents() {
  $$('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      filter = btn.dataset.filter;
      $$('[data-filter]').forEach((b) => b.classList.toggle('active', b === btn));
      render();
    });
  });

  els.search.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    render();
  });

  els.fab.addEventListener('click', openAddSheet);
  els.overlay.addEventListener('click', closeAddSheet);
  $('#close-add').addEventListener('click', closeAddSheet);

  els.addForm.addEventListener('submit', handleAdd);

  els.tagsInput.addEventListener('focus', () => {
    tagSuggestionsOpen = true;
    renderTagSuggestions();
  });

  els.tagsInput.addEventListener('input', renderTagSuggestions);

  els.tagsInput.addEventListener('blur', () => {
    setTimeout(() => {
      tagSuggestionsOpen = false;
      els.tagSuggestions.classList.add('hidden');
    }, 200);
  });

  els.tagFilterBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleTagFilterMenu();
  });

  els.colorFilterBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleColorFilterMenu();
  });

  document.addEventListener('click', (e) => {
    if (!els.secondaryFiltersWrap.contains(e.target)) {
      closeTagFilterMenu();
      closeColorFilterMenu();
    }
  });

  $('#export-btn').addEventListener('click', handleExport);
  $('#import-btn').addEventListener('click', () => els.importFile.click());
  els.importFile.addEventListener('change', handleImport);

  window.addEventListener('scroll', handleHeaderScroll, { passive: true });
  handleHeaderScroll();
}

function handleHeaderScroll() {
  els.header.classList.toggle('header-scrolled', window.scrollY > 16);
}

function buildColorGrid() {
  els.colorGrid.innerHTML = COLOR_PALETTE.map(
    (color, index) => {
      const grayCol = isGrayColumnIndex(index) ? ' gray-col' : '';
      const selected = color === selectedColor ? ' selected' : '';
      return `<button type="button" class="color-swatch${grayCol}${selected}" data-color="${color}" style="background:${color}" aria-label="${color}" role="option" aria-selected="${color === selectedColor}"></button>`;
    }
  ).join('');

  els.colorGrid.querySelectorAll('.color-swatch').forEach((btn) => {
    btn.addEventListener('click', () => setSelectedColor(btn.dataset.color));
  });
}

function setSelectedColor(color) {
  selectedColor = normalizeColor(color);
  els.colorInput.value = selectedColor;
  els.colorPreview.style.background = selectedColor;
  els.colorHex.textContent = selectedColor;

  els.colorGrid.querySelectorAll('.color-swatch').forEach((btn) => {
    const active = btn.dataset.color === selectedColor;
    btn.classList.toggle('selected', active);
    btn.setAttribute('aria-selected', String(active));
  });
}

function openAddSheet(prefill = null) {
  els.addSheet.classList.add('open');
  els.overlay.classList.add('visible');
  const url = prefill?.url?.trim() || '';
  const title = prefill?.title?.trim() || '';
  els.urlInput.value = url;
  els.titleInput.value = title;
  els.tagsInput.value = '';
  setSelectedColor(DEFAULT_COLOR);
  els.addStatus.textContent = '';
  els.addStatus.className = 'add-status';
  els.tagSuggestions.classList.add('hidden');
  tagSuggestionsOpen = false;
  setTimeout(() => {
    if (url && !title) els.titleInput.focus();
    else if (!url) els.urlInput.focus();
    else els.titleInput.focus();
  }, 300);
}

/** Web Share Target: link condiviso da altre app (Android PWA). */
function consumeIncomingShare() {
  const params = new URLSearchParams(window.location.search);
  const hasShare =
    params.has('url') || params.has('text') || params.has('title');
  if (!hasShare) return { url: '', title: '' };

  const rawUrl = (params.get('url') || '').trim();
  const text = (params.get('text') || '').trim();
  const rawTitle = (params.get('title') || '').trim();

  let url = rawUrl;
  if (!url && text) {
    const match = text.match(/https?:\/\/[^\s<>"']+/i);
    if (match) url = match[0].replace(/[.,;:!?)]+$/, '');
  }

  let title = rawTitle;
  if (!title && text && url) {
    title = text.replace(url, '').trim().replace(/^[-–—|•]\s*/, '');
  }
  if (title.length > 200) title = title.slice(0, 200);

  const clean = `${window.location.pathname}${window.location.hash || ''}`;
  window.history.replaceState({}, '', clean);

  return { url, title };
}

function closeAddSheet() {
  els.addSheet.classList.remove('open');
  els.overlay.classList.remove('visible');
  els.tagSuggestions.classList.add('hidden');
  tagSuggestionsOpen = false;
}

async function handleAdd(e) {
  e.preventDefault();
  const url = els.urlInput.value.trim();
  const title = els.titleInput.value.trim();
  if (!url) return;

  if (!title) {
    showAddStatus('Inserisci un titolo', 'error');
    els.titleInput.focus();
    return;
  }

  try {
    new URL(url);
  } catch {
    showAddStatus('URL non valido', 'error');
    return;
  }

  const tags = parseTags(els.tagsInput.value);
  const source = detectSource(url);

  const project = createProject({
    url,
    title,
    source: source.id,
    color: selectedColor,
    tags,
  });

  projects.unshift(project);
  saveProjects(projects);
  closeAddSheet();
  render();
}

function showAddStatus(msg, type) {
  els.addStatus.textContent = msg;
  els.addStatus.className = `add-status ${type}`;
}

function getFiltered() {
  return projects.filter((p) => {
    if (filter === 'todo' && p.printed) return false;
    if (filter === 'done' && !p.printed) return false;
    if (activeTag && !p.tags.includes(activeTag)) return false;
    if (activeColorFamily) {
      const filterId = normalizeFilterFamilyId(activeColorFamily);
      const family = getColorFamily(p.color);
      if (family !== filterId) return false;
    }
    if (searchQuery) {
      const hay = `${p.title} ${p.url} ${p.tags.join(' ')}`.toLowerCase();
      if (!hay.includes(searchQuery)) return false;
    }
    return true;
  });
}

function render() {
  const filtered = getFiltered();
  const todoCount = projects.filter((p) => !p.printed).length;
  const doneCount = projects.filter((p) => p.printed).length;

  els.countTodo.textContent = todoCount;
  els.countDone.textContent = doneCount;

  renderTagFilterDropdown();
  renderColorFilterDropdown();
  renderList(filtered);
}

function getSuggestionFilter() {
  const raw = els.tagsInput.value;
  if (/[,;#]\s*$/.test(raw)) {
    return { current: '', existing: parseTags(raw) };
  }
  const parts = raw.split(/[,;#]+/);
  const current = (parts.pop() || '').trim().toLowerCase();
  const existing = parseTags(parts.join(','));
  return { current, existing };
}

function renderTagSuggestions() {
  if (!tagSuggestionsOpen) return;

  const allTags = getAllTags(projects);
  const { current, existing } = getSuggestionFilter();

  const available = allTags.filter(
    (tag) => !existing.includes(tag) && (!current || tag.includes(current))
  );

  if (available.length === 0) {
    els.tagSuggestions.classList.add('hidden');
    return;
  }

  els.tagSuggestionsList.innerHTML = available
    .map(
      (tag) =>
        `<button type="button" class="tag-dropdown-item" data-tag="${escapeAttr(tag)}">${escapeHtml(tag)}</button>`
    )
    .join('');

  els.tagSuggestionsList.querySelectorAll('.tag-dropdown-item').forEach((btn) => {
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      appendTagToInput(btn.dataset.tag);
      renderTagSuggestions();
    });
  });

  els.tagSuggestions.classList.remove('hidden');
}

function appendTagToInput(tag) {
  const { existing } = getSuggestionFilter();
  const merged = [...new Set([...existing, tag])];
  els.tagsInput.value = `${merged.join(', ')}, `;
  els.tagsInput.focus();
}

function toggleTagFilterMenu() {
  const opening = !tagFilterOpen;
  closeColorFilterMenu();
  tagFilterOpen = opening;
  els.tagFilterMenu.classList.toggle('hidden', !tagFilterOpen);
  els.tagFilterBtn.setAttribute('aria-expanded', String(tagFilterOpen));
}

function closeTagFilterMenu() {
  tagFilterOpen = false;
  els.tagFilterMenu.classList.add('hidden');
  els.tagFilterBtn.setAttribute('aria-expanded', 'false');
}

function toggleColorFilterMenu() {
  const opening = !colorFilterOpen;
  closeTagFilterMenu();
  colorFilterOpen = opening;
  els.colorFilterMenu.classList.toggle('hidden', !colorFilterOpen);
  els.colorFilterBtn.setAttribute('aria-expanded', String(colorFilterOpen));
}

function closeColorFilterMenu() {
  colorFilterOpen = false;
  els.colorFilterMenu.classList.add('hidden');
  els.colorFilterBtn.setAttribute('aria-expanded', 'false');
}

function updateSecondaryFiltersVisibility() {
  const show = projects.length > 0;
  els.secondaryFiltersWrap.classList.toggle('hidden', !show);
  if (!show) {
    closeTagFilterMenu();
    closeColorFilterMenu();
  }
}

function renderTagFilterDropdown() {
  updateSecondaryFiltersVisibility();
  if (projects.length === 0) return;

  els.tagFilterLabel.textContent = activeTag || 'Tutti i tag';

  const tags = getAllTags(projects);
  const options = [{ tag: '', label: 'Tutti i tag' }, ...tags.map((tag) => ({ tag, label: tag }))];

  els.tagFilterOptions.innerHTML = options
    .map(
      ({ tag, label }) =>
        `<button type="button" class="tag-dropdown-item ${activeTag === tag ? 'active' : ''}" data-tag="${escapeAttr(tag)}">${escapeHtml(label)}</button>`
    )
    .join('');

  els.tagFilterOptions.querySelectorAll('.tag-dropdown-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTag = btn.dataset.tag;
      closeTagFilterMenu();
      render();
    });
  });
}

function renderColorFilterDropdown() {
  if (projects.length === 0) return;

  activeColorFamily = normalizeFilterFamilyId(activeColorFamily);

  const label = getColorFilterLabel(activeColorFamily);
  els.colorFilterLabelText.textContent = label;

  if (activeColorFamily) {
    els.colorFilterBtnSwatch.style.background = getFamilySwatch(normalizeFilterFamilyId(activeColorFamily));
    els.colorFilterBtnSwatch.classList.remove('hidden');
  } else {
    els.colorFilterBtnSwatch.classList.add('hidden');
  }

  els.colorFilterOptions.innerHTML = COLOR_FILTER_OPTIONS.map(({ id, label: optLabel, swatch }) => {
    const swatchHtml = swatch
      ? `<span class="color-filter-item-swatch" style="background:${swatch}" aria-hidden="true"></span>`
      : '';
    return `<button type="button" class="tag-dropdown-item color-filter-item ${normalizeFilterFamilyId(activeColorFamily) === id ? 'active' : ''}" data-color-family="${escapeAttr(id)}">${swatchHtml}<span>${escapeHtml(optLabel)}</span></button>`;
  }).join('');

  els.colorFilterOptions.querySelectorAll('[data-color-family]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeColorFamily = btn.dataset.colorFamily;
      closeColorFilterMenu();
      render();
    });
  });
}

function renderList(items) {
  if (items.length === 0) {
    els.list.innerHTML = '';
    els.empty.classList.remove('hidden');
    return;
  }

  els.empty.classList.add('hidden');
  els.list.innerHTML = items.map(renderCard).join('');

  els.list.querySelectorAll('[data-action]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = el.closest('[data-id]').dataset.id;
      const action = el.dataset.action;
      handleAction(id, action, el);
    });
  });
}

function renderCard(p) {
  const source = detectSource(p.url);
  const iconSrc = getSourceIcon(source.id);
  const initials = source.name.slice(0, 2).toUpperCase();
  const tags =
    p.tags.length > 0
      ? p.tags.map((t) => `<span class="card-tag">${escapeHtml(t)}</span>`).join('')
      : '';
  const cardColor = p.color ? normalizeColor(p.color) : '';
  const cardStyle = cardColor ? ` style="--card-border: ${escapeAttr(cardColor)}"` : '';

  return `
    <article class="card ${p.printed ? 'printed' : ''}" data-id="${p.id}"${cardStyle}>
      <button type="button" class="card-share-btn" data-action="share" aria-label="Condividi link">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="6" cy="12" r="2.25" stroke="currentColor" stroke-width="1.75"/>
          <circle cx="18" cy="6" r="2.25" stroke="currentColor" stroke-width="1.75"/>
          <circle cx="18" cy="18" r="2.25" stroke="currentColor" stroke-width="1.75"/>
          <path d="M8.2 11.2l7.1-3.8M8.2 12.8l7.1 3.8" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
        </svg>
      </button>
      <a href="${escapeAttr(p.url)}" target="_blank" rel="noopener" class="card-link">
        <div class="card-img card-source-icon" data-source="${escapeAttr(source.id)}">
          <img src="${escapeAttr(iconSrc)}" alt="${escapeAttr(source.name)}" loading="lazy" onerror="this.parentElement.classList.add('no-img')">
          <span class="card-img-fallback">${escapeHtml(initials)}</span>
        </div>
        <div class="card-body">
          <span class="card-source">${escapeHtml(source.name)}</span>
          <h2 class="card-title">${escapeHtml(p.title)}</h2>
          ${tags ? `<div class="card-tags">${tags}</div>` : ''}
        </div>
      </a>
      <div class="card-actions">
        <button class="action-btn ${p.printed ? 'done' : ''}" data-action="toggle" aria-label="${p.printed ? 'Segna da stampare' : 'Segna stampato'}">
          ${p.printed ? '✓ Stampato' : '○ Da stampare'}
        </button>
        <button class="action-btn danger" data-action="delete" aria-label="Elimina">✕</button>
      </div>
    </article>
  `;
}

function handleAction(id, action) {
  const idx = projects.findIndex((p) => p.id === id);
  if (idx === -1) return;

  if (action === 'share') {
    shareProject(projects[idx]);
    return;
  }

  if (action === 'toggle') {
    projects[idx].printed = !projects[idx].printed;
    projects[idx].printedAt = projects[idx].printed ? Date.now() : null;
  } else if (action === 'delete') {
    if (!confirm('Eliminare questo modello?')) return;
    projects.splice(idx, 1);
  }

  saveProjects(projects);
  render();
}

async function shareProject(project) {
  const shareData = {
    title: project.title,
    text: project.title,
    url: project.url,
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
  }

  try {
    await navigator.clipboard.writeText(project.url);
    showToast('Link copiato');
  } catch {
    showToast(project.url);
  }
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    els.toast.classList.add('hidden');
  }, 2200);
}

function handleExport() {
  const blob = new Blob([exportData()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `print-queue-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function handleImport(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      if (!confirm('Importare sovrascrivendo la lista attuale?')) return;
      projects = importData(reader.result);
      render();
    } catch {
      alert('File non valido');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

init();
