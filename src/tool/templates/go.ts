// Go — compiles a static binary and (with multi-stage on) ships it alone in
// a distroless or scratch runtime image, with no shell or package manager.

import type { GeneratedFiles, TemplateOptions } from '../types';
import {
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

const BINARY_PATH = '/out/app';

function buildStage(options: TemplateOptions): string {
  const mounts = options.cacheMounts
    ? '--mount=type=cache,target=/root/.cache/go-build --mount=type=cache,target=/go/pkg/mod '
    : '';
  return joinBlocks(
    `FROM golang:${options.baseVersion}-alpine AS builder`,
    `WORKDIR ${options.workdir}`,
    'COPY go.mod go.sum* ./',
    options.cacheMounts
      ? 'RUN --mount=type=cache,target=/go/pkg/mod go mod download'
      : 'RUN go mod download',
    'COPY . .',
    `RUN ${mounts}CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o ${BINARY_PATH} ./...`,
  );
}

function runtimeImage(options: TemplateOptions): string {
  if (options.goBaseImage === 'scratch') {
    return 'scratch';
  }
  return options.nonRoot
    ? 'gcr.io/distroless/static-debian12:nonroot'
    : 'gcr.io/distroless/static-debian12';
}

export function generateGo(options: TemplateOptions): GeneratedFiles {
  const defaultCmd = `["${options.workdir}/app"]`;

  const dockerfile = options.multiStage
    ? joinBlocks(
        options.cacheMounts ? CACHE_MOUNT_SYNTAX_PRAGMA : '',
        buildStage(options),
        joinBlocks(
          `FROM ${runtimeImage(options)}`,
          formatArgs(options.buildArgs),
          `WORKDIR ${options.workdir}`,
          `COPY --from=builder ${BINARY_PATH} ${options.workdir}/app`,
          // scratch has no /etc/passwd, so a non-root numeric UID is the
          // only option there; the distroless `nonroot` tag already runs
          // as a fixed non-root UID without needing a USER line.
          options.nonRoot && options.goBaseImage === 'scratch' ? `USER ${options.nonRootUid}:${options.nonRootUid}` : '',
          formatEnv(options.envVars),
          formatExpose(options.ports),
          formatHealthcheck(options.healthcheck),
          formatLabels(options.labels),
          commandBlock(options.entrypointOverride, options.cmdOverride, defaultCmd),
        ),
      )
    : joinBlocks(
        `FROM golang:${options.baseVersion}-alpine`,
        formatArgs(options.buildArgs),
        `WORKDIR ${options.workdir}`,
        'COPY go.mod go.sum* ./',
        'RUN go mod download',
        'COPY . .',
        'RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /usr/local/bin/app ./...',
        formatEnv(options.envVars),
        formatExpose(options.ports),
        formatHealthcheck(options.healthcheck),
        formatLabels(options.labels),
        commandBlock(options.entrypointOverride, options.cmdOverride, '["/usr/local/bin/app"]'),
      );

  const dockerignore = buildDockerignore(['bin', '*.test', '*.out', 'vendor']);

  return { dockerfile: `${dockerfile}\n`, dockerignore };
}
