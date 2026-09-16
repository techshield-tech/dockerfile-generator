// Pure formatting helpers shared by every stack template. No template here
// knows about any other stack — they only share these small building blocks.

import type { BuildArgEntry, EnvVarEntry, HealthcheckOptions, LabelEntry } from '../types';

/** `# syntax=` pragma required for BuildKit `RUN --mount=type=cache,...`. */
export const CACHE_MOUNT_SYNTAX_PRAGMA = '# syntax=docker/dockerfile:1';

function quoteIfNeeded(value: string): string {
  if (value === '' || /\s/.test(value) || /["$]/.test(value)) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return value;
}

export function formatArgs(args: BuildArgEntry[]): string {
  return args
    .filter((arg) => arg.name.trim() !== '')
    .map((arg) =>
      arg.defaultValue.trim() === ''
        ? `ARG ${arg.name}`
        : `ARG ${arg.name}=${quoteIfNeeded(arg.defaultValue)}`,
    )
    .join('\n');
}

export function formatEnv(envVars: EnvVarEntry[]): string {
  return envVars
    .filter((entry) => entry.key.trim() !== '')
    .map((entry) => `ENV ${entry.key}=${quoteIfNeeded(entry.value)}`)
    .join('\n');
}

export function formatLabels(labels: LabelEntry[]): string {
  return labels
    .filter((entry) => entry.key.trim() !== '')
    .map((entry) => `LABEL ${entry.key}=${quoteIfNeeded(entry.value)}`)
    .join('\n');
}

export function formatExpose(ports: number[]): string {
  const validPorts = ports.filter((port) => Number.isFinite(port) && port > 0);
  if (validPorts.length === 0) return '';
  return `EXPOSE ${validPorts.join(' ')}`;
}

export function formatHealthcheck(healthcheck: HealthcheckOptions): string {
  if (!healthcheck.enabled) return '';
  const retries = Number.isFinite(healthcheck.retries) ? Math.max(1, healthcheck.retries) : 3;
  return `HEALTHCHECK --interval=${healthcheck.interval} --timeout=${healthcheck.timeout} --retries=${retries} \\
  CMD ${healthcheck.command}`;
}

/** Splits a space-separated command override into an exec-form JSON array. */
export function toExecForm(command: string): string {
  const parts = command.trim().split(/\s+/).filter(Boolean);
  return `[${parts.map((part) => JSON.stringify(part)).join(', ')}]`;
}

/**
 * Renders the final ENTRYPOINT/CMD lines, honoring user overrides.
 * `defaultCmd` is a pre-formatted exec-form array, e.g. `'["node", "index.js"]'`.
 */
export function commandBlock(entrypointOverride: string, cmdOverride: string, defaultCmd: string): string {
  const lines: string[] = [];
  const hasEntrypointOverride = entrypointOverride.trim() !== '';
  const hasCmdOverride = cmdOverride.trim() !== '';

  if (hasEntrypointOverride) {
    lines.push(`ENTRYPOINT ${toExecForm(entrypointOverride)}`);
  }
  if (hasCmdOverride) {
    lines.push(`CMD ${toExecForm(cmdOverride)}`);
  } else if (!hasEntrypointOverride) {
    lines.push(`CMD ${defaultCmd}`);
  }
  return lines.join('\n');
}

/** Creates a fixed-uid, non-root user on an Alpine (`apk`) based image. */
export function alpineNonRootUser(username: string, uid: number): string {
  return `RUN addgroup -g ${uid} ${username} && adduser -D -u ${uid} -G ${username} ${username}`;
}

/** Creates a fixed-uid, non-root user on a Debian/Ubuntu (`apt`) based image. */
export function debianNonRootUser(username: string, uid: number): string {
  return `RUN groupadd -g ${uid} ${username} && useradd -m -u ${uid} -g ${username} ${username}`;
}

/** Joins non-empty blocks with a single blank line between them. */
export function joinBlocks(...blocks: (string | undefined)[]): string {
  return blocks
    .map((block) => block?.trim())
    .filter((block): block is string => Boolean(block))
    .join('\n\n');
}

/** Common `.dockerignore` entries every stack benefits from. */
export const COMMON_DOCKERIGNORE = [
  '.git',
  '.gitignore',
  '.github',
  '**/.DS_Store',
  '*.log',
  '.env',
  '.env.*',
  '!.env.example',
  'Dockerfile',
  '.dockerignore',
  'README.md',
  '.vscode',
  '.idea',
];

export function buildDockerignore(...extra: string[][]): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const entry of [COMMON_DOCKERIGNORE, ...extra]) {
    for (const line of entry) {
      if (!seen.has(line)) {
        seen.add(line);
        lines.push(line);
      }
    }
  }
  return `${lines.join('\n')}\n`;
}
