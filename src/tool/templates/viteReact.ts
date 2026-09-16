// Vite/React (or any Vite-based SPA) — static build served by nginx.
//
// With multi-stage ON, the Docker build itself runs `npm run build`.
// With multi-stage OFF, the image just serves a `dist/` folder that was
// already built on the host (a common pattern when the build runs in a
// separate CI step) — there is no meaningful single-stage alternative that
// still builds inside a node image and serves via nginx in one FROM.

import type { GeneratedFiles, TemplateOptions } from '../types';
import {
  buildDockerignore,
  CACHE_MOUNT_SYNTAX_PRAGMA,
  commandBlock,
  formatArgs,
  formatExpose,
  formatHealthcheck,
  formatLabels,
  joinBlocks,
} from './shared';
import { nodeBaseImage, nodeInstallCommand, nodeManifestFiles, nodeRunScript } from './nodeShared';

function nginxSpaConfigLines(listenPort: number): string[] {
  return [
    'server {',
    `    listen ${listenPort};`,
    '    server_name _;',
    '    root /usr/share/nginx/html;',
    '    index index.html;',
    '',
    '    location / {',
    '        try_files $uri $uri/ /index.html;',
    '    }',
    '}',
  ];
}

/**
 * `printf` writes the SPA fallback config in a single RUN layer, no COPY of
 * an extra file needed. `printf`'s own backslash-escape handling (not the
 * shell's) turns `\n` into real newlines, so this is POSIX-sh safe.
 */
function nginxConfRun(listenPort: number): string {
  const format = nginxSpaConfigLines(listenPort)
    .map((line) => line.replace(/\\/g, '\\\\').replace(/'/g, "'\\''"))
    .join('\\n');
  return `RUN printf '${format}\\n' > /etc/nginx/conf.d/default.conf`;
}

export function generateViteReact(options: TemplateOptions): GeneratedFiles {
  const pm = options.nodePackageManager;
  const nodeImage = nodeBaseImage(pm, options.baseVersion);
  const nginxImage = options.nonRoot
    ? 'nginxinc/nginx-unprivileged:1.27-alpine'
    : 'nginx:1.27-alpine';
  const listenPort = options.ports[0] ?? (options.nonRoot ? 8080 : 80);

  const manifestFiles = nodeManifestFiles(pm).join(' ');
  const installAll = nodeInstallCommand({ packageManager: pm, cacheMounts: options.cacheMounts, prodOnly: false });
  const buildCmd = `RUN ${nodeRunScript(pm, 'build')}`;

  const runnerStage = joinBlocks(
    `FROM ${nginxImage}`,
    formatArgs(options.buildArgs),
    options.multiStage
      ? `COPY --from=builder ${options.workdir}/dist /usr/share/nginx/html`
      : 'COPY dist /usr/share/nginx/html',
    nginxConfRun(listenPort),
    formatExpose(options.ports.length ? options.ports : [listenPort]),
    formatHealthcheck(options.healthcheck),
    formatLabels(options.labels),
    commandBlock(options.entrypointOverride, options.cmdOverride, '["nginx", "-g", "daemon off;"]'),
  );

  const dockerfile = options.multiStage
    ? joinBlocks(
        options.cacheMounts ? CACHE_MOUNT_SYNTAX_PRAGMA : '',
        joinBlocks(
          `FROM ${nodeImage} AS builder`,
          `WORKDIR ${options.workdir}`,
          `COPY ${manifestFiles} ./`,
          installAll,
          'COPY . .',
          buildCmd,
        ),
        runnerStage,
      )
    : runnerStage;

  const dockerignore = buildDockerignore(['node_modules', 'dist', '.vite', 'npm-debug.log*']);

  return { dockerfile: `${dockerfile}\n`, dockerignore };
}
