// .NET — SDK build stage, ASP.NET/runtime final stage.

import type { GeneratedFiles, TemplateOptions } from '../types';
import {
  buildDockerignore,
  CACHE_MOUNT_SYNTAX_PRAGMA,
  commandBlock,
  debianNonRootUser,
  formatArgs,
  formatEnv,
  formatExpose,
  formatHealthcheck,
  formatLabels,
  joinBlocks,
} from './shared';

// The published DLL name depends on the project file name, which this
// client-side tool has no way to know — the placeholder below is called out
// in a comment so it's obvious to edit.
const DEFAULT_CMD = '["dotnet", "app.dll"]';

function restoreCommand(cacheMounts: boolean): string {
  return cacheMounts
    ? 'RUN --mount=type=cache,target=/root/.nuget/packages dotnet restore'
    : 'RUN dotnet restore';
}

function publishCommand(cacheMounts: boolean): string {
  return cacheMounts
    ? 'RUN --mount=type=cache,target=/root/.nuget/packages dotnet publish -c Release -o /app/publish --no-restore'
    : 'RUN dotnet publish -c Release -o /app/publish --no-restore';
}

export function generateDotnet(options: TemplateOptions): GeneratedFiles {
  const sdkImage = `mcr.microsoft.com/dotnet/sdk:${options.baseVersion}`;
  const runtimeImage = `mcr.microsoft.com/dotnet/aspnet:${options.baseVersion}`;
  const nonRootSetup = options.nonRoot ? debianNonRootUser(options.nonRootUser, options.nonRootUid) : '';
  const dllComment = '# Replace app.dll below with your project\'s actual published DLL name.';

  const stages = options.multiStage
    ? [
        joinBlocks(
          `FROM ${sdkImage} AS builder`,
          'WORKDIR /src',
          'COPY *.csproj ./',
          restoreCommand(options.cacheMounts),
          'COPY . .',
          publishCommand(options.cacheMounts),
        ),
        joinBlocks(
          `FROM ${runtimeImage} AS runner`,
          formatArgs(options.buildArgs),
          nonRootSetup,
          `WORKDIR ${options.workdir}`,
          'COPY --from=builder /app/publish .',
          options.nonRoot ? `RUN chown -R ${options.nonRootUser}:${options.nonRootUser} ${options.workdir}` : '',
          options.nonRoot ? `USER ${options.nonRootUser}` : '',
          formatEnv(options.envVars),
          formatExpose(options.ports),
          formatHealthcheck(options.healthcheck),
          formatLabels(options.labels),
          dllComment,
          commandBlock(options.entrypointOverride, options.cmdOverride, DEFAULT_CMD),
        ),
      ]
    : [
        joinBlocks(
          `FROM ${sdkImage}`,
          formatArgs(options.buildArgs),
          `WORKDIR ${options.workdir}`,
          'COPY *.csproj ./',
          restoreCommand(options.cacheMounts),
          'COPY . .',
          'RUN dotnet publish -c Release -o /app/publish --no-restore',
          nonRootSetup,
          options.nonRoot ? `RUN chown -R ${options.nonRootUser}:${options.nonRootUser} /app/publish` : '',
          options.nonRoot ? `USER ${options.nonRootUser}` : '',
          `WORKDIR /app/publish`,
          formatEnv(options.envVars),
          formatExpose(options.ports),
          formatHealthcheck(options.healthcheck),
          formatLabels(options.labels),
          dllComment,
          commandBlock(options.entrypointOverride, options.cmdOverride, DEFAULT_CMD),
        ),
      ];

  const dockerfile = joinBlocks(
    options.cacheMounts ? CACHE_MOUNT_SYNTAX_PRAGMA : '',
    stages.join('\n\n'),
  );

  const dockerignore = buildDockerignore(['bin', 'obj', '*.user']);

  return { dockerfile: `${dockerfile}\n`, dockerignore };
}
