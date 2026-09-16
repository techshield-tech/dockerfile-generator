// Generic Node.js service — no framework-specific build step, just install
// dependencies and run. Good for Express/Fastify/Koa-style servers.

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
import { nodeBaseImage, nodeExecCommand, nodeInstallCommand, nodeManifestFiles } from './nodeShared';

export function generateNode(options: TemplateOptions): GeneratedFiles {
  const pm = options.nodePackageManager;
  const image = nodeBaseImage(pm, options.baseVersion);
  const manifestFiles = nodeManifestFiles(pm).join(' ');
  const install = nodeInstallCommand({ packageManager: pm, cacheMounts: options.cacheMounts, prodOnly: true });
  const defaultCmd = nodeExecCommand(pm, 'start');

  const nonRootSetup = options.nonRoot
    ? alpineNonRootUser(options.nonRootUser, options.nonRootUid)
    : '';

  const stages = options.multiStage
    ? [
        joinBlocks(
          `FROM ${image} AS deps`,
          `WORKDIR ${options.workdir}`,
          `COPY ${manifestFiles} ./`,
          install,
        ),
        joinBlocks(
          `FROM ${image} AS runner`,
          formatArgs(options.buildArgs),
          nonRootSetup,
          `WORKDIR ${options.workdir}`,
          `COPY --from=deps ${options.workdir}/node_modules ./node_modules`,
          'COPY . .',
          options.nonRoot ? `RUN chown -R ${options.nonRootUser}:${options.nonRootUser} ${options.workdir}` : '',
          options.nonRoot ? `USER ${options.nonRootUser}` : '',
          formatEnv(options.envVars),
          formatExpose(options.ports),
          formatHealthcheck(options.healthcheck),
          formatLabels(options.labels),
          commandBlock(options.entrypointOverride, options.cmdOverride, defaultCmd),
        ),
      ]
    : [
        joinBlocks(
          `FROM ${image}`,
          formatArgs(options.buildArgs),
          nonRootSetup,
          `WORKDIR ${options.workdir}`,
          `COPY ${manifestFiles} ./`,
          install,
          'COPY . .',
          options.nonRoot ? `RUN chown -R ${options.nonRootUser}:${options.nonRootUser} ${options.workdir}` : '',
          options.nonRoot ? `USER ${options.nonRootUser}` : '',
          formatEnv(options.envVars),
          formatExpose(options.ports),
          formatHealthcheck(options.healthcheck),
          formatLabels(options.labels),
          commandBlock(options.entrypointOverride, options.cmdOverride, defaultCmd),
        ),
      ];

  const dockerfile = joinBlocks(
    options.cacheMounts ? CACHE_MOUNT_SYNTAX_PRAGMA : '',
    stages.join('\n\n'),
  );

  const dockerignore = buildDockerignore(['node_modules', 'npm-debug.log*', '.next', 'dist', 'build']);

  return { dockerfile: `${dockerfile}\n`, dockerignore };
}
