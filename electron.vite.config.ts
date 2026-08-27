import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    build: {
      rollupOptions: { input: 'src/main/index.ts' },
      // cgateweb/cgate-client and the Studio-local parser/exporter/TREEXML
      // helpers are CommonJS. Vite's commonjs transform covers node_modules
      // by default; include the local cgate-client folder too.
      commonjsOptions: { include: [/node_modules/, /cgate-client/] },
    },
  },
  preload: { build: { rollupOptions: { input: 'src/preload/index.ts' } } },
  renderer: { root: 'src/renderer', plugins: [react()] },
});
