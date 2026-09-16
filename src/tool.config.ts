// Per-tool metadata. This is the ONE file (together with `src/tool/`,
// `index.html`'s fallback <title>, and this repo's README) that changes
// when this template is copied to a new tool repo.

// Imports from '@mmoall/tool-kit/config' (a plain-JS-backed subpath), not
// the main '@mmoall/tool-kit' barrel — this file is also reachable from
// vite.config.ts's config-load chain, which cannot load the main barrel's
// .ts source from inside node_modules. See '@mmoall/tool-kit/config's
// source comment for why.
import { defineToolConfig } from '@mmoall/tool-kit/config';

export const toolConfig = defineToolConfig({
  slug: 'dockerfile-generator',
  name: 'Dockerfile Generator',
  description:
    'Generate a production-grade Dockerfile and .dockerignore for Node.js, Next.js, Vite/React, Python, Go, Spring Boot, .NET, PHP-FPM, or a static site — fast, free, and 100% client-side.',
  category: 'Docker',
  keywords: [
    'dockerfile generator',
    'docker generator',
    'dockerignore generator',
    'multi-stage dockerfile',
    'dockerfile best practices',
    'nodejs dockerfile',
    'nextjs dockerfile',
    'python dockerfile',
    'go dockerfile',
    'spring boot dockerfile',
    'online docker tool',
  ],
});
