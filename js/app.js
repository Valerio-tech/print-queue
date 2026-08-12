import { loadProjects, saveProjects, createProject, exportData, importData } from './storage.js';
import { parseTags, getAllTags, detectSource, getSourceIcon } from './metadata.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let projects = loadProjects();
let filter = 'todo';
let activeTag = '';
let searchQuery = '';
let tagFilterOpen = false;
let tagSuggestionsOpen = false;

const els = {
  header: $('.header'),
  list: $('#project-list'),
  empty: $('#empty-state'),
  countTodo: $('#count-todo'),
  countDone: $('#count-done'),
  tagFilterWrap: $('#tag-filter-wrap'),
  tagFilterBtn: $('#tag-filter-btn'),
  tagFilterLabel: $('#tag-filter-label'),
  tagFilterMenu: $('#tag-filter-menu'),
  tagFilterOptions: $('#tag-filter-options'),
  search: $('#search-input'),
  addSheet: $('#add-sheet'),
  addForm: $('#add-form'),
  urlInput: $('#url-input'),
  titleInput: $('#title-input'),
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
  bindEvents();
  render();
  registerServiceWorker();
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

  document.addEventListener('click', (e) => {
    if (!els.tagFilterWrap.contains(e.target)) {
      closeTagFilterMenu();
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

function openAddSheet() {
  els.addSheet.classList.add('open');
  els.overlay.classList.add('visible');
  els.urlInput.value = '';
  els.titleInput.value = '';
  els.tagsInput.value = '';
  els.addStatus.textContent = '';
  els.addStatus.className = 'add-status';
  els.tagSuggestions.classList.add('hidden');
  tagSuggestionsOpen = false;
  setTimeout(() => els.urlInput.focus(), 300);
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
  tagFilterOpen = !tagFilterOpen;
  els.tagFilterMenu.classList.toggle('hidden', !tagFilterOpen);
  els.tagFilterBtn.setAttribute('aria-expanded', String(tagFilterOpen));
}

function closeTagFilterMenu() {
  tagFilterOpen = false;
  els.tagFilterMenu.classList.add('hidden');
  els.tagFilterBtn.setAttribute('aria-expanded', 'false');
}

function renderTagFilterDropdown() {
  const tags = getAllTags(projects);

  if (tags.length === 0) {
    els.tagFilterWrap.classList.add('hidden');
    closeTagFilterMenu();
    return;
  }

  els.tagFilterWrap.classList.remove('hidden');
  els.tagFilterLabel.textContent = activeTag || 'Tutti i tag';

  const options = [
    { tag: '', label: 'Tutti i tag' },
    ...tags.map((tag) => ({ tag, label: tag })),
  ];

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

  return `
    <article class="card ${p.printed ? 'printed' : ''}" data-id="${p.id}">
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
