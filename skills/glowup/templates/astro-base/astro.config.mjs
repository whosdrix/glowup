import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'astro/config'
import site from './src/content/site.json' with { type: 'json' }

export default defineConfig({
  site: site.meta.url,
  vite: { plugins: [tailwindcss()] },
})
