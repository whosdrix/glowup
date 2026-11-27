import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { glowup: 'src/cli.ts' },
  outDir: 'skills/glowup/dist',
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  outExtension: () => ({ js: '.mjs' }),
  external: ['playwright-core', 'axe-core'],
  banner: { js: '#!/usr/bin/env node' },
  clean: true,
  minify: false,
  splitting: false,
})
