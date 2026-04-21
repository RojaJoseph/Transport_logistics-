import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const API_GATEWAY = env.VITE_API_GATEWAY || 'http://localhost:4000';
  const WS_TRACKING = env.VITE_WS_TRACKING  || 'http://localhost:4003';

  return {
    plugins: [react()],

    resolve: {
      alias: {
        '@':           path.resolve(__dirname, './src'),
        '@modules':    path.resolve(__dirname, './src/modules'),
        '@components': path.resolve(__dirname, './src/components'),
        '@store':      path.resolve(__dirname, './src/store'),
        '@hooks':      path.resolve(__dirname, './src/hooks'),
        '@lib':        path.resolve(__dirname, './src/lib'),
      },
    },

    // Dev-only proxy — in production the built JS calls VITE_API_GATEWAY directly
    server: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: false,
      proxy: {
        '/api': {
          target: API_GATEWAY,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
        '/socket.io': {
          target: WS_TRACKING,
          changeOrigin: true,
          ws: true,
        },
      },
    },

    build: {
      outDir: 'dist',
      sourcemap: false,
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor:  ['react', 'react-dom', 'react-router-dom'],
            charts:  ['recharts'],
            ui:      ['lucide-react'],
            query:   ['@tanstack/react-query', 'axios'],
            store:   ['zustand'],
          },
        },
      },
    },

    // Make env vars available in built JS
    define: {
      __API_GATEWAY__: JSON.stringify(API_GATEWAY),
    },
  };
});
