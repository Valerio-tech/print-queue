const SITES = [
  { id: 'printables', name: 'Printables', pattern: /printables\.com/i },
  { id: 'thingiverse', name: 'Thingiverse', pattern: /thingiverse\.com/i },
  { id: 'makerworld', name: 'MakerWorld', pattern: /makerworld\.com/i },
  { id: 'thangs', name: 'Thangs', pattern: /thangs\.com/i },
];

export function detectSource(url) {
  const site = SITES.find((s) => s.pattern.test(url));
  return site ? { id: site.id, name: site.name } : { id: 'other', name: 'Altro' };
}

function parseOgTag(html, property) {
  const regex = new RegExp(
    `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
    'i'
  );
  const alt = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`,
    'i'
  );
  return regex.exec(html)?.[1] || alt.exec(html)?.[1] || '';
}

function parseTitleTag(html) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : '';
}

function cleanTitle(title, sourceName) {
  let cleaned = title
    .replace(/\s*[-|–—]\s*(Printables|Thingiverse|MakerWorld|Thangs).*$/i, '')
    .replace(/\s*[-|–—]\s*3D\s*print.*$/i, '')
    .trim();
  if (!cleaned || cleaned.toLowerCase() === sourceName.toLowerCase()) {
    return '';
  }
  return cleaned;
}

async function fetchHtml(url) {
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(proxyUrl, { signal: controller.signal });
    if (!res.ok) throw new Error('Fetch failed');
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchMetadata(url) {
  const source = detectSource(url);
  const fallback = {
    title: '',
    image: '',
    source: source.id,
    sourceName: source.name,
  };

  try {
    const html = await fetchHtml(url);
    const ogTitle = parseOgTag(html, 'og:title');
    const ogImage = parseOgTag(html, 'og:image');
    const pageTitle = parseTitleTag(html);

    const title = cleanTitle(ogTitle || pageTitle, source.name);

    return {
      title: title || `Modello da ${source.name}`,
      image: ogImage,
      source: source.id,
      sourceName: source.name,
    };
  } catch {
    return {
      ...fallback,
      title: fallback.title || `Modello da ${source.name}`,
    };
  }
}

export function parseTags(input) {
  if (!input || !input.trim()) return [];
  return [
    ...new Set(
      input
        .split(/[,;#]+/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
}

export function getAllTags(projects) {
  const tags = new Set();
  projects.forEach((p) => p.tags.forEach((t) => tags.add(t)));
  return [...tags].sort();
}
