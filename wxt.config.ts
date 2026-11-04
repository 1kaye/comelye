import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'Comelye',
    description: 'newtab ui extension',
    permissions: ['activeTab'],
  },
});
