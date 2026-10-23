import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    // Preserve :dir() selectors: rewriting them to :lang() loses automatic
    // direction detection in notes whose Arabic and English share a page.
    cssTarget: ['chrome120', 'edge120', 'firefox128', 'safari17.2'],
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'prosemirror', test: /node_modules[\\/](prosemirror-|orderedmap|rope-sequence|w3c-keyname)/ },
            { name: 'tiptap', test: /node_modules[\\/](@tiptap|@floating-ui|linkifyjs|marked|markdown-it|entities|uc\.micro|mdurl|linkify-it)/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|use-sync-external-store)[\\/]/ },
            { name: 'dexie', test: /node_modules[\\/]dexie/ },
          ],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Noty',
        short_name: 'Noty',
        start_url: '/',
        display: 'standalone',
        background_color: '#F4F6F8',
        theme_color: '#16202C',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
