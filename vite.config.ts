import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  base: process.env.PHY_BASE ?? '/',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: { target: 'es2022', emptyOutDir: false },
  server: { host: '127.0.0.1', port: 5173 },
});
