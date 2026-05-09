import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/browser.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  external: [
    '@azure/cosmos',
    '@azure/storage-blob',
    '@google-cloud/storage',
    'compromise',
    'zod'
  ]
});
