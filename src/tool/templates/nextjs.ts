// Next.js, built with `output: 'standalone'` in next.config.(js|ts) so the
// runtime image only needs the traced server bundle, not the full
// node_modules tree or the Next.js CLI.

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
import { nodeBaseImage, nodeInstallCommand, nodeManifestFiles, nodeRunScript } from './nodeShared';

export function generateNextjs(options: TemplateOptions): GeneratedFiles {
  const pm = options.nodePackageManager;
  const image = nodeBaseImage(pm, options.baseVersion);
  const manifestFiles = nodeManifestFiles(pm).join(' ');
  const installAll = nodeInstallCommand({ packageManager: pm, cacheMounts: options.cacheMounts, prodOnly: false });
  const buildCmd = `RUN ${nodeRunScript(pm, 'build')}`;
  const defaultCmd = '["node", "server.js"]';

  const nonRootSetup = options.nonRoot
    ? alpineNonRootUser(options.nonRootUser, options.nonRootUid)
    : '';

  const runnerCommon = joinBlocks(
    formatArgs(options.buildArgs),
    nonRootSetup,
    `WORKDIR ${options.workdir}`,
    'ENV NODE_ENV=production',
    'ENV HOSTNAME=0.0.0.0',
    options.nonRoot
      ? `COPY --from=builder --chown=${options.nonRootUser}:${options.nonRootUser} ${options.workdir}/public ./public`
      : `COPY --from=builder ${options.workdir}/public ./public`,
    options.nonRoot
      ? `COPY --from=builder --chown=${options.nonRootUser}:${options.nonRootUser} ${options.workdir}/.next/standalone ./`
      : `COPY --from=builder ${options.workdir}/.next/standalone ./`,
    options.nonRoot
      ? `COPY --from=builder --chown=${options.nonRootUser}:${options.nonRootUser} ${options.workdir}/.next/static ./.next/static`
      : `COPY --from=builder ${options.workdir}/.next/static ./.next/static`,
    options.nonRoot ? `USER ${options.nonRootUser}` : '',
    formatEnv(options.envVars),
    formatExpose(options.ports),
    formatHealthcheck(options.healthcheck),
    formatLabels(options.labels),
    commandBlock(options.entrypointOverride, options.cmdOverride, defaultCmd),
  );

  const dockerfile = options.multiStage
    ? joinBlocks(
        options.cacheMounts ? CACHE_MOUNT_SYNTAX_PRAGMA : '',
        joinBlocks(
          `FROM ${image} AS deps`,
          `WORKDIR ${options.workdir}`,
          `COPY ${manifestFiles} ./`,
          installAll,
        ),
        joinBlocks(
          `FROM ${image} AS builder`,
          `WORKDIR ${options.workdir}`,
          `COPY --from=deps ${options.workdir}/node_modules ./node_modules`,
          'COPY . .',
          'ENV NEXT_TELEMETRY_DISABLED=1',
          buildCmd,
        ),
        joinBlocks(`FROM ${image} AS runner`, runnerCommon),
      )
    : joinBlocks(
        options.cacheMounts ? CACHE_MOUNT_SYNTAX_PRAGMA : '',
        joinBlocks(
          `FROM ${image}`,
          formatArgs(options.buildArgs),
          `WORKDIR ${options.workdir}`,
          `COPY ${manifestFiles} ./`,
          installAll,
          'COPY . .',
          'ENV NEXT_TELEMETRY_DISABLED=1',
          'ENV NODE_ENV=production',
          'ENV HOSTNAME=0.0.0.0',
          buildCmd,
          'RUN cp -r public .next/standalone/public && cp -r .next/static .next/standalone/.next/static',
          nonRootSetup,
          options.nonRoot
            ? `RUN chown -R ${options.nonRootUser}:${options.nonRootUser} ${options.workdir}/.next/standalone`
            : '',
          options.nonRoot ? `USER ${options.nonRootUser}` : '',
          `WORKDIR ${options.workdir}/.next/standalone`,
          formatEnv(options.envVars),
          formatExpose(options.ports),
          formatHealthcheck(options.healthcheck),
          formatLabels(options.labels),
          commandBlock(options.entrypointOverride, options.cmdOverride, defaultCmd),
        ),
      );

  const dockerignore = buildDockerignore(['node_modules', '.next', 'out', 'npm-debug.log*']);

  return { dockerfile: `${dockerfile}\n`, dockerignore };
}
