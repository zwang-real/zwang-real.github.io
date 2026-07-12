import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://your-domain.com',   // update when domain is set
  build: {
    inlineStylesheets: 'auto',
  },
});
