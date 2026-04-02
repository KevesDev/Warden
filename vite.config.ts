import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * Production-ready Vite configuration.
 * Resolves esbuild deprecation warnings and addresses jsx input options errors.
 */
export default defineConfig({
  plugins: [
    react(), 
    tsconfigPaths()
  ],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    // Specifically target the Tauri runtime environment
    target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  }
});