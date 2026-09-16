// Plain static site served by nginx. There's no build step for a template
// with no framework, so the multi-stage toggle doesn't change anything here
// — it's still shown in the form for consistency, with a note explaining why.

import type { GeneratedFiles, TemplateOptions } from '../types';
import {
  buildDockerignore,
  commandBlock,
  formatArgs,
  formatExpose,
  formatHealthcheck,
  formatLabels,
  joinBlocks,
} from './shared';

function nginxConfLines(listenPort: number): string[] {
  return [
    'server {',
    `    listen ${listenPort};`,
    '    server_name _;',
    '    root /usr/share/nginx/html;',
    '    index index.html;',
    '',
    '    location / {',
    '        try_files $uri $uri/ =404;',
    '    }',
    '}',
  ];
}

function nginxConfRun(listenPort: number): string {
  const format = nginxConfLines(listenPort)
    .map((line) => line.replace(/\\/g, '\\\\').replace(/'/g, "'\\''"))
    .join('\\n');
  return `RUN printf '${format}\\n' > /etc/nginx/conf.d/default.conf`;
}

export function generateStaticNginx(options: TemplateOptions): GeneratedFiles {
  const image = options.nonRoot
    ? `nginxinc/nginx-unprivileged:${options.baseVersion}-alpine`
    : `nginx:${options.baseVersion}-alpine`;
  const listenPort = options.ports[0] ?? (options.nonRoot ? 8080 : 80);

  const dockerfile = joinBlocks(
    `FROM ${image}`,
    formatArgs(options.buildArgs),
    'COPY . /usr/share/nginx/html',
    nginxConfRun(listenPort),
    formatExpose(options.ports.length ? options.ports : [listenPort]),
    formatHealthcheck(options.healthcheck),
    formatLabels(options.labels),
    commandBlock(options.entrypointOverride, options.cmdOverride, '["nginx", "-g", "daemon off;"]'),
  );

  const dockerignore = buildDockerignore(['node_modules']);

  return { dockerfile: `${dockerfile}\n`, dockerignore };
}
