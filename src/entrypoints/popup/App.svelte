<script lang="ts">
  import { onMount } from 'svelte';
  import {
    DEFAULT_CHAPTERS,
    normalizeUrl,
    type BookmarkChapter,
  } from '../../lib/newtab-core';

  const STORAGE_KEY = 'comelye_clean_v5';

  let chapters = $state<BookmarkChapter[]>(structuredClone(DEFAULT_CHAPTERS));
  let selectedChapterId = $state<string>(DEFAULT_CHAPTERS[0]?.id ?? 'ui-svelte');
  let title = $state('');
  let url = $state('');
  let saved = $state(false);

  onMount(async () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.chapters) && parsed.chapters.length > 0) {
          chapters = parsed.chapters;
          selectedChapterId = chapters[0]?.id ?? 'ui-svelte';
        }
      }
    } catch {
      // ignore
    }

    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
        title = tab.title || '';
        url = tab.url;
      }
    } catch {
      // ignore
    }
  });

  function saveToBook(e: SubmitEvent) {
    e.preventDefault();
    const cleanUrl = normalizeUrl(url);
    if (!title.trim() || !cleanUrl) return;

    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const list: BookmarkChapter[] = Array.isArray(parsed.chapters)
      ? parsed.chapters
      : structuredClone(DEFAULT_CHAPTERS);

    const target = list.find((c) => c.id === selectedChapterId) ?? list[0];
    if (target) {
      target.items.push({
        id: 'bm-' + Date.now(),
        title: title.trim(),
        url: cleanUrl,
      });
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...parsed, chapters: list })
      );
      saved = true;
      setTimeout(() => (saved = false), 1500);
    }
  }

  function openNewTab() {
    browser.tabs.create({ url: browser.runtime.getURL('/newtab.html') });
    window.close();
  }
</script>

<main>
  <div class="popup-head">❦ Simpan ke Buku</div>

  <form onsubmit={saveToBook}>
    <select class="field" bind:value={selectedChapterId}>
      {#each chapters as ch (ch.id)}
        <option value={ch.id}>Bab: {ch.title}</option>
      {/each}
    </select>
    <input class="field" type="text" placeholder="Judul halaman..." bind:value={title} />
    <input class="field" type="text" placeholder="Alamat web..." bind:value={url} />
    <button type="submit" class="btn btn-primary">
      {saved ? 'Tersimpan di halaman buku' : '+ Catat di Buku'}
    </button>
  </form>

  <button type="button" class="btn btn-secondary" onclick={openNewTab}>
    Buka Tab Baru
  </button>
</main>
