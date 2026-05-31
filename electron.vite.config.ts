import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    build: {
      rollupOptions: { input: 'src/main/index.ts' },
      // The vendored cgate-client modules are CommonJS (module.exports). Vite's
      // commonjs transform only covers node_modules by default, so include the
      // vendored source too — otherwise Rollup can't resolve our ESM imports of
      // them and they'd be left as broken runtime requires.
      commonjsOptions: { include: [/node_modules/, /cgate-client/] },
    },
  },
  preload: { build: { rollupOptions: { input: 'src/preload/index.ts' } } },
  renderer: { root: 'src/renderer', plugins: [react()] },
});
