const SITES = [
  { id: 'printables', name: 'Printables', pattern: /printables\.com/i },
  { id: 'thingiverse', name: 'Thingiverse', pattern: /thingiverse\.com/i },
  { id: 'makerworld', name: 'MakerWorld', pattern: /makerworld\.com/i },
  { id: 'thangs', name: 'Thangs', pattern: /thangs\.com/i },
  { id: 'crealitycloud', name: 'Creality Cloud', pattern: /crealitycloud\.com/i },
  { id: 'cults3d', name: 'Cults3D', pattern: /cults3d\.com/i },
  { id: 'myminifactory', name: 'MyMiniFactory', pattern: /myminifactory\.com/i },
  { id: 'yeggi', name: 'Yeggi', pattern: /yeggi\.com/i },
  { id: 'sketchfab', name: 'Sketchfab', pattern: /sketchfab\.com/i },
];

const SOURCE_ICONS = {
  printables: './icons/sources/printables.png',
  thingiverse: './icons/sources/thingiverse.png',
  makerworld: './icons/sources/makerworld.png',
  thangs: './icons/sources/thangs.png',
  crealitycloud: './icons/sources/crealitycloud.png',
  cults3d: './icons/sources/cults3d.svg',
  myminifactory: './icons/sources/myminifactory.svg',
  yeggi: './icons/sources/yeggi.svg',
  sketchfab: './icons/sources/sketchfab.svg',
  other: './icons/sources/other.svg',
};

export function detectSource(url) {
  const site = SITES.find((s) => s.pattern.test(url));
  return site ? { id: site.id, name: site.name } : { id: 'other', name: 'Altro' };
}

export function getSourceIcon(sourceId) {
  return SOURCE_ICONS[sourceId] || SOURCE_ICONS.other;
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
