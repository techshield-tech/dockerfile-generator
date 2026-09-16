// Helpers shared by every Node.js-based stack (node, nextjs, vite-react).

import type { NodePackageManager } from '../types';

/** Base image repository + how to read `baseVersion` for the chosen package manager. */
export function nodeBaseImage(packageManager: NodePackageManager, baseVersion: string): string {
  if (packageManager === 'bun') {
    // No official `node` image ships Bun, so the Bun package manager choice
    // runs on the official Bun image instead. `baseVersion` is read as the
    // Bun version in this case.
    return `oven/bun:${baseVersion}-alpine`;
  }
  return `node:${baseVersion}-alpine`;
}

/** Lockfile (and manifest) paths to copy in before installing, for good layer caching. */
export function nodeManifestFiles(packageManager: NodePackageManager): string[] {
  switch (packageManager) {
    case 'npm':
      return ['package.json', 'package-lock.json*'];
    case 'pnpm':
      return ['package.json', 'pnpm-lock.yaml*'];
    case 'yarn':
      return ['package.json', 'yarn.lock*'];
    case 'bun':
      return ['package.json', 'bun.lock*', 'bun.lockb*'];
  }
}

/** Cache mount target for the package manager's global/store cache directory. */
export function nodeCacheMountTarget(packageManager: NodePackageManager): string {
  switch (packageManager) {
    case 'npm':
      return '/root/.npm';
    case 'pnpm':
      return '/root/.local/share/pnpm/store';
    case 'yarn':
      return '/usr/local/share/.cache/yarn';
    case 'bun':
      return '/root/.bun/install/cache';
  }
}

export interface NodeInstallOptions {
  packageManager: NodePackageManager;
  cacheMounts: boolean;
  /** Install only production dependencies (skip devDependencies). */
  prodOnly: boolean;
}

export function nodeInstallCommand({
  packageManager,
  cacheMounts,
  prodOnly,
}: NodeInstallOptions): string {
  const mount = cacheMounts
    ? `--mount=type=cache,target=${nodeCacheMountTarget(packageManager)} `
    : '';

  switch (packageManager) {
    case 'npm':
      return `RUN ${mount}npm ci${prodOnly ? ' --omit=dev' : ''}`;
    case 'pnpm':
      return `RUN corepack enable && ${mount}pnpm install --frozen-lockfile${
        prodOnly ? ' --prod' : ''
      }`;
    case 'yarn':
      return `RUN corepack enable && ${mount}yarn install --frozen-lockfile${
        prodOnly ? ' --production' : ''
      }`;
    case 'bun':
      return `RUN ${mount}bun install --frozen-lockfile${prodOnly ? ' --production' : ''}`;
  }
}

/** `<pm> run <script>` / `<pm> <script>` in the idiom each package manager prefers. */
export function nodeRunScript(packageManager: NodePackageManager, script: string): string {
  switch (packageManager) {
    case 'npm':
      return `npm run ${script}`;
    case 'pnpm':
      return `pnpm run ${script}`;
    case 'yarn':
      return `yarn ${script}`;
    case 'bun':
      return `bun run ${script}`;
  }
}

export function nodeExecCommand(packageManager: NodePackageManager, script: string): string {
  switch (packageManager) {
    case 'npm':
      return `["npm", "run", "${script}"]`;
    case 'pnpm':
      return `["pnpm", "run", "${script}"]`;
    case 'yarn':
      return `["yarn", "${script}"]`;
    case 'bun':
      return `["bun", "run", "${script}"]`;
  }
}
