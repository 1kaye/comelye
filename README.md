Ekstensi browser untuk mengubah tampilan antarmuka New Tab dengan widget modular (jam, pencarian web, markah cepat, catatan markah, dan pemutar musik).

## Stack

- **WXT**: Framework pengembangan ekstensi browser berbasis Vite (Manifest V3).
- **Svelte 5**: Framework UI reaktif untuk komponen dan animasi widget.
- **Bun**: Runtime JavaScript dan package manager.
- **@lucide/svelte**: Koleksi ikon antarmuka.
- **IndexedDB & localStorage**: Penyimpanan file media (audio lokal/gambar) dan konfigurasi tata letak widget.

## Perintah

- `bun run dev` - Jalankan ekstensi di Chrome mode pengembangan
- `bun run dev:firefox` - Jalankan ekstensi di Firefox mode pengembangan
- `bun run build` - Build ekstensi untuk Chrome (hasil di `.output/chrome-mv3`)
- `bun run build:firefox` - Build ekstensi untuk Firefox (hasil di `.output/firefox-mv2`)
- `bun run check` - Pengecekan tipe Svelte & TypeScript
- `bun run zip` - Paketkan hasil build Chrome menjadi file ZIP
- `bun run zip:firefox` - Paketkan hasil build Firefox menjadi file ZIP
