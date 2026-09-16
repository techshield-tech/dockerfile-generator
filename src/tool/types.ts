// Shared types for every stack template. Pure data — no React, no DOM.

export type TemplateId =
  | 'node'
  | 'nextjs'
  | 'vite-react'
  | 'python'
  | 'go'
  | 'spring-boot'
  | 'dotnet'
  | 'php-fpm'
  | 'static-nginx';

export type NodePackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';
export type PythonPackageManager = 'pip' | 'poetry' | 'uv';
export type PythonServer = 'none' | 'gunicorn' | 'uvicorn';
export type JavaBuildTool = 'maven' | 'gradle';
export type GoBaseImage = 'distroless' | 'scratch';

export interface EnvVarEntry {
  key: string;
  value: string;
}

export interface BuildArgEntry {
  name: string;
  defaultValue: string;
}

export interface LabelEntry {
  key: string;
  value: string;
}

export interface HealthcheckOptions {
  enabled: boolean;
  command: string;
  interval: string;
  timeout: string;
  retries: number;
}

/**
 * The full options bag backing the form. Every field is always present so
 * form state is stable across template switches; each template's generator
 * only reads the subset that applies to it (the form only *shows* the
 * subset relevant to the selected template).
 */
export interface TemplateOptions {
  templateId: TemplateId;

  /** Base image version tag: Node/Python/Go version, JRE version, nginx version, etc. */
  baseVersion: string;

  multiStage: boolean;

  nonRoot: boolean;
  nonRootUser: string;
  nonRootUid: number;

  workdir: string;

  /** Container ports to EXPOSE. */
  ports: number[];

  envVars: EnvVarEntry[];
  buildArgs: BuildArgEntry[];
  labels: LabelEntry[];

  healthcheck: HealthcheckOptions;

  /** Use BuildKit `RUN --mount=type=cache,...` for the package manager's cache dir. */
  cacheMounts: boolean;

  /** Optional override, space-separated command. Empty = template default. */
  entrypointOverride: string;
  /** Optional override, space-separated command. Empty = template default. */
  cmdOverride: string;

  // --- Stack-specific fields (only relevant for some templates) ---
  nodePackageManager: NodePackageManager;

  pythonPackageManager: PythonPackageManager;
  pythonServer: PythonServer;
  pythonAppModule: string;

  goBaseImage: GoBaseImage;

  javaBuildTool: JavaBuildTool;
}

export interface GeneratedFiles {
  dockerfile: string;
  dockerignore: string;
}

export type TemplateGenerator = (options: TemplateOptions) => GeneratedFiles;

export interface TemplateMeta {
  id: TemplateId;
  label: string;
  /** Sensible default for `baseVersion` when this template is selected. */
  defaultBaseVersion: string;
  /** Which optional field groups this template's form section shows. */
  showsNodePackageManager: boolean;
  showsPython: boolean;
  showsGoBaseImage: boolean;
  showsJavaBuildTool: boolean;
}
