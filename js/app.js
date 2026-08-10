import { loadProjects, saveProjects, createProject, exportData, importData } from './storage.js';
import { fetchMetadata, parseTags, getAllTags, detectSource } from './metadata.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let projects = loadProjects();
let filter = 'todo';
let activeTag = '';
let searchQuery = '';

const els = {
  list: $('#project-list'),
  empty: $('#empty-state'),
  countTodo: $('#count-todo'),
  countDone: $('#count-done'),
  tagFilters: $('#tag-filters'),
  search: $('#search-input'),
  addSheet: $('#add-sheet'),
  addForm: $('#add-form'),
  urlInput: $('#url-input'),
  tagsInput: $('#tags-input'),
  addStatus: $('#add-status'),
  addBtn: $('#add-btn'),
  fab: $('#fab-add'),
  overlay: $('#overlay'),
  importFile: $('#import-file'),
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

  $('#export-btn').addEventListener('click', handleExport);
  $('#import-btn').addEventListener('click', () => els.importFile.click());
  els.importFile.addEventListener('change', handleImport);
}

function openAddSheet() {
  els.addSheet.classList.add('open');
  els.overlay.classList.add('visible');
  els.urlInput.value = '';
  els.tagsInput.value = '';
  els.addStatus.textContent = '';
  els.addStatus.className = 'add-status';
  setTimeout(() => els.urlInput.focus(), 300);
}

function closeAddSheet() {
  els.addSheet.classList.remove('open');
  els.overlay.classList.remove('visible');
}

async function handleAdd(e) {
  e.preventDefault();
  const url = els.urlInput.value.trim();
  if (!url) return;

  try {
    new URL(url);
  } catch {
    showAddStatus('URL non valido', 'error');
    return;
  }

  els.addBtn.disabled = true;
  showAddStatus('Recupero info dal link…', 'loading');

  const tags = parseTags(els.tagsInput.value);
  const meta = await fetchMetadata(url);

  const project = createProject({
    url,
    title: meta.title,
    image: meta.image,
    source: meta.source,
    tags,
  });

  projects.unshift(project);
  saveProjects(projects);
  closeAddSheet();
  render();
  els.addBtn.disabled = false;
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

  renderTagFilters();
  renderList(filtered);
}

function renderTagFilters() {
  const tags = getAllTags(projects);
  if (tags.length === 0) {
    els.tagFilters.innerHTML = '';
    return;
  }

  const chips = tags
    .map(
      (tag) =>
        `<button class="tag-chip ${activeTag === tag ? 'active' : ''}" data-tag="${escapeAttr(tag)}">${escapeHtml(tag)}</button>`
    )
    .join('');

  els.tagFilters.innerHTML = `
    <button class="tag-chip ${activeTag === '' ? 'active' : ''}" data-tag="">Tutti</button>
    ${chips}
  `;

  els.tagFilters.querySelectorAll('.tag-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      activeTag = chip.dataset.tag;
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
  const img = p.image
    ? `<img src="${escapeAttr(p.image)}" alt="" loading="lazy" onerror="this.parentElement.classList.add('no-img')">`
    : '';
  const tags =
    p.tags.length > 0
      ? p.tags.map((t) => `<span class="card-tag">${escapeHtml(t)}</span>`).join('')
      : '';

  return `
    <article class="card ${p.printed ? 'printed' : ''}" data-id="${p.id}">
      <a href="${escapeAttr(p.url)}" target="_blank" rel="noopener" class="card-link">
        <div class="card-img">${img}<span class="card-img-fallback">3D</span></div>
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
