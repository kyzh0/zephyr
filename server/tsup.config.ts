import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/schedulerIndex.ts'],
  format: ['esm'],
  target: 'es2023',
  platform: 'node',

  // output to dist/
  outDir: 'dist',
  sourcemap: true,
  clean: true,

  // keep node_modules deps external (default tsup behavior is generally what you want)
  // so native deps like sharp remain runtime deps, not bundled.
  splitting: false,
  dts: false,

  esbuildOptions(options) {
    options.packages = 'external';
  }
});
