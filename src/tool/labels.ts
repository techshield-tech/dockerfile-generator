// Pure helpers for template-dependent form copy.

import type { TemplateId, TemplateOptions } from './types';

export function baseVersionLabel(templateId: TemplateId, options: TemplateOptions): string {
  switch (templateId) {
    case 'node':
    case 'nextjs':
      return options.nodePackageManager === 'bun' ? 'Bun version' : 'Node.js version';
    case 'vite-react':
      return options.nodePackageManager === 'bun' ? 'Bun version (build stage)' : 'Node.js version (build stage)';
    case 'python':
      return 'Python version';
    case 'go':
      return 'Go version';
    case 'spring-boot':
      return 'JDK/JRE version (Eclipse Temurin)';
    case 'dotnet':
      return '.NET version';
    case 'php-fpm':
      return 'PHP version';
    case 'static-nginx':
      return 'nginx version';
  }
}

export function appModuleLabel(server: TemplateOptions['pythonServer']): string {
  switch (server) {
    case 'gunicorn':
    case 'uvicorn':
      return 'WSGI/ASGI app module (module:attribute)';
    case 'none':
    default:
      return 'Entry point script';
  }
}
