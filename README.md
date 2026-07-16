# Audio's Speact

Generator video audio-spectrum: unggah audio, pilih template visual, atur gambar
tengah/overlay/teks, lalu rekam jadi file video yang gerakannya mengikuti ketukan
musik secara langsung (bukan animasi acak).

## Menjalankan secara lokal

```
npm install
npm run dev
```

Buka http://localhost:3000

## Cara kerja singkat

- Audio dibaca lewat Web Audio API (`AnalyserNode`) secara real-time saat diputar,
  jadi visualisasi selalu mengikuti suara yang benar-benar sedang berbunyi.
- "Rekam Video" menggabungkan frame canvas + audio yang sedang diputar lewat
  `MediaRecorder`, menghasilkan file `.webm`. Karena ini rekaman langsung,
  durasi proses rekam = durasi lagu (tidak bisa dipercepat).
- Pengaturan tampilan (bukan file audio/gambar) tersimpan otomatis di sessionStorage
  selama sesi berjalan, dan hilang saat tab/browser benar-benar ditutup.

## Catatan browser

Untuk hasil terbaik gunakan Chrome/Edge versi terbaru di desktop. Fitur
`MediaRecorder` + `canvas.captureStream()` didukung luas, tapi beberapa browser
mobile lama mungkin membatasi resolusi/format rekaman.

## Watermark

Watermark "AUDIO'S SPEACT" muncul default di pojok video. Bisa dimatikan kapan
saja lewat tombol × di pojok pratinjau atau toggle di panel Output — saat ini
gratis, disiapkan untuk jadi fitur berbayar nanti.
