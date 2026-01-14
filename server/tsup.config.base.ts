import { defineConfig } from 'tsup';

export const baseNodeConfig = defineConfig({
  target: 'node24',
  platform: 'node',

  outDir: 'dist',
  sourcemap: true,
  clean: true,

  esbuildOptions(options) {
    options.packages = 'external';
  }
});
