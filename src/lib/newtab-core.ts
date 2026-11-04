export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
}

export interface BookmarkChapter {
  id: string;
  title: string;
  items: BookmarkItem[];
}

export interface TrackItem {
  id: string;
  title: string;
  src: string;
  isLocal?: boolean;
}

export interface WidgetPos {
  x: number;
  y: number;
  scale: number;
  visible: boolean;
  width?: number;
}

export type WidgetId = 'clock' | 'search' | 'quicklinks' | 'book' | 'music';

export type WidgetLayout = Record<WidgetId, WidgetPos>;

export type SearchEngineId = 'google' | 'duckduckgo' | 'youtube' | 'brave';

export const SEARCH_ENGINES: {
  id: SearchEngineId;
  label: string;
  url: string;
}[] = [
  { id: 'google', label: 'Google', url: 'https://www.google.com/search?q=' },
  { id: 'duckduckgo', label: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  { id: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/results?search_query=' },
  { id: 'brave', label: 'Brave', url: 'https://search.brave.com/search?q=' },
];

export type ColorThemeId = 'sage' | 'rose' | 'sky' | 'amber' | 'lavender';

export const COLOR_THEMES: {
  id: ColorThemeId;
  label: string;
  swatch: string;
}[] = [
  { id: 'sage', label: 'Matcha', swatch: '#4a7c59' },
  { id: 'rose', label: 'Sakura', swatch: '#c86478' },
  { id: 'sky', label: 'Sora', swatch: '#467eb3' },
  { id: 'amber', label: 'Honey', swatch: '#c97b38' },
  { id: 'lavender', label: 'Wisteria', swatch: '#7864a8' },
];

export const DEFAULT_QUICKLINKS: BookmarkItem[] = [
  { id: 'ql-1', title: 'GitHub', url: 'https://github.com' },
  { id: 'ql-2', title: 'YouTube', url: 'https://youtube.com' },
  { id: 'ql-3', title: 'Svelte', url: 'https://svelte.dev' },
  { id: 'ql-4', title: 'Gmail', url: 'https://mail.google.com' },
];

export const DEFAULT_CHAPTERS: BookmarkChapter[] = [
  {
    id: 'ui-svelte',
    title: 'UI Svelte',
    items: [
      { id: 'sv-1', title: 'Svelte 5 Docs', url: 'https://svelte.dev/docs/svelte/overview' },
      { id: 'sv-2', title: 'shadcn-svelte', url: 'https://www.shadcn-svelte.com' },
      { id: 'sv-3', title: 'Bits UI', url: 'https://bits-ui.com' },
      { id: 'sv-4', title: 'WXT Framework', url: 'https://wxt.dev' },
    ],
  },
  {
    id: 'design-art',
    title: 'Design & Art',
    items: [
      { id: 'ds-1', title: 'Studio Ghibli', url: 'https://www.ghibli.jp/works/' },
      { id: 'ds-2', title: 'Minimal Gallery', url: 'https://minimal.gallery' },
      { id: 'ds-3', title: 'Godly Website', url: 'https://godly.website' },
    ],
  },
  {
    id: 'daily-tools',
    title: 'Workspace',
    items: [
      { id: 'wk-1', title: 'GitHub', url: 'https://github.com' },
      { id: 'wk-2', title: 'Bun Docs', url: 'https://bun.sh/docs' },
      { id: 'wk-3', title: 'Lucide Icons', url: 'https://lucide.dev/icons' },
    ],
  },
  {
    id: 'reading',
    title: 'Reference',
    items: [
      { id: 'rd-1', title: 'MDN Web Docs', url: 'https://developer.mozilla.org' },
      { id: 'rd-2', title: 'Chrome Extensions', url: 'https://developer.chrome.com/docs/extensions' },
    ],
  },
];

export const DEFAULT_TRACKS: TrackItem[] = [];

export function defaultLayout(vw = 1440, vh = 860): WidgetLayout {
  const bookX = Math.max(460, snapAndClamp(vw - 756, 200, 3000));
  const bookY = Math.max(48, snapAndClamp((vh - 440) / 2, 32, 2000));
  const musicY = Math.max(420, snapAndClamp(vh - 96, 120, 2000));

  return {
    clock: { x: 56, y: 48, scale: 1, visible: true },
    search: { x: 56, y: 184, scale: 1, visible: true, width: 340 },
    quicklinks: { x: 56, y: 252, scale: 1, visible: true },
    music: { x: 56, y: musicY, scale: 1, visible: true },
    book: { x: bookX, y: bookY, scale: 1, visible: true },
  };
}

export function clampScale(scale: number): number {
  return Math.round(Math.max(0.55, Math.min(1.85, scale)) * 100) / 100;
}

export function clampWidth(width: number): number {
  return Math.round(Math.max(220, Math.min(860, width)));
}

export function clampCols(cols: number): number {
  return Math.max(1, Math.min(10, Math.round(Number(cols) || 4)));
}

export function snapAndClamp(value: number, min: number, max: number): number {
  const clamped = Math.max(min, Math.min(max, value));
  return Math.round(clamped / 4) * 4;
}

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function formatDomain(rawUrl: string): string {
  try {
    const u = new URL(normalizeUrl(rawUrl));
    return u.hostname.replace(/^www\./, '');
  } catch {
    return rawUrl;
  }
}

export function faviconUrl(rawUrl: string): string {
  const domain = formatDomain(rawUrl);
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
}

export interface SearchHit {
  chapterId: string;
  chapterTitle: string;
  item: BookmarkItem;
}

export function searchBook(chapters: BookmarkChapter[], query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: SearchHit[] = [];
  for (const ch of chapters) {
    const chMatch = ch.title.toLowerCase().includes(q);
    for (const item of ch.items) {
      if (chMatch || item.title.toLowerCase().includes(q) || item.url.toLowerCase().includes(q)) {
        results.push({ chapterId: ch.id, chapterTitle: ch.title, item });
      }
    }
  }
  return results;
}

// shortcut: single IndexedDB object store for local audio & wallpaper blobs, upgrade to OPFS if storing >50 tracks
const DB_NAME = 'comelye_media_v1';
const STORE_NAME = 'blobs';

function openMediaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveMediaBlob(key: string, blob: Blob): Promise<void> {
  const db = await openMediaDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(reqError(tx));
  });
}

function reqError(tx: IDBTransaction): DOMException | null {
  return tx.error;
}

export async function loadMediaBlobUrl(key: string): Promise<string | null> {
  const db = await openMediaDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => {
      const result = req.result;
      resolve(result instanceof Blob ? URL.createObjectURL(result) : null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteMediaBlob(key: string): Promise<void> {
  const db = await openMediaDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
