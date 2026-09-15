/**
 * ShopFinder — Histórico local do usuário (NOVA_DIRECAO A1/A2).
 *
 * Cookieless-first: views e buscas vivem em localStorage (sem identificador,
 * sem servidor). Chaves versionadas; LRU por lista.
 */

const VIEWS_KEY = "shopfinder:history:views";
const SEARCHES_KEY = "shopfinder:history:searches";
const MAX_ITEMS = 20;

export interface HistoryItem {
  slug: string;
  title: string;
  niche: string | null;
  ts: number;
}

function read(key: string): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (i): i is HistoryItem =>
        i && typeof i.slug === "string" && typeof i.title === "string" && typeof i.ts === "number"
    );
  } catch {
    return [];
  }
}

function write(key: string, items: HistoryItem[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // quota — ignora
  }
}

export function recordView(item: Omit<HistoryItem, "ts">) {
  if (typeof window === "undefined") return;
  const views = read(VIEWS_KEY).filter((v) => v.slug !== item.slug);
  views.unshift({ ...item, ts: Date.now() });
  write(VIEWS_KEY, views);
}

export function recordSearch(query: string) {
  const q = query.trim();
  if (!q) return;
  const searches = read(SEARCHES_KEY).filter((s) => s.slug !== q.toLowerCase());
  searches.unshift({ slug: q.toLowerCase(), title: q, niche: null, ts: Date.now() });
  write(SEARCHES_KEY, searches);
}

export function readViews(): HistoryItem[] {
  return read(VIEWS_KEY);
}

export function readSearches(): HistoryItem[] {
  return read(SEARCHES_KEY);
}
