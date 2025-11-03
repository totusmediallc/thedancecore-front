import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  const isMock = process.env.VITE_NITRO_MOCK === 'true';
  const proxyTarget = isMock
    ? 'http://localhost:5320'
    : 'http://localhost:3000';
  // ESM-friendly current directory (avoid __dirname)
  const rootDir = fileURLToPath(new URL('.', import.meta.url));
  return {
    application: {},
    vite: {
      resolve: {
        alias: {
          '@': path.resolve(rootDir, 'src'),
        },
      },
      server: {
        proxy: {
          '/api': {
            changeOrigin: true,
            rewrite: (path) => (isMock ? path : path.replace(/^\/api/, '')),
            // mock代理目标地址
            // Redirige a Mock (Nitro) o a NestJS en dev, según VITE_NITRO_MOCK
            target: proxyTarget,
            ws: true,
          },
          // Asegura que /auth/* funcione tanto con Mock (requiere prefijo /api) como con Nest
          '/auth': {
            changeOrigin: true,
            rewrite: (path) => (isMock ? `/api${path}` : path),
            target: proxyTarget,
            ws: true,
          },
        },
      },
    },
  };
});
