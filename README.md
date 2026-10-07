# Noty

Offline-first notes with pasted images. A PWA: Cloudflare serves the app, the browser stores your data.

## Design rules
1. **The network is never required to edit a note.** Notes and images live in IndexedDB (Dexie); the app shell is precached by a service worker.
2. **You can always get everything out** as plain Markdown + image files (ZIP), and import it back.

## Stack
React + TypeScript + Vite, Tiptap, Dexie, vite-plugin-pwa (Workbox), JSZip, Cloudflare Workers Static Assets.

## Commands
```sh
npm run dev        # dev server
npm run lint
npm run test:e2e   # builds, serves the preview, runs Playwright (offline, images, export/import)
npm run deploy     # build + wrangler deploy (needs `npx wrangler login`)
```

## Storage notes
Browser storage is not a backup. Safari may evict data from sites unused for ~7 days unless installed. Use **Export all** regularly; the sidebar warns when the last export is over a week old.
