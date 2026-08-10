const STORAGE_KEY = 'print-queue-projects';

export function loadProjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function createProject(data) {
  return {
    id: crypto.randomUUID(),
    url: data.url,
    title: data.title || 'Senza titolo',
    image: data.image || '',
    source: data.source || 'unknown',
    tags: data.tags || [],
    printed: false,
    createdAt: Date.now(),
    printedAt: null,
  };
}

export function exportData() {
  return JSON.stringify(loadProjects(), null, 2);
}

export function importData(json) {
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error('Formato non valido');
  saveProjects(parsed);
  return parsed;
}
