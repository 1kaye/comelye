<script lang="ts">
  import { onMount } from 'svelte';
  import { backOut, cubicOut } from 'svelte/easing';
  import { fade, fly, scale as svelteScale } from 'svelte/transition';
  import AudioLines from '@lucide/svelte/icons/audio-lines';
  import Bookmark from '@lucide/svelte/icons/bookmark';
  import BookMarked from '@lucide/svelte/icons/book-marked';
  import BookOpen from '@lucide/svelte/icons/book-open';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Clock from '@lucide/svelte/icons/clock';
  import ImageUp from '@lucide/svelte/icons/image-up';
  import Maximize2 from '@lucide/svelte/icons/maximize-2';
  import Move from '@lucide/svelte/icons/move';
  import Pause from '@lucide/svelte/icons/pause';
  import Play from '@lucide/svelte/icons/play';
  import Plus from '@lucide/svelte/icons/plus';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import Search from '@lucide/svelte/icons/search';
  import Settings2 from '@lucide/svelte/icons/settings-2';
  import SkipForward from '@lucide/svelte/icons/skip-forward';
  import Volume2 from '@lucide/svelte/icons/volume-2';
  import X from '@lucide/svelte/icons/x';
  import ZoomIn from '@lucide/svelte/icons/zoom-in';
  import {
    clampCols,
    clampScale,
    clampWidth,
    COLOR_THEMES,
    DEFAULT_CHAPTERS,
    DEFAULT_QUICKLINKS,
    DEFAULT_TRACKS,
    defaultLayout,
    deleteMediaBlob,
    faviconUrl,
    loadMediaBlobUrl,
    normalizeUrl,
    saveMediaBlob,
    SEARCH_ENGINES,
    snapAndClamp,
    type BookmarkChapter,
    type BookmarkItem,
    type ColorThemeId,
    type SearchEngineId,
    type TrackItem,
    type WidgetId,
    type WidgetLayout,
  } from '../../lib/newtab-core';

  const STORAGE_KEY = 'comelye_clean_v5';
  const CROP_W = 500;
  const CROP_H = 281;

  let layout = $state<WidgetLayout>(
    defaultLayout(
      typeof window !== 'undefined' ? window.innerWidth : 1440,
      typeof window !== 'undefined' ? window.innerHeight : 860
    )
  );
  let colorTheme = $state<ColorThemeId>('sage');
  let quicklinks = $state<BookmarkItem[]>(structuredClone(DEFAULT_QUICKLINKS));
  let showAddQuicklink = $state(false);
  let newQlTitle = $state('');
  let newQlUrl = $state('');
  let qlCols = $state(4);
  let showQlColSettings = $state(false);

  let chapters = $state<BookmarkChapter[]>(structuredClone(DEFAULT_CHAPTERS));
  let bookOpen = $state(true);
  let spreadIndex = $state(0);
  let flipDirection = $state<'next' | 'prev' | null>(null);
  let prevPageChapters = $state<BookmarkChapter[]>([]);
  let prevSpreadNum = $state(1);
  let bookQuery = $state('');

  // Book 
  let addingToChapterId = $state<string | null>(null);
  let newWebTitle = $state('');
  let newWebUrl = $state('');
  let showNewChapterInput = $state(false);
  let newChapterTitle = $state('');

  // Clock & Search Engine
  let now = $state(new Date());
  let webQuery = $state('');
  let engineId = $state<SearchEngineId>('google');
  let showEngineMenu = $state(false);

  // Audio 
  let tracks = $state<TrackItem[]>(structuredClone(DEFAULT_TRACKS));
  let currentTrackIndex = $state(0);
  let isPlaying = $state(false);
  let autoPlayMusic = $state(true);
  let volume = $state(0.75);
  let showMusicDrawer = $state(false);
  let newTrackTitle = $state('');
  let newTrackUrl = $state('');
  let resolvedAudioUrl = $state('');
  let audioEl: HTMLAudioElement | undefined = $state();

  let customBgUrl = $state('');
  let showDockWidgets = $state(false);
  let showCropModal = $state(false);
  let cropPreviewUrl = $state('');
  let cropNaturalW = $state(1920);
  let cropNaturalH = $state(1080);
  let cropZoom = $state(1);
  let cropPanX = $state(0);
  let cropPanY = $state(0);
  let isPanningCrop = $state(false);
  let cropDragStart = { x: 0, y: 0, panX: 0, panY: 0 };
  let cropImageEl: HTMLImageElement | null = null;

  // Drag, Resize & Width Stretch state
  let draggingId = $state<WidgetId | null>(null);
  let dragOffset = { x: 0, y: 0 };
  let resizingId = $state<WidgetId | null>(null);
  let resizeStart = { x: 0, y: 0, scale: 1 };
  let stretchingSearch = $state(false);
  let stretchStart = { x: 0, width: 340 };
  let hydrated = $state(false);

  const activeEngine = $derived(
    SEARCH_ENGINES.find((e) => e.id === engineId) ?? SEARCH_ENGINES[0]!
  );

  const filteredChapters = $derived.by(() => {
    const q = bookQuery.trim().toLowerCase();
    if (!q) return chapters;
    return chapters
      .map((ch) => {
        if (ch.title.toLowerCase().includes(q)) return ch;
        const items = ch.items.filter(
          (i) => i.title.toLowerCase().includes(q) || i.url.toLowerCase().includes(q)
        );
        return items.length > 0 ? { ...ch, items } : null;
      })
      .filter((ch): ch is BookmarkChapter => ch !== null);
  });

  const totalSpreads = $derived(Math.max(1, Math.ceil(filteredChapters.length / 2)));
  const currentSpread = $derived(Math.min(spreadIndex, totalSpreads - 1));
  const pageChapters = $derived(filteredChapters.slice(currentSpread * 2, currentSpread * 2 + 2));

  const currentTrack = $derived(tracks[currentTrackIndex] ?? null);

  const cropBaseScale = $derived(Math.max(CROP_W / cropNaturalW, CROP_H / cropNaturalH));
  const cropTotalScale = $derived(cropBaseScale * cropZoom);
  const cropRenderedW = $derived(cropNaturalW * cropTotalScale);
  const cropRenderedH = $derived(cropNaturalH * cropTotalScale);

  const timeHM = $derived(
    now
      .toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
      .replace('.', ':')
  );
  const dateLine = $derived(
    now.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  );

  onMount(() => {
    const def = defaultLayout(window.innerWidth, window.innerHeight);
    layout = def;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.layout) {
          for (const k of Object.keys(def) as WidgetId[]) {
            if (parsed.layout[k]) {
              layout[k] = {
                x: parsed.layout[k].x ?? def[k].x,
                y: parsed.layout[k].y ?? def[k].y,
                scale: clampScale(parsed.layout[k].scale ?? 1),
                visible: parsed.layout[k].visible ?? true,
                width: clampWidth(parsed.layout[k].width ?? def[k].width ?? 340),
              };
            }
          }
        }
        if (parsed.colorTheme) colorTheme = parsed.colorTheme;
        if (Array.isArray(parsed.quicklinks)) quicklinks = parsed.quicklinks;
        if (typeof parsed.qlCols === 'number') qlCols = clampCols(parsed.qlCols);
        if (Array.isArray(parsed.chapters) && parsed.chapters.length > 0) {
          chapters = parsed.chapters;
        }
        if (Array.isArray(parsed.tracks)) {
          tracks = parsed.tracks;
        }
        if (typeof parsed.currentTrackIndex === 'number') {
          currentTrackIndex = Math.max(0, parsed.currentTrackIndex);
        }
        if (typeof parsed.volume === 'number') volume = Math.max(0, Math.min(1, parsed.volume));
        if (typeof parsed.autoPlayMusic === 'boolean') autoPlayMusic = parsed.autoPlayMusic;
        if (typeof parsed.bookOpen === 'boolean') bookOpen = parsed.bookOpen;
        if (parsed.engineId) engineId = parsed.engineId;
      }
    } catch {
      // use defaults
    }

    hydrated = true;

    loadMediaBlobUrl('custom-bg')
      .then((u) => {
        if (u) customBgUrl = u;
      })
      .catch(() => {});

    const timer = setInterval(() => {
      now = new Date();
    }, 1000);
    return () => clearInterval(timer);
  });

  $effect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        layout,
        colorTheme,
        quicklinks,
        qlCols,
        chapters,
        tracks,
        currentTrackIndex,
        volume,
        autoPlayMusic,
        bookOpen,
        engineId,
      })
    );
  });

  $effect(() => {
    const track = currentTrack;
    if (!track) {
      resolvedAudioUrl = '';
      isPlaying = false;
      return;
    }
    if (track.src.startsWith('idb:')) {
      loadMediaBlobUrl(track.src.slice(4))
        .then((u) => {
          resolvedAudioUrl = u || '';
        })
        .catch(() => {});
    } else {
      resolvedAudioUrl = track.src;
    }
  });

  $effect(() => {
    if (audioEl) {
      audioEl.volume = volume;
    }
  });

  function toggleWidget(id: WidgetId) {
    layout[id].visible = !layout[id].visible;
  }

  function startDrag(e: PointerEvent, id: WidgetId) {
    e.stopPropagation();
    draggingId = id;
    dragOffset = {
      x: e.clientX - layout[id].x,
      y: e.clientY - layout[id].y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function moveDrag(e: PointerEvent, id: WidgetId) {
    if (draggingId !== id) return;
    e.stopPropagation();
    const maxX = Math.max(80, window.innerWidth - 100);
    const maxY = Math.max(80, window.innerHeight - 60);
    layout[id].x = snapAndClamp(e.clientX - dragOffset.x, 8, maxX);
    layout[id].y = snapAndClamp(e.clientY - dragOffset.y, 8, maxY);
  }

  function endDrag(e: PointerEvent, id: WidgetId) {
    if (draggingId !== id) return;
    e.stopPropagation();
    draggingId = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  // Proportional Scale Resizing
  function startResize(e: PointerEvent, id: WidgetId) {
    e.stopPropagation();
    resizingId = id;
    resizeStart = {
      x: e.clientX,
      y: e.clientY,
      scale: layout[id].scale,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function moveResize(e: PointerEvent, id: WidgetId) {
    if (resizingId !== id) return;
    e.stopPropagation();
    const delta = (e.clientX - resizeStart.x + (e.clientY - resizeStart.y)) / 260;
    layout[id].scale = clampScale(resizeStart.scale + delta);
  }

  function endResize(e: PointerEvent, id: WidgetId) {
    if (resizingId !== id) return;
    e.stopPropagation();
    resizingId = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  function wheelResize(e: WheelEvent, id: WidgetId) {
    if (!e.ctrlKey && !e.altKey) return;
    e.preventDefault();
    const step = e.deltaY < 0 ? 0.06 : -0.06;
    layout[id].scale = clampScale(layout[id].scale + step);
  }

  // Search Box Horizontal Width Stretching
  function startSearchStretch(e: PointerEvent) {
    e.stopPropagation();
    stretchingSearch = true;
    stretchStart = {
      x: e.clientX,
      width: layout.search.width ?? 340,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function moveSearchStretch(e: PointerEvent) {
    if (!stretchingSearch) return;
    e.stopPropagation();
    const deltaX = (e.clientX - stretchStart.x) / layout.search.scale;
    layout.search.width = clampWidth(stretchStart.width + deltaX);
  }

  function endSearchStretch(e: PointerEvent) {
    if (!stretchingSearch) return;
    e.stopPropagation();
    stretchingSearch = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  function addQuicklink(e: SubmitEvent) {
    e.preventDefault();
    const title = newQlTitle.trim();
    const url = normalizeUrl(newQlUrl);
    if (!title || !url) return;
    quicklinks.push({ id: 'ql-' + Date.now(), title, url });
    newQlTitle = '';
    newQlUrl = '';
    showAddQuicklink = false;
  }

  function removeQuicklink(id: string) {
    quicklinks = quicklinks.filter((q) => q.id !== id);
  }

  function turnPage(dir: 'next' | 'prev') {
    if (flipDirection) return;
    if (dir === 'next' && currentSpread < totalSpreads - 1) {
      prevPageChapters = structuredClone($state.snapshot(pageChapters));
      prevSpreadNum = currentSpread + 1;
      flipDirection = 'next';
      spreadIndex = currentSpread + 1;
      setTimeout(() => (flipDirection = null), 520);
    } else if (dir === 'prev' && currentSpread > 0) {
      prevPageChapters = structuredClone($state.snapshot(pageChapters));
      prevSpreadNum = currentSpread + 1;
      flipDirection = 'prev';
      spreadIndex = currentSpread - 1;
      setTimeout(() => (flipDirection = null), 520);
    }
  }

  function handleWebSearch(e: SubmitEvent) {
    e.preventDefault();
    const q = webQuery.trim();
    if (!q) return;
    if (/^https?:\/\//i.test(q) || (/^[a-z0-9-]+(\.[a-z]{2,})+/i.test(q) && !q.includes(' '))) {
      window.location.href = normalizeUrl(q);
      return;
    }
    window.location.href = activeEngine.url + encodeURIComponent(q);
  }

  // Notepad CRUD
  function addChapter(e: SubmitEvent) {
    e.preventDefault();
    const title = newChapterTitle.trim();
    if (!title) return;
    const oldChapters = structuredClone($state.snapshot(pageChapters));
    const oldSpread = currentSpread;
    chapters.push({ id: 'ch-' + Date.now(), title, items: [] });
    newChapterTitle = '';
    showNewChapterInput = false;
    const targetSpread = Math.floor((chapters.length - 1) / 2);
    if (targetSpread !== oldSpread) {
      prevPageChapters = oldChapters;
      prevSpreadNum = oldSpread + 1;
      flipDirection = 'next';
      spreadIndex = targetSpread;
      setTimeout(() => (flipDirection = null), 520);
    }
  }

  function deleteChapter(id: string) {
    if (chapters.length <= 1) return;
    chapters = chapters.filter((c) => c.id !== id);
  }

  function addWebToChapter(e: SubmitEvent, chapterId: string) {
    e.preventDefault();
    const title = newWebTitle.trim();
    const url = normalizeUrl(newWebUrl);
    if (!title || !url) return;
    const ch = chapters.find((c) => c.id === chapterId);
    if (ch) {
      ch.items.push({ id: 'bm-' + Date.now(), title, url });
    }
    newWebTitle = '';
    newWebUrl = '';
    addingToChapterId = null;
  }

  function deleteWebItem(chapterId: string, itemId: string) {
    const ch = chapters.find((c) => c.id === chapterId);
    if (ch) {
      ch.items = ch.items.filter((i) => i.id !== itemId);
    }
  }

  // Music
  async function tryAutoPlay() {
    if (!audioEl || !resolvedAudioUrl || !autoPlayMusic || tracks.length === 0) return;
    audioEl.volume = volume;
    try {
      await audioEl.play();
      isPlaying = true;
    } catch {
      isPlaying = false;
      const unlock = async () => {
        if (!audioEl || !resolvedAudioUrl || !autoPlayMusic) return;
        audioEl.volume = volume;
        try {
          await audioEl.play();
          isPlaying = true;
        } catch {
          // ignore
        }
      };
      window.addEventListener('pointerdown', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
    }
  }

  async function togglePlay() {
    if (tracks.length === 0) {
      showMusicDrawer = true;
      return;
    }
    if (!audioEl || !resolvedAudioUrl) return;
    audioEl.volume = volume;
    if (isPlaying) {
      audioEl.pause();
      isPlaying = false;
      autoPlayMusic = false;
    } else {
      autoPlayMusic = true;
      try {
        await audioEl.play();
        isPlaying = true;
      } catch {
        isPlaying = false;
      }
    }
  }

  function nextTrack() {
    if (tracks.length === 0) return;
    currentTrackIndex = (currentTrackIndex + 1) % tracks.length;
    autoPlayMusic = true;
    isPlaying = false;
    setTimeout(() => tryAutoPlay(), 60);
  }

  function addTrackUrl(e: SubmitEvent) {
    e.preventDefault();
    const title = newTrackTitle.trim();
    const src = normalizeUrl(newTrackUrl);
    if (!title || !src) return;
    tracks.push({ id: 'tr-' + Date.now(), title, src });
    currentTrackIndex = tracks.length - 1;
    autoPlayMusic = true;
    newTrackTitle = '';
    newTrackUrl = '';
    showMusicDrawer = false;
    setTimeout(() => tryAutoPlay(), 80);
  }

  async function handleAudioFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const key = 'audio-' + Date.now();
    await saveMediaBlob(key, file);
    tracks.push({
      id: key,
      title: file.name.replace(/\.[^.]+$/, ''),
      src: `idb:${key}`,
      isLocal: true,
    });
    currentTrackIndex = tracks.length - 1;
    autoPlayMusic = true;
    input.value = '';
    showMusicDrawer = false;
    setTimeout(() => tryAutoPlay(), 80);
  }

  async function removeTrack(idx: number) {
    const tr = tracks[idx];
    if (!tr) return;
    if (tr.src.startsWith('idb:')) {
      await deleteMediaBlob(tr.src.slice(4)).catch(() => {});
    }
    tracks.splice(idx, 1);
    if (tracks.length === 0) {
      currentTrackIndex = 0;
      isPlaying = false;
      if (audioEl) audioEl.pause();
    } else if (currentTrackIndex >= tracks.length) {
      currentTrackIndex = 0;
      isPlaying = false;
    }
  }

  // Interactive Background Cropper
  function clampCropPan(nx: number, ny: number, w: number, h: number) {
    const minX = Math.min(0, CROP_W - w);
    const minY = Math.min(0, CROP_H - h);
    cropPanX = Math.max(minX, Math.min(0, nx));
    cropPanY = Math.max(minY, Math.min(0, ny));
  }

  function handleBgFileSelect(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (cropPreviewUrl) URL.revokeObjectURL(cropPreviewUrl);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      cropImageEl = img;
      cropNaturalW = img.naturalWidth || 1920;
      cropNaturalH = img.naturalHeight || 1080;
      cropZoom = 1;
      const scale = Math.max(CROP_W / cropNaturalW, CROP_H / cropNaturalH);
      cropPanX = (CROP_W - cropNaturalW * scale) / 2;
      cropPanY = (CROP_H - cropNaturalH * scale) / 2;
      cropPreviewUrl = url;
      showCropModal = true;
    };
    img.src = url;
    input.value = '';
  }

  function startCropPan(e: PointerEvent) {
    isPanningCrop = true;
    cropDragStart = {
      x: e.clientX,
      y: e.clientY,
      panX: cropPanX,
      panY: cropPanY,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function moveCropPan(e: PointerEvent) {
    if (!isPanningCrop) return;
    const nx = cropDragStart.panX + (e.clientX - cropDragStart.x);
    const ny = cropDragStart.panY + (e.clientY - cropDragStart.y);
    clampCropPan(nx, ny, cropRenderedW, cropRenderedH);
  }

  function endCropPan(e: PointerEvent) {
    if (!isPanningCrop) return;
    isPanningCrop = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  function handleCropZoomChange(newZoom: number) {
    const clampedZoom = Math.max(1, Math.min(3, newZoom));
    const centerX = (CROP_W / 2 - cropPanX) / cropTotalScale;
    const centerY = (CROP_H / 2 - cropPanY) / cropTotalScale;
    cropZoom = clampedZoom;
    const nextScale = cropBaseScale * clampedZoom;
    const nextW = cropNaturalW * nextScale;
    const nextH = cropNaturalH * nextScale;
    const nx = CROP_W / 2 - centerX * nextScale;
    const ny = CROP_H / 2 - centerY * nextScale;
    clampCropPan(nx, ny, nextW, nextH);
  }

  function wheelCropZoom(e: WheelEvent) {
    e.preventDefault();
    const step = e.deltaY < 0 ? 0.08 : -0.08;
    handleCropZoomChange(Math.round((cropZoom + step) * 100) / 100);
  }

  async function applyCroppedBackground() {
    if (!cropImageEl) return;
    const outW = 1920;
    const outH = 1080;
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sx = Math.max(0, -cropPanX / cropTotalScale);
    const sy = Math.max(0, -cropPanY / cropTotalScale);
    const sw = Math.min(cropNaturalW - sx, CROP_W / cropTotalScale);
    const sh = Math.min(cropNaturalH - sy, CROP_H / cropTotalScale);

    ctx.drawImage(cropImageEl, sx, sy, sw, sh, 0, 0, outW, outH);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/webp', 0.92)
    );
    if (blob) {
      await saveMediaBlob('custom-bg', blob);
      if (customBgUrl) URL.revokeObjectURL(customBgUrl);
      customBgUrl = URL.createObjectURL(blob);
    }
    showCropModal = false;
  }

  async function resetToDefault() {
    await deleteMediaBlob('custom-bg').catch(() => {});
    if (customBgUrl) URL.revokeObjectURL(customBgUrl);
    customBgUrl = '';
    layout = defaultLayout(window.innerWidth, window.innerHeight);
    bookOpen = true;
  }
</script>

{#snippet brandLogo(id: SearchEngineId)}
  {#if id === 'google'}
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/>
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/>
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
    </svg>
  {:else if id === 'duckduckgo'}
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#DE5833" />
      <path fill="#FFF" d="M13.8 6.2c-2.3 0-3.8 1.6-3.8 3.9 0 1.4.4 2.7.9 4.1.4 1.1.3 1.9-.3 2.5-.5.5-.8 1.2-.5 1.9.3.6 1 .9 1.9.9 2.4 0 4.3-1.4 4.3-3.5 0-1-.4-1.8-.9-2.8-.6-1.1-.8-2.1-.6-3.1 1.6-.2 2.9-.7 2.9-1.4 0-.6-1.1-.9-2.5-.9-.4-.9-.8-1.6-1.4-1.6z"/>
      <path fill="#65BC46" d="M11.2 16.5l2.2.8-2.2.9v-1.7z"/>
    </svg>
  {:else if id === 'youtube'}
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#FF0000" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8z"/>
      <polygon fill="#FFF" points="9.6 15.6 15.8 12 9.6 8.4 9.6 15.6"/>
    </svg>
  {:else}
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#FB542B" d="M19.8 3.2 16.5 1h-9L4.2 3.2 2 8.4l2.1 9.4L12 23l7.9-5.2L22 8.4l-2.2-5.2z"/>
      <path fill="#FFF" d="m12 5.4 4.3 2.5-1.1 4.2L12 14.8l-3.2-2.7-1.1-4.2L12 5.4zm0 10.8 2.8-1.8-.9 3.5L12 19.4l-1.9-1.5-.9-3.5L12 16.2z"/>
    </svg>
  {/if}
{/snippet}

<audio
  bind:this={audioEl}
  src={resolvedAudioUrl}
  oncanplay={tryAutoPlay}
  onended={nextTrack}
  onpause={() => (isPlaying = false)}
  onplay={() => (isPlaying = true)}
></audio>

<main
  class="scenery theme-{colorTheme}"
  style={customBgUrl
    ? `background-image: linear-gradient(rgba(15, 25, 20, 0.14), rgba(15, 25, 20, 0.2)), url('${customBgUrl}');`
    : ''}
>
  {#if !customBgUrl}
    <svg class="scenery-art" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <circle cx="250" cy="170" r="100" fill="rgba(255, 253, 240, 0.25)" />
      <g class="cloud-slow" fill="rgba(255, 253, 246, 0.85)">
        <path d="M120 260c0-38 32-68 70-68 28 0 52 16 63 40 9-6 20-10 32-10 31 0 56 25 56 56 0 4-1 8-2 12H122c-1-9-2-19-2-30z" />
        <path d="M880 190c0-46 38-84 85-84 36 0 67 22 79 53 12-8 26-13 42-13 41 0 74 33 74 74 0 5-1 10-2 15H882c-1-14-2-29-2-45z" />
      </g>
      <g class="cloud-fast" fill="rgba(255, 253, 246, 0.55)">
        <path d="M460 320c0-28 24-52 54-52 21 0 40 12 48 30 7-4 15-7 25-7 24 0 43 19 43 43H461c-1-5-1-9-1-14z" />
        <path d="M1190 290c0-30 25-54 56-54 22 0 41 13 50 31 8-5 16-7 26-7 25 0 45 20 45 45h-176c-1-5-1-10-1-15z" />
      </g>
      <path d="M0 730 Q 340 640 720 710 T 1440 680 L 1440 900 L 0 900 Z" fill="var(--hill-1)" opacity="0.78" />
      <path d="M0 780 Q 480 690 960 765 T 1440 740 L 1440 900 L 0 900 Z" fill="var(--hill-2)" />
    </svg>
  {/if}

  <!--CLOCK-->
  {#if layout.clock.visible}
    <div
      class="draggable-item"
      role="toolbar"
      tabindex="-1"
      style="transform: translate3d({layout.clock.x}px, {layout.clock.y}px, 0) scale({layout.clock.scale});"
      onwheel={(e) => wheelResize(e, 'clock')}
    >
      <div
        class="widget-anim-wrap clock-float"
        transition:fly={{ y: 16, duration: 320, easing: backOut }}
      >
        <div class="clock-digits">{timeHM}</div>
        <div class="clock-date-line">{dateLine}</div>

        <div
          class="move-handle"
          role="button"
          tabindex="-1"
          title="Tarik ikon ini untuk memindahkan jam"
          onpointerdown={(e) => startDrag(e, 'clock')}
          onpointermove={(e) => moveDrag(e, 'clock')}
          onpointerup={(e) => endDrag(e, 'clock')}
        >
          <Move size={10} strokeWidth={2.2} />
        </div>

        <div
          class="resize-handle"
          role="slider"
          tabindex="-1"
          aria-valuenow={Math.round(layout.clock.scale * 100)}
          title="Tarik untuk perbesar / perkecil"
          onpointerdown={(e) => startResize(e, 'clock')}
          onpointermove={(e) => moveResize(e, 'clock')}
          onpointerup={(e) => endResize(e, 'clock')}
        >
          <Maximize2 size={10} strokeWidth={2.2} />
        </div>
      </div>
    </div>
  {/if}

  <!-- SEARCH BAR-->
  {#if layout.search.visible}
    <div
      class="draggable-item"
      role="toolbar"
      tabindex="-1"
      style="transform: translate3d({layout.search.x}px, {layout.search.y}px, 0) scale({layout.search.scale});"
      onwheel={(e) => wheelResize(e, 'search')}
    >
      <div
        class="widget-anim-wrap"
        transition:fly={{ y: 16, duration: 320, easing: backOut }}
      >
        <form
          class="search-capsule"
          style="width: {layout.search.width ?? 340}px;"
          onsubmit={handleWebSearch}
        >
          <button
            type="button"
            class="search-icon-picker no-drag"
            onclick={() => (showEngineMenu = !showEngineMenu)}
            title="Pilih Search Engine ({activeEngine.label})"
          >
            {@render brandLogo(activeEngine.id)}
            <ChevronDown size={11} strokeWidth={2} />
          </button>

          <input
            type="text"
            placeholder="Cari di {activeEngine.label}..."
            bind:value={webQuery}
          />

          <div
            class="width-handle"
            role="slider"
            tabindex="-1"
            aria-valuenow={layout.search.width ?? 340}
            title="Tarik ke samping untuk memperpanjang kolom search"
            onpointerdown={startSearchStretch}
            onpointermove={moveSearchStretch}
            onpointerup={endSearchStretch}
          ></div>
        </form>

        {#if showEngineMenu}
          <div
            class="engine-dropdown no-drag"
            transition:svelteScale={{ duration: 180, start: 0.92, easing: backOut }}
          >
            {#each SEARCH_ENGINES as eng (eng.id)}
              <button
                type="button"
                class="engine-opt no-drag {eng.id === engineId ? 'active' : ''}"
                onclick={() => {
                  engineId = eng.id;
                  showEngineMenu = false;
                }}
              >
                {@render brandLogo(eng.id)}
                <span>{eng.label}</span>
              </button>
            {/each}
          </div>
        {/if}

        <div
          class="move-handle"
          role="button"
          tabindex="-1"
          title="Tarik ikon ini untuk memindahkan search"
          onpointerdown={(e) => startDrag(e, 'search')}
          onpointermove={(e) => moveDrag(e, 'search')}
          onpointerup={(e) => endDrag(e, 'search')}
        >
          <Move size={10} strokeWidth={2.2} />
        </div>

        <div
          class="resize-handle"
          role="slider"
          tabindex="-1"
          aria-valuenow={Math.round(layout.search.scale * 100)}
          title="Tarik untuk perbesar / perkecil"
          onpointerdown={(e) => startResize(e, 'search')}
          onpointermove={(e) => moveResize(e, 'search')}
          onpointerup={(e) => endResize(e, 'search')}
        >
          <Maximize2 size={10} strokeWidth={2.2} />
        </div>
      </div>
    </div>
  {/if}

  <!-- BOOKMARKS WIDGET -->
  {#if layout.quicklinks.visible}
    <div
      class="draggable-item"
      role="toolbar"
      tabindex="-1"
      style="transform: translate3d({layout.quicklinks.x}px, {layout.quicklinks.y}px, 0) scale({layout.quicklinks.scale});"
      onwheel={(e) => wheelResize(e, 'quicklinks')}
    >
      <div
        class="widget-anim-wrap"
        transition:fly={{ y: 16, duration: 320, easing: backOut }}
      >
        <div
          class="quicklinks-wrap"
          style="--ql-cols: {Math.min(qlCols, Math.max(1, quicklinks.length + 1))};"
        >
          {#each quicklinks as item (item.id)}
            <div class="ql-pill">
              <a class="ql-link" href={item.url} rel="noreferrer">
                <img class="ql-icon" src={faviconUrl(item.url)} alt="" loading="lazy" />
                <span>{item.title}</span>
              </a>
              <button
                type="button"
                class="ql-del no-drag"
                onclick={() => removeQuicklink(item.id)}
                title="Hapus"
              >
                <X size={11} />
              </button>
            </div>
          {/each}

          <button
            type="button"
            class="ql-add-btn no-drag"
            onclick={() => (showAddQuicklink = !showAddQuicklink)}
            title="Tambah markah cepat"
          >
            <Plus size={15} strokeWidth={2} />
          </button>
        </div>

        {#if showAddQuicklink}
          <form
            class="ql-popover no-drag"
            onsubmit={addQuicklink}
            transition:fly={{ y: 8, duration: 200, easing: cubicOut }}
          >
            <input class="clean-input" type="text" placeholder="Nama web" bind:value={newQlTitle} />
            <input class="clean-input" type="text" placeholder="URL (cont. youtube.com)" bind:value={newQlUrl} />
            <button type="submit" class="pill-action no-drag">Simpan</button>
          </form>
        {/if}

        {#if showQlColSettings}
          <div
            class="col-settings-popover no-drag"
            transition:fly={{ y: 8, duration: 200, easing: cubicOut }}
          >
            <span>Maks kolom / baris</span>
            <input
              class="col-settings-input"
              type="number"
              min="1"
              max="10"
              value={qlCols}
              oninput={(e) =>
                (qlCols = clampCols(Number((e.currentTarget as HTMLInputElement).value)))}
            />
          </div>
        {/if}

        <button
          type="button"
          class="col-settings-btn no-drag {showQlColSettings ? 'active' : ''}"
          onclick={() => (showQlColSettings = !showQlColSettings)}
          title="Atur maksimal kolom bookmark per baris"
        >
          <Settings2 size={10} strokeWidth={2.2} />
        </button>

        <div
          class="move-handle"
          role="button"
          tabindex="-1"
          title="Tarik ikon ini untuk memindahkan markah cepat"
          onpointerdown={(e) => startDrag(e, 'quicklinks')}
          onpointermove={(e) => moveDrag(e, 'quicklinks')}
          onpointerup={(e) => endDrag(e, 'quicklinks')}
        >
          <Move size={10} strokeWidth={2.2} />
        </div>

        <div
          class="resize-handle"
          role="slider"
          tabindex="-1"
          aria-valuenow={Math.round(layout.quicklinks.scale * 100)}
          title="Tarik untuk perbesar / perkecil"
          onpointerdown={(e) => startResize(e, 'quicklinks')}
          onpointermove={(e) => moveResize(e, 'quicklinks')}
          onpointerup={(e) => endResize(e, 'quicklinks')}
        >
          <Maximize2 size={10} strokeWidth={2.2} />
        </div>
      </div>
    </div>
  {/if}

  <!-- AUDIO WAVE -->
  {#if layout.music.visible}
    <div
      class="draggable-item"
      role="toolbar"
      tabindex="-1"
      style="transform: translate3d({layout.music.x}px, {layout.music.y}px, 0) scale({layout.music.scale});"
      onwheel={(e) => wheelResize(e, 'music')}
    >
      <div
        class="widget-anim-wrap music-breeze"
        transition:fly={{ y: 16, duration: 320, easing: backOut }}
      >
        <div class="music-slide-shell {showMusicDrawer ? 'is-open' : ''}">
          <button
            type="button"
            class="audio-wave-btn {isPlaying ? 'playing' : ''}"
            onclick={togglePlay}
            title={isPlaying ? 'Jeda' : tracks.length ? 'Putar' : 'Tambah musik'}
          >
            <span class="wave-bar"></span>
            <span class="wave-bar"></span>
            <span class="wave-bar"></span>
            <span class="wave-bar"></span>
            <span class="wave-bar"></span>
            <span class="wave-bar"></span>
          </button>

          <div class="music-slide-content">
            <div class="music-info">
              <div class="music-track-name">
                {currentTrack ? currentTrack.title : 'Belum ada musik'}
              </div>
              <div class="music-vol-row">
                <Volume2 size={13} strokeWidth={2} />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  class="vol-slider"
                  bind:value={volume}
                  aria-label="Volume"
                />
              </div>
            </div>

            <div class="music-btns">
              <button
                type="button"
                class="icon-circle no-drag"
                onclick={togglePlay}
                title={isPlaying ? 'Jeda' : 'Putar'}
              >
                {#if isPlaying}
                  <Pause size={15} strokeWidth={2} />
                {:else}
                  <Play size={15} strokeWidth={2} />
                {/if}
              </button>

              {#if tracks.length > 1}
                <button type="button" class="icon-circle no-drag" onclick={nextTrack} title="Berikutnya">
                  <SkipForward size={15} strokeWidth={2} />
                </button>
              {/if}

              <button
                type="button"
                class="icon-circle no-drag"
                onclick={() => (showMusicDrawer = !showMusicDrawer)}
                title="Koleksi & tambah musik"
              >
                <Plus size={15} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>

        <div
          class="move-handle"
          role="button"
          tabindex="-1"
          title="Tarik ikon ini untuk memindahkan musik"
          onpointerdown={(e) => startDrag(e, 'music')}
          onpointermove={(e) => moveDrag(e, 'music')}
          onpointerup={(e) => endDrag(e, 'music')}
        >
          <Move size={10} strokeWidth={2.2} />
        </div>

        <div
          class="resize-handle"
          role="slider"
          tabindex="-1"
          aria-valuenow={Math.round(layout.music.scale * 100)}
          title="Tarik untuk perbesar / perkecil"
          onpointerdown={(e) => startResize(e, 'music')}
          onpointermove={(e) => moveResize(e, 'music')}
          onpointerup={(e) => endResize(e, 'music')}
        >
          <Maximize2 size={10} strokeWidth={2.2} />
        </div>
      </div>
    </div>
  {/if}

  <!-- NOTEPAD -->
  {#if layout.book.visible}
    <div
      class="draggable-item book-stage"
      role="toolbar"
      tabindex="-1"
      style="transform: translate3d({layout.book.x}px, {layout.book.y}px, 0) scale({layout.book.scale});"
      onwheel={(e) => wheelResize(e, 'book')}
    >
      <div
        class="widget-anim-wrap"
        transition:fly={{ y: 18, duration: 340, easing: backOut }}
      >
        {#if !bookOpen}
          <div
            class="closed-notepad"
            role="button"
            tabindex="0"
            onclick={() => (bookOpen = true)}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') bookOpen = true;
            }}
            title="Klik untuk membuka notepad"
          >
            <div class="notepad-rings">
              {#each { length: 6 } as _, i (i)}
                <span class="ring-loop"></span>
              {/each}
            </div>
            <div class="closed-notepad-label">
              <BookOpen size={24} strokeWidth={1.6} />
              <h2 class="closed-book-title">Notepad</h2>
              <p class="closed-book-meta">Klik untuk buka</p>
            </div>
          </div>
        {:else}
          <div class="open-notepad">
            <div class="notepad-rings">
              {#each { length: 9 } as _, i (i)}
                <span class="ring-loop"></span>
              {/each}
            </div>

            <div class="notepad-top-binding">
              {#if showNewChapterInput}
                <form class="inline-form" style="width: 100%; margin: 0;" onsubmit={addChapter}>
                  <input
                    class="clean-input"
                    style="background: rgba(255,255,255,0.92);"
                    type="text"
                    placeholder="Judul baru"
                    bind:value={newChapterTitle}
                  />
                  <button type="submit" class="pill-action no-drag">Buat</button>
                  <button
                    type="button"
                    class="header-icon-btn no-drag"
                    onclick={() => (showNewChapterInput = false)}
                  >
                    <X size={14} />
                  </button>
                </form>
              {:else}
                <div class="book-search">
                  <Search size={13} strokeWidth={1.9} />
                  <input
                    type="text"
                    placeholder="Cari di catatan..."
                    bind:value={bookQuery}
                  />
                  {#if bookQuery}
                    <button
                      type="button"
                      class="no-drag"
                      style="color: #fff; display: inline-flex;"
                      onclick={() => (bookQuery = '')}
                    >
                      <X size={13} />
                    </button>
                  {/if}
                </div>

                <div style="display: flex; align-items: center; gap: 6px;">
                  <button
                    type="button"
                    class="header-icon-btn no-drag"
                    onclick={() => (showNewChapterInput = true)}
                    title="Tambah judul bab baru"
                  >
                    <Plus size={15} />
                  </button>
                  <button
                    type="button"
                    class="header-icon-btn no-drag"
                    onclick={() => (bookOpen = false)}
                    title="Lipat / tutup notepad"
                  >
                    <BookMarked size={14} />
                  </button>
                </div>
              {/if}
            </div>

            <div class="notepad-sheet-wrap">
              {#if flipDirection}
                <div
                  class="notepad-flip-sheet {flipDirection === 'next' ? 'flip-next' : 'under-prev'}"
                  aria-hidden="true"
                >
                  <div class="page-chapters">
                    {#each prevPageChapters as chapter (chapter.id)}
                      <section class="chapter-block">
                        <div class="chapter-header">
                          <h3 class="chapter-title">{chapter.title}</h3>
                        </div>
                        <div class="web-list">
                          {#each chapter.items as item (item.id)}
                            <div class="web-item">
                              <span class="web-item-link">
                                <img class="web-favicon" src={faviconUrl(item.url)} alt="" />
                                <span class="web-title">{item.title}</span>
                              </span>
                            </div>
                          {/each}
                        </div>
                      </section>
                    {/each}
                  </div>
                  <div class="page-nav">
                    <ChevronLeft size={16} />
                    <span>Lembar {prevSpreadNum} / {totalSpreads}</span>
                    <ChevronRight size={16} />
                  </div>
                </div>
              {/if}

              <div
                class="notepad-sheet {flipDirection === 'next'
                  ? 'under-next'
                  : flipDirection === 'prev'
                    ? 'flip-prev-in'
                    : ''}"
              >
                <div class="page-chapters">
                  {#each pageChapters as chapter (chapter.id)}
                    <section class="chapter-block">
                      <div class="chapter-header">
                        <h3 class="chapter-title">{chapter.title}</h3>
                        <div class="chapter-tools">
                          <button
                            type="button"
                            class="mini-icon-btn no-drag"
                            title="Tambah web"
                            onclick={() =>
                              (addingToChapterId = addingToChapterId === chapter.id ? null : chapter.id)}
                          >
                            <Plus size={14} />
                          </button>
                          {#if chapters.length > 1}
                            <button
                              type="button"
                              class="mini-icon-btn no-drag"
                              title="Hapus bab"
                              onclick={() => deleteChapter(chapter.id)}
                            >
                              <X size={14} />
                            </button>
                          {/if}
                        </div>
                      </div>

                      {#if addingToChapterId === chapter.id}
                        <form class="inline-form" onsubmit={(e) => addWebToChapter(e, chapter.id)}>
                          <input class="clean-input" type="text" placeholder="Nama" bind:value={newWebTitle} />
                          <input class="clean-input" type="text" placeholder="URL" bind:value={newWebUrl} />
                          <button type="submit" class="pill-action no-drag">OK</button>
                        </form>
                      {/if}

                      <div class="web-list">
                        {#each chapter.items as item (item.id)}
                          <div class="web-item">
                            <a class="web-item-link" href={item.url} rel="noreferrer">
                              <img class="web-favicon" src={faviconUrl(item.url)} alt="" loading="lazy" />
                              <span class="web-title">{item.title}</span>
                            </a>
                            <button
                              type="button"
                              class="web-del no-drag"
                              onclick={() => deleteWebItem(chapter.id, item.id)}
                              title="Hapus"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        {/each}
                      </div>
                    </section>
                  {/each}
                </div>

                <div class="page-nav">
                  <button
                    type="button"
                    class="mini-icon-btn no-drag"
                    disabled={currentSpread === 0}
                    onclick={() => turnPage('prev')}
                    title="Lembar sebelumnya"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span>Lembar {currentSpread + 1} / {totalSpreads}</span>
                  <button
                    type="button"
                    class="mini-icon-btn no-drag"
                    disabled={currentSpread >= totalSpreads - 1}
                    onclick={() => turnPage('next')}
                    title="Lembar berikutnya"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        {/if}

        <div
          class="move-handle"
          role="button"
          tabindex="-1"
          title="Tarik ikon ini untuk memindahkan notepad"
          onpointerdown={(e) => startDrag(e, 'book')}
          onpointermove={(e) => moveDrag(e, 'book')}
          onpointerup={(e) => endDrag(e, 'book')}
        >
          <Move size={10} strokeWidth={2.2} />
        </div>

        <div
          class="resize-handle"
          role="slider"
          tabindex="-1"
          aria-valuenow={Math.round(layout.book.scale * 100)}
          title="Tarik untuk perbesar / perkecil notepad"
          onpointerdown={(e) => startResize(e, 'book')}
          onpointermove={(e) => moveResize(e, 'book')}
          onpointerup={(e) => endResize(e, 'book')}
        >
          <Maximize2 size={10} strokeWidth={2.2} />
        </div>
      </div>
    </div>
  {/if}

  {#if showMusicDrawer}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="crop-overlay"
      onclick={(e) => {
        if (e.target === e.currentTarget) showMusicDrawer = false;
      }}
      transition:fade={{ duration: 160 }}
    >
      <div
        class="music-modal"
        transition:fly={{ y: 14, duration: 240, easing: cubicOut }}
      >
        <div class="crop-header">
          <span class="crop-title">Koleksi & Tambah Musik</span>
          <button type="button" class="mini-icon-btn" onclick={() => (showMusicDrawer = false)}>
            <X size={16} />
          </button>
        </div>

        {#if tracks.length > 0}
          <div class="track-list-box">
            {#each tracks as tr, idx (tr.id)}
              <div class="track-row {idx === currentTrackIndex ? 'active' : ''}">
                <button
                  type="button"
                  style="text-align: left; flex: 1; font-weight: {idx === currentTrackIndex ? '600' : '400'}; display: flex; align-items: center; gap: 8px;"
                  onclick={() => {
                    currentTrackIndex = idx;
                    autoPlayMusic = true;
                    isPlaying = false;
                    setTimeout(() => tryAutoPlay(), 50);
                  }}
                >
                  <AudioLines size={14} />
                  <span>{tr.title}</span>
                </button>
                <button type="button" class="mini-icon-btn" onclick={() => removeTrack(idx)} title="Hapus lagu">
                  <X size={13} />
                </button>
              </div>
            {/each}
          </div>
        {/if}

        <form onsubmit={addTrackUrl} style="display: flex; flex-direction: column; gap: 8px;">
          <input class="clean-input" type="text" placeholder="Judul lagu." bind:value={newTrackTitle} />
          <input class="clean-input" type="text" placeholder="URL stream / file MP3..." bind:value={newTrackUrl} />
          <div style="display: flex; gap: 8px; margin-top: 4px;">
            <button type="submit" class="pill-action" style="flex: 1;">Simpan URL</button>
            <label class="pill-action secondary" style="cursor: pointer;">
              <span>Upload MP3 Lokal</span>
              <input type="file" accept="audio/*" onchange={handleAudioFile} style="display: none;" />
            </label>
          </div>
        </form>
      </div>
    </div>
  {/if}

  {#if showCropModal}
    <div class="crop-overlay" transition:svelteScale={{ duration: 200, start: 0.96 }}>
      <div class="crop-modal">
        <div class="crop-header">
          <span class="crop-title">Pilih Bagian Background</span>
          <button type="button" class="mini-icon-btn" onclick={() => (showCropModal = false)}>
            <X size={16} />
          </button>
        </div>

        <div
          class="crop-viewport"
          role="application"
          aria-label="Geser dan perbesar area foto background"
          onpointerdown={startCropPan}
          onpointermove={moveCropPan}
          onpointerup={endCropPan}
          onwheel={wheelCropZoom}
        >
          <img
            class="crop-img"
            src={cropPreviewUrl}
            alt="Preview"
            style="width: {cropRenderedW}px; height: {cropRenderedH}px; transform: translate3d({cropPanX}px, {cropPanY}px, 0);"
          />
          <div class="crop-grid"></div>
          <div class="crop-hint">Tarik foto untuk menggeser · Scroll untuk zoom</div>
        </div>

        <div class="crop-controls">
          <div class="crop-zoom-wrap">
            <ZoomIn size={15} />
            <input
              type="range"
              min="1"
              max="3"
              step="0.02"
              class="crop-zoom-slider"
              value={cropZoom}
              oninput={(e) => handleCropZoomChange(Number((e.currentTarget as HTMLInputElement).value))}
              aria-label="Zoom foto"
            />
            <span style="min-width: 36px; text-align: right;">{Math.round(cropZoom * 100)}%</span>
          </div>

          <div style="display: flex; gap: 6px;">
            <button type="button" class="pill-action secondary" onclick={() => (showCropModal = false)}>
              Batal
            </button>
            <button type="button" class="pill-action" onclick={applyCroppedBackground}>
              Terapkan Background
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- ICON DOCK-->
  <nav class="corner-dock" aria-label="Pengaturan widget, tema warna, dan background">
    {#if showDockWidgets}
      <div
        class="dock-tray"
        transition:fly={{ x: 18, duration: 220, easing: cubicOut }}
      >
        {#each COLOR_THEMES as th (th.id)}
          <button
            type="button"
            class="swatch-dot {colorTheme === th.id ? 'active' : ''}"
            style="background-color: {th.swatch};"
            onclick={() => (colorTheme = th.id)}
            title="Tema {th.label}"
          ></button>
        {/each}

        <div class="dock-sep"></div>

        <button
          type="button"
          class="dock-btn {layout.clock.visible ? 'active' : ''}"
          onclick={() => toggleWidget('clock')}
          title={layout.clock.visible ? 'Sembunyikan Jam' : 'Tampilkan Jam'}
        >
          <Clock size={16} strokeWidth={1.8} />
        </button>

        <button
          type="button"
          class="dock-btn {layout.search.visible ? 'active' : ''}"
          onclick={() => toggleWidget('search')}
          title={layout.search.visible ? 'Sembunyikan Search' : 'Tampilkan Search'}
        >
          <Search size={16} strokeWidth={1.8} />
        </button>

        <button
          type="button"
          class="dock-btn {layout.quicklinks.visible ? 'active' : ''}"
          onclick={() => toggleWidget('quicklinks')}
          title={layout.quicklinks.visible ? 'Sembunyikan Markah Cepat' : 'Tampilkan Markah Cepat'}
        >
          <Bookmark size={16} strokeWidth={1.8} />
        </button>

        <button
          type="button"
          class="dock-btn {layout.music.visible ? 'active' : ''}"
          onclick={() => toggleWidget('music')}
          title={layout.music.visible ? 'Sembunyikan Musik' : 'Tampilkan Musik'}
        >
          <AudioLines size={16} strokeWidth={1.8} />
        </button>

        <button
          type="button"
          class="dock-btn {layout.book.visible ? 'active' : ''}"
          onclick={() => toggleWidget('book')}
          title={layout.book.visible ? 'Sembunyikan Catatan' : 'Tampilkan Catatan'}
        >
          <BookOpen size={16} strokeWidth={1.8} />
        </button>

        <div class="dock-sep"></div>

        <label class="dock-btn" title="Pilih & potong foto background">
          <ImageUp size={16} strokeWidth={1.8} />
          <input type="file" accept="image/*" onchange={handleBgFileSelect} style="display: none;" />
        </label>

        <button
          type="button"
          class="dock-btn"
          onclick={resetToDefault}
          title="Reset posisi & background default"
        >
          <RotateCcw size={15} strokeWidth={1.8} />
        </button>

        <div class="dock-sep"></div>
      </div>
    {/if}

    <button
      type="button"
      class="dock-btn {showDockWidgets ? 'active' : ''}"
      onclick={() => (showDockWidgets = !showDockWidgets)}
      title="Pengaturan"
    >
      <span class="dock-gear {showDockWidgets ? 'rotated' : ''}">
        <Settings2 size={17} strokeWidth={1.8} />
      </span>
    </button>
  </nav>
</main>
