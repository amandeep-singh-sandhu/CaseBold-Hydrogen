import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';
import {hydrogen} from '@shopify/hydrogen/vite';
import {oxygen} from '@shopify/mini-oxygen/vite';
import {reactRouter} from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss(), hydrogen(), oxygen(), reactRouter()],
  resolve: {
    alias: {
      // Vite's native tsconfig path resolver does not cover JavaScript
      // projects that use jsconfig.json, so define Hydrogen's app alias here.
      '~': fileURLToPath(new URL('./app', import.meta.url)),
    },
  },
  build: {
    // Allow a strict Content-Security-Policy
    // without inlining assets as base64:
    assetsInlineLimit: 0,
    outDir: 'dist',
  },
  ssr: {
    optimizeDeps: {
      /**
       * Include dependencies here if they throw CJS<>ESM errors in MiniOxygen.
       * @see https://vitejs.dev/config/dep-optimization-options
       */
      include: [
        'react-router > set-cookie-parser',
        'react-router > cookie',
        'react-router',
        'react-redux',
        'use-sync-external-store',
        'use-sync-external-store/shim/with-selector.js',
        '@reduxjs/toolkit',
      ],
    },
    noExternal: ['react-redux', 'use-sync-external-store', '@reduxjs/toolkit'],
  },
  server: {
    allowedHosts: ['.tryhydrogen.dev'],
  },
});
