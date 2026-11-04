import {
  clampCols,
  clampScale,
  clampWidth,
  DEFAULT_CHAPTERS,
  defaultLayout,
  formatDomain,
  normalizeUrl,
  searchBook,
  snapAndClamp,
} from './newtab-core';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

export function runNewtabSelfCheck(): void {
  assertEqual(snapAndClamp(43, 0, 500), 44, 'snap to 4px grid');
  assertEqual(snapAndClamp(-20, 16, 500), 16, 'clamp min bound');
  assertEqual(snapAndClamp(999, 16, 400), 400, 'clamp max bound');
  assertEqual(clampScale(0.2), 0.55, 'clamp min scale');
  assertEqual(clampScale(2.5), 1.85, 'clamp max scale');
  assertEqual(clampWidth(100), 220, 'clamp min search width');
  assertEqual(clampWidth(1200), 860, 'clamp max search width');
  assertEqual(clampCols(0), 4, 'default cols when 0');
  assertEqual(clampCols(5), 5, 'keep valid cols 5');
  assertEqual(clampCols(25), 10, 'clamp max cols to 10');

  const layout = defaultLayout(1440, 900);
  assertEqual(layout.music.x, 56, 'music default x at left');
  assertEqual(layout.music.y, 804, 'music default y at bottom-left');
  assertEqual(layout.book.x, 684, 'book default x at right');
  assertEqual(layout.book.y, 232, 'book default y at middle-right');

  assertEqual(normalizeUrl('svelte.dev'), 'https://svelte.dev', 'prepend https');
  assertEqual(formatDomain('https://www.shadcn-svelte.com/docs'), 'shadcn-svelte.com', 'strip www');

  const svelteHits = searchBook(DEFAULT_CHAPTERS, 'ui svelte');
  assertEqual(svelteHits.length, 4, 'search by chapter title');
}

runNewtabSelfCheck();
