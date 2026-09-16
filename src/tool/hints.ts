// Pure computation of which best-practice hints apply to the current
// options, for the "what's active" checklist under the output.

import type { TemplateOptions } from './types';

export interface Hint {
  label: string;
  active: boolean;
}

export function buildHints(options: TemplateOptions, dockerfile: string): Hint[] {
  const version = options.baseVersion.trim().toLowerCase();
  const isPinned = version !== '' && version !== 'latest';
  const usesCacheMounts = options.cacheMounts && dockerfile.includes('--mount=type=cache');
  const stageCount = (dockerfile.match(/^FROM /gm) ?? []).length;
  const isMultiStage = stageCount > 1;

  return [
    {
      label: 'Base image uses a pinned version tag instead of `latest`',
      active: isPinned,
    },
    {
      label: 'Multi-stage build keeps build-only tools out of the final image',
      active: isMultiStage,
    },
    {
      label: 'Runs as a non-root user',
      active: options.nonRoot,
    },
    {
      label: 'Related install steps are combined to minimize image layers',
      active: true,
    },
    {
      label: '.dockerignore keeps local/VCS files out of the build context',
      active: true,
    },
    {
      label: 'BuildKit cache mounts speed up rebuilds without bloating image layers',
      active: usesCacheMounts,
    },
    {
      label: 'HEALTHCHECK lets Docker/orchestrators detect and restart unhealthy containers',
      active: options.healthcheck.enabled,
    },
    {
      label: 'Only the ports the app actually needs are exposed',
      active: options.ports.length > 0,
    },
  ];
}
