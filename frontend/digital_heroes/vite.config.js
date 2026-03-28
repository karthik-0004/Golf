import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Split vendor chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libs in one chunk (cached across all pages)
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI / animation libraries
          'vendor-ui': ['framer-motion', 'lucide-react'],
          // Form + validation
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Data fetching
          'vendor-data': ['@tanstack/react-query', 'axios'],
          // State + utilities
          'vendor-utils': ['zustand', 'react-hot-toast', 'clsx'],
        },
      },
    },
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Smaller chunk size warnings
    chunkSizeWarningLimit: 500,
  },
  // Optimize dependency pre-bundling
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
