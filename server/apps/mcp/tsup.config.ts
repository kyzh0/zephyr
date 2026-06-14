import { defineConfig } from 'tsup';
import { baseNodeConfig } from '../../tsup.config.base';

export default defineConfig({
  ...baseNodeConfig,
  entry: ['src/index.ts'],
  format: ['esm']
});
