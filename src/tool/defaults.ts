import type { TemplateId, TemplateOptions } from './types';
import { templateMetaFor } from './templates';

export function defaultOptionsFor(templateId: TemplateId): TemplateOptions {
  return {
    templateId,
    baseVersion: templateMetaFor(templateId).defaultBaseVersion,
    multiStage: true,
    nonRoot: true,
    nonRootUser: 'appuser',
    nonRootUid: 1000,
    workdir: templateId === 'php-fpm' ? '/var/www/html' : '/app',
    ports: [defaultPortFor(templateId)],
    envVars: [],
    buildArgs: [],
    labels: [],
    healthcheck: {
      enabled: false,
      command: `curl -f http://localhost:${defaultPortFor(templateId)}/ || exit 1`,
      interval: '30s',
      timeout: '3s',
      retries: 3,
    },
    cacheMounts: true,
    entrypointOverride: '',
    cmdOverride: '',
    nodePackageManager: 'npm',
    pythonPackageManager: 'pip',
    pythonServer: 'none',
    pythonAppModule: 'main.py',
    goBaseImage: 'distroless',
    javaBuildTool: 'maven',
  };
}

function defaultPortFor(templateId: TemplateId): number {
  switch (templateId) {
    case 'node':
    case 'nextjs':
      return 3000;
    case 'vite-react':
    case 'static-nginx':
      // 8080 works whether the container ends up running as root or not
      // (default is non-root, and unprivileged nginx can't bind <1024).
      return 8080;
    case 'python':
      return 8000;
    case 'go':
      return 8080;
    case 'spring-boot':
      return 8080;
    case 'dotnet':
      return 8080;
    case 'php-fpm':
      return 9000;
  }
}
