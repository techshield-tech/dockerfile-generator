// PHP-FPM — Composer dependencies installed either in a dedicated `composer`
// stage (multi-stage on) or via a `COPY --from=composer:2` binary copy into
// a single stage (multi-stage off).

import type { GeneratedFiles, TemplateOptions } from '../types';
import {
  alpineNonRootUser,
  buildDockerignore,
  CACHE_MOUNT_SYNTAX_PRAGMA,
  commandBlock,
  formatArgs,
  formatEnv,
  formatExpose,
  formatHealthcheck,
  formatLabels,
  joinBlocks,
} from './shared';

const DEFAULT_CMD = '["php-fpm", "--nodaemonize"]';

function composerInstall(cacheMounts: boolean): string {
  return cacheMounts
    ? 'RUN --mount=type=cache,target=/tmp/cache composer install --no-dev --no-scripts --no-interaction --optimize-autoloader'
    : 'RUN composer install --no-dev --no-scripts --no-interaction --optimize-autoloader';
}

export function generatePhpFpm(options: TemplateOptions): GeneratedFiles {
  const image = `php:${options.baseVersion}-fpm-alpine`;
  const nonRootSetup = options.nonRoot ? alpineNonRootUser(options.nonRootUser, options.nonRootUid) : '';

  const stages = options.multiStage
    ? [
        joinBlocks(
          'FROM composer:2 AS vendor',
          'WORKDIR /app',
          'COPY composer.json composer.lock* ./',
          composerInstall(options.cacheMounts),
        ),
        joinBlocks(
          `FROM ${image} AS runner`,
          formatArgs(options.buildArgs),
          nonRootSetup,
          `WORKDIR ${options.workdir}`,
          'COPY --from=vendor /app/vendor ./vendor',
          'COPY . .',
          options.nonRoot ? `RUN chown -R ${options.nonRootUser}:${options.nonRootUser} ${options.workdir}` : '',
          options.nonRoot ? `USER ${options.nonRootUser}` : '',
          formatEnv(options.envVars),
          formatExpose(options.ports.length ? options.ports : [9000]),
          formatHealthcheck(options.healthcheck),
          formatLabels(options.labels),
          commandBlock(options.entrypointOverride, options.cmdOverride, DEFAULT_CMD),
        ),
      ]
    : [
        joinBlocks(
          `FROM ${image}`,
          formatArgs(options.buildArgs),
          'COPY --from=composer:2 /usr/bin/composer /usr/bin/composer',
          nonRootSetup,
          `WORKDIR ${options.workdir}`,
          'COPY composer.json composer.lock* ./',
          composerInstall(options.cacheMounts),
          'COPY . .',
          options.nonRoot ? `RUN chown -R ${options.nonRootUser}:${options.nonRootUser} ${options.workdir}` : '',
          options.nonRoot ? `USER ${options.nonRootUser}` : '',
          formatEnv(options.envVars),
          formatExpose(options.ports.length ? options.ports : [9000]),
          formatHealthcheck(options.healthcheck),
          formatLabels(options.labels),
          commandBlock(options.entrypointOverride, options.cmdOverride, DEFAULT_CMD),
        ),
      ];

  const dockerfile = joinBlocks(
    options.cacheMounts ? CACHE_MOUNT_SYNTAX_PRAGMA : '',
    stages.join('\n\n'),
  );

  const dockerignore = buildDockerignore(['vendor', 'composer.phar', '*.log']);

  return { dockerfile: `${dockerfile}\n`, dockerignore };
}
