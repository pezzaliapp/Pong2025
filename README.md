# Pong2025 (PWA in una cartella)

Pong classico, reimmaginato come Progressive Web App. Funziona su **iOS**, **Android**, **tablet** e **desktop**: installabile, offline, full‑screen.

## Caratteristiche
- Modalità **Solo (vs CPU)** e **2 Giocatori** (stesso dispositivo)
- **Controlli touch**: trascina su/giù nella tua metà campo
- **Tastiera**: W/S (P1), frecce ↑/↓ (P2)
- **Velocità**: lenta, normale, veloce (salvata in `localStorage`)
- **PWA completa**: `manifest.json`, `service-worker.js`, icone
- **Canvas DPR-aware**: rendering nitido su schermi retina

## Struttura (tutto in una cartella)
```
Pong2025/
  index.html
  app.js
  manifest.json
  service-worker.js
  icons/
    icon-192.png
    icon-512.png
    icon-maskable-192.png
    icon-maskable-512.png
    apple-touch-icon-180.png
```

## Deploy
- Copia la cartella su un hosting statico (GitHub Pages, Netlify, tuo server).
- Assicurati che i file siano serviti via **HTTPS** (necessario per l'installazione PWA e SW).
- iOS: per aggiungere alla Home, apri in Safari → Condividi → **Aggiungi a Home**.

## Note tecniche
- L'IA della CPU segue la palla con una velocità dipendente dalla velocità della palla.
- L'installazione PWA su Android/Chrome è proposta via evento `beforeinstallprompt`.
- Il SW usa una cache **network-first con fallback** semplificato sull’HTML.
