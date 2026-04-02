import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import process from 'process';

/**
 * Production-ready Vite configuration.
 * Resolves esbuild deprecation warnings, addresses jsx input options errors,
 * and explicitly imports 'process' to satisfy strict TypeScript Node environments.
 */
export default defineConfig({
  plugins: [
    react(), 
    tsconfigPaths()
  ],
  // Prevent Vite from obscuring Rust compiler errors in the terminal
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  // Ensure Tauri environment variables are exposed
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    // Specifically target the Tauri runtime environment based on OS
    target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    // Disable minification for debug builds to ensure readable stack traces
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  }
});