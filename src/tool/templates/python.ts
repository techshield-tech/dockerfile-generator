// Python service — pip / poetry / uv, optionally served by gunicorn or
// uvicorn. Every package manager installs into a virtual environment so the
// multi-stage runtime image is a clean `COPY --from=builder` regardless of
// which final user ends up owning it.

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

const VENV_PATH = '/opt/venv';

function installBlock(options: TemplateOptions, venvPath: string): string {
  const cache = options.cacheMounts;

  switch (options.pythonPackageManager) {
    case 'pip':
      return joinBlocks(
        `RUN python -m venv ${venvPath}`,
        `ENV PATH="${venvPath}/bin:$PATH"`,
        'COPY requirements.txt ./',
        cache
          ? 'RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt'
          : 'RUN pip install --no-cache-dir -r requirements.txt',
      );
    case 'poetry':
      return joinBlocks(
        'ENV POETRY_NO_INTERACTION=1 POETRY_VIRTUALENVS_IN_PROJECT=true',
        cache
          ? 'RUN --mount=type=cache,target=/root/.cache/pip pip install poetry'
          : 'RUN pip install --no-cache-dir poetry',
        'COPY pyproject.toml poetry.lock* ./',
        cache
          ? 'RUN --mount=type=cache,target=/root/.cache/pypoetry poetry install --no-root --only main'
          : 'RUN poetry install --no-root --only main',
      );
    case 'uv':
      return joinBlocks(
        'COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/',
        'ENV UV_PROJECT_ENVIRONMENT=.venv UV_COMPILE_BYTECODE=1',
        'COPY pyproject.toml uv.lock* ./',
        cache
          ? 'RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-dev'
          : 'RUN uv sync --frozen --no-dev',
      );
  }
}

function venvPathFor(options: TemplateOptions): string {
  return options.pythonPackageManager === 'pip' ? VENV_PATH : `${options.workdir}/.venv`;
}

function defaultCmd(options: TemplateOptions): string {
  const port = options.ports[0] ?? 8000;
  const entry = options.pythonAppModule.trim() || 'main.py';

  switch (options.pythonServer) {
    case 'gunicorn':
      return `["gunicorn", "--bind", "0.0.0.0:${port}", "${entry}"]`;
    case 'uvicorn':
      return `["uvicorn", "${entry}", "--host", "0.0.0.0", "--port", "${port}"]`;
    case 'none':
    default:
      return `["python", "${entry}"]`;
  }
}

export function generatePython(options: TemplateOptions): GeneratedFiles {
  const image = `python:${options.baseVersion}-slim`;
  const venvPath = venvPathFor(options);
  const nonRootSetup = options.nonRoot ? debianNonRootUser(options.nonRootUser, options.nonRootUid) : '';

  const stages = options.multiStage
    ? [
        joinBlocks(
          `FROM ${image} AS builder`,
          `WORKDIR ${options.workdir}`,
          installBlock(options, venvPath),
        ),
        joinBlocks(
          `FROM ${image} AS runner`,
          formatArgs(options.buildArgs),
          nonRootSetup,
          `WORKDIR ${options.workdir}`,
          `COPY --from=builder ${venvPath} ${venvPath}`,
          `ENV PATH="${venvPath}/bin:$PATH"`,
          'COPY . .',
          options.nonRoot ? `RUN chown -R ${options.nonRootUser}:${options.nonRootUser} ${options.workdir}` : '',
          options.nonRoot ? `USER ${options.nonRootUser}` : '',
          formatEnv(options.envVars),
          formatExpose(options.ports),
          formatHealthcheck(options.healthcheck),
          formatLabels(options.labels),
          commandBlock(options.entrypointOverride, options.cmdOverride, defaultCmd(options)),
        ),
      ]
    : [
        joinBlocks(
          `FROM ${image}`,
          formatArgs(options.buildArgs),
          `WORKDIR ${options.workdir}`,
          installBlock(options, venvPath),
          `ENV PATH="${venvPath}/bin:$PATH"`,
          'COPY . .',
          nonRootSetup,
          options.nonRoot ? `RUN chown -R ${options.nonRootUser}:${options.nonRootUser} ${options.workdir}` : '',
          options.nonRoot ? `USER ${options.nonRootUser}` : '',
          formatEnv(options.envVars),
          formatExpose(options.ports),
          formatHealthcheck(options.healthcheck),
          formatLabels(options.labels),
          commandBlock(options.entrypointOverride, options.cmdOverride, defaultCmd(options)),
        ),
      ];

  const dockerfile = joinBlocks(
    options.cacheMounts ? CACHE_MOUNT_SYNTAX_PRAGMA : '',
    stages.join('\n\n'),
  );

  const dockerignore = buildDockerignore([
    '__pycache__',
    '*.pyc',
    '.venv',
    'venv',
    '.pytest_cache',
    '.mypy_cache',
    '*.egg-info',
  ]);

  return { dockerfile: `${dockerfile}\n`, dockerignore };
}
