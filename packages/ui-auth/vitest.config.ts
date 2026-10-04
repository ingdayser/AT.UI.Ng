import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const src = (name: string): string => fileURLToPath(new URL(`../${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  resolve: { alias: { '@at/ui-core': src('ui-core'), '@at/ui-http': src('ui-http') } },
  test: { environment: 'jsdom', setupFiles: ['./src/testing/setup.ts'] },
});
