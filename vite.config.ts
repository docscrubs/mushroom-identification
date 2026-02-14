import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    pool: 'vmForks',
    server: {
      deps: {
        inline: [/react-router/],
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/*.png', 'images/mushrooms/*.jpg'],
      manifest: {
        name: 'Mushroom ID - UK Foraging Guide',
        short_name: 'MushroomID',
        description: 'Adaptive mushroom identification and training for UK foragers',
        start_url: '/',
        display: 'standalone',
        background_color: '#1a1a2e',
        theme_color: '#4a6741',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,jpg}'],
        runtimeCaching: [
          {
            urlPattern: /\/api\/chat$/,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api/chat': {
        target: 'https://api.z.ai/api/paas/v4/chat/completions',
        changeOrigin: true,
        rewrite: () => '',
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            if (!proxyReq.getHeader('authorization') && env.ZAI_API_KEY) {
              proxyReq.setHeader('Authorization', `Bearer ${env.ZAI_API_KEY}`);
            }
          });
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
};
});
