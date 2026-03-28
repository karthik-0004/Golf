import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Manual chunks mapping — Vite 8 (Rolldown) requires a function form
const vendorChunks = {
  'vendor-react': ['react', 'react-dom', 'react-router-dom'],
  'vendor-ui': ['framer-motion', 'lucide-react'],
  'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
  'vendor-data': ['@tanstack/react-query', 'axios'],
  'vendor-utils': ['zustand', 'react-hot-toast', 'clsx'],
}

// Build a reverse lookup: module-id → chunk-name
const moduleToChunk = new Map()
for (const [chunkName, modules] of Object.entries(vendorChunks)) {
  for (const mod of modules) {
    moduleToChunk.set(mod, chunkName)
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            for (const [mod, chunkName] of moduleToChunk) {
              if (id.includes(`/node_modules/${mod}/`) || id.includes(`\\node_modules\\${mod}\\`)) {
                return chunkName
              }
            }
          }
        },
      },
    },
    cssCodeSplit: true,
    target: 'es2020',
    chunkSizeWarningLimit: 500,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      'zustand',
      'axios',
      '@tanstack/react-query',
      'react-hook-form',
      'react-hot-toast',
      'lucide-react',
    ],
  },
})
