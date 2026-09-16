import { useCallback, useMemo, useState } from 'react';
import { Button, CopyButton, Panel, Select, TextArea, Toolbar } from '../shell/ui';
import { CheckboxField, Field, ListEditor, TextField } from './FormControls';
import { defaultOptionsFor } from './defaults';
import { downloadTextFile } from './download';
import { buildHints } from './hints';
import { appModuleLabel, baseVersionLabel } from './labels';
import { formatPorts, parsePorts } from './ports';
import { TEMPLATE_GENERATORS, TEMPLATE_META, templateMetaFor } from './templates';
import type { BuildArgEntry, EnvVarEntry, LabelEntry, TemplateId, TemplateOptions } from './types';

type OutputTab = 'dockerfile' | 'dockerignore';

const TEMPLATE_OPTIONS = TEMPLATE_META.map((meta) => ({ value: meta.id, label: meta.label }));

const NODE_PM_OPTIONS = [
  { value: 'npm', label: 'npm' },
  { value: 'pnpm', label: 'pnpm' },
  { value: 'yarn', label: 'yarn' },
  { value: 'bun', label: 'bun' },
];

const PYTHON_PM_OPTIONS = [
  { value: 'pip', label: 'pip' },
  { value: 'poetry', label: 'poetry' },
  { value: 'uv', label: 'uv' },
];

const PYTHON_SERVER_OPTIONS = [
  { value: 'none', label: 'None (run script directly)' },
  { value: 'gunicorn', label: 'gunicorn' },
  { value: 'uvicorn', label: 'uvicorn' },
];

const GO_BASE_OPTIONS = [
  { value: 'distroless', label: 'Distroless (gcr.io/distroless/static)' },
  { value: 'scratch', label: 'scratch (empty base image)' },
];

const JAVA_BUILD_TOOL_OPTIONS = [
  { value: 'maven', label: 'Maven (mvnw)' },
  { value: 'gradle', label: 'Gradle (gradlew)' },
];

function emptyEnvVar(): EnvVarEntry {
  return { key: '', value: '' };
}

function emptyBuildArg(): BuildArgEntry {
  return { name: '', defaultValue: '' };
}

function emptyLabel(): LabelEntry {
  return { key: '', value: '' };
}

export function Tool() {
  const [options, setOptions] = useState<TemplateOptions>(() => defaultOptionsFor('node'));
  const [portsText, setPortsText] = useState<string>(() => formatPorts(defaultOptionsFor('node').ports));
  const [activeTab, setActiveTab] = useState<OutputTab>('dockerfile');

  const meta = templateMetaFor(options.templateId);

  const updateOptions = useCallback((patch: Partial<TemplateOptions>) => {
    setOptions((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleTemplateChange = useCallback((templateId: TemplateId) => {
    const next = defaultOptionsFor(templateId);
    setOptions(next);
    setPortsText(formatPorts(next.ports));
  }, []);

  const handlePortsChange = useCallback((value: string) => {
    setPortsText(value);
  }, []);

  const effectiveOptions = useMemo<TemplateOptions>(
    () => ({ ...options, ports: parsePorts(portsText) }),
    [options, portsText],
  );

  const generated = useMemo(
    () => TEMPLATE_GENERATORS[effectiveOptions.templateId](effectiveOptions),
    [effectiveOptions],
  );

  const hints = useMemo(
    () => buildHints(effectiveOptions, generated.dockerfile),
    [effectiveOptions, generated.dockerfile],
  );

  const activeContent = activeTab === 'dockerfile' ? generated.dockerfile : generated.dockerignore;
  const activeFilename = activeTab === 'dockerfile' ? 'Dockerfile' : '.dockerignore';

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
      {/* Form */}
      <div className="flex flex-col gap-4">
        <Panel title="Stack">
          <div className="flex flex-col gap-3">
            <Field label="Template">
              <Select
                aria-label="Stack template"
                value={options.templateId}
                onChange={(event) => handleTemplateChange(event.target.value as TemplateId)}
                options={TEMPLATE_OPTIONS}
              />
            </Field>

            <TextField
              label={baseVersionLabel(options.templateId, options)}
              value={options.baseVersion}
              onChange={(value) => updateOptions({ baseVersion: value })}
              placeholder="e.g. 22"
            />

            {meta.showsNodePackageManager && (
              <Field label="Package manager">
                <Select
                  aria-label="Node package manager"
                  value={options.nodePackageManager}
                  onChange={(event) =>
                    updateOptions({ nodePackageManager: event.target.value as TemplateOptions['nodePackageManager'] })
                  }
                  options={NODE_PM_OPTIONS}
                />
              </Field>
            )}

            {meta.showsPython && (
              <>
                <Field label="Package manager">
                  <Select
                    aria-label="Python package manager"
                    value={options.pythonPackageManager}
                    onChange={(event) =>
                      updateOptions({
                        pythonPackageManager: event.target.value as TemplateOptions['pythonPackageManager'],
                      })
                    }
                    options={PYTHON_PM_OPTIONS}
                  />
                </Field>
                <Field label="Application server">
                  <Select
                    aria-label="Python application server"
                    value={options.pythonServer}
                    onChange={(event) =>
                      updateOptions({ pythonServer: event.target.value as TemplateOptions['pythonServer'] })
                    }
                    options={PYTHON_SERVER_OPTIONS}
                  />
                </Field>
                <TextField
                  label={appModuleLabel(options.pythonServer)}
                  value={options.pythonAppModule}
                  onChange={(value) => updateOptions({ pythonAppModule: value })}
                  placeholder={options.pythonServer === 'none' ? 'main.py' : 'main:app'}
                />
              </>
            )}

            {meta.showsGoBaseImage && (
              <Field label="Runtime base image">
                <Select
                  aria-label="Go runtime base image"
                  value={options.goBaseImage}
                  onChange={(event) =>
                    updateOptions({ goBaseImage: event.target.value as TemplateOptions['goBaseImage'] })
                  }
                  options={GO_BASE_OPTIONS}
                />
              </Field>
            )}

            {meta.showsJavaBuildTool && (
              <Field label="Build tool">
                <Select
                  aria-label="Java build tool"
                  value={options.javaBuildTool}
                  onChange={(event) =>
                    updateOptions({ javaBuildTool: event.target.value as TemplateOptions['javaBuildTool'] })
                  }
                  options={JAVA_BUILD_TOOL_OPTIONS}
                />
              </Field>
            )}
          </div>
        </Panel>

        <Panel title="Build">
          <div className="flex flex-col gap-3">
            <CheckboxField
              label="Multi-stage build"
              checked={options.multiStage}
              onChange={(checked) => updateOptions({ multiStage: checked })}
              hint="Keeps build-only tools and intermediate files out of the final image."
            />
            <CheckboxField
              label="BuildKit cache mounts"
              checked={options.cacheMounts}
              onChange={(checked) => updateOptions({ cacheMounts: checked })}
              hint="Caches the package manager's download/build cache across builds via RUN --mount=type=cache."
            />
          </div>
        </Panel>

        <Panel title="Runtime">
          <div className="flex flex-col gap-3">
            <TextField
              label="Working directory"
              value={options.workdir}
              onChange={(value) => updateOptions({ workdir: value })}
              placeholder="/app"
            />
            <TextField
              label="Exposed port(s)"
              value={portsText}
              onChange={handlePortsChange}
              placeholder="e.g. 3000, 3001"
              hint="Comma-separated."
            />
            <CheckboxField
              label="Run as non-root user"
              checked={options.nonRoot}
              onChange={(checked) => updateOptions({ nonRoot: checked })}
            />
            {options.nonRoot && (
              <div className="flex flex-wrap gap-3">
                <div className="min-w-0 flex-1 basis-32">
                  <TextField
                    label="Username"
                    value={options.nonRootUser}
                    onChange={(value) => updateOptions({ nonRootUser: value })}
                  />
                </div>
                <div className="min-w-0 flex-1 basis-24">
                  <TextField
                    label="UID"
                    type="number"
                    value={String(options.nonRootUid)}
                    onChange={(value) => updateOptions({ nonRootUid: Number.parseInt(value, 10) || 1000 })}
                  />
                </div>
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Environment variables (ENV)">
          <ListEditor
            items={options.envVars}
            columns={[
              {
                placeholder: 'KEY',
                getValue: (item) => item.key,
                setValue: (item, value) => ({ ...item, key: value }),
              },
              {
                placeholder: 'value',
                getValue: (item) => item.value,
                setValue: (item, value) => ({ ...item, value }),
              },
            ]}
            onChange={(envVars) => updateOptions({ envVars })}
            makeEmpty={emptyEnvVar}
            addLabel="Add env var"
            emptyLabel="No env vars baked into the image."
          />
        </Panel>

        <Panel title="Build arguments (ARG)">
          <ListEditor
            items={options.buildArgs}
            columns={[
              {
                placeholder: 'NAME',
                getValue: (item) => item.name,
                setValue: (item, value) => ({ ...item, name: value }),
              },
              {
                placeholder: 'default value (optional)',
                getValue: (item) => item.defaultValue,
                setValue: (item, value) => ({ ...item, defaultValue: value }),
              },
            ]}
            onChange={(buildArgs) => updateOptions({ buildArgs })}
            makeEmpty={emptyBuildArg}
            addLabel="Add build arg"
            emptyLabel="No build arguments declared."
          />
        </Panel>

        <Panel title="OCI labels (LABEL)">
          <ListEditor
            items={options.labels}
            columns={[
              {
                placeholder: 'org.opencontainers.image.source',
                getValue: (item) => item.key,
                setValue: (item, value) => ({ ...item, key: value }),
              },
              {
                placeholder: 'value',
                getValue: (item) => item.value,
                setValue: (item, value) => ({ ...item, value }),
              },
            ]}
            onChange={(labels) => updateOptions({ labels })}
            makeEmpty={emptyLabel}
            addLabel="Add label"
            emptyLabel="No labels."
          />
        </Panel>

        <Panel title="Healthcheck">
          <div className="flex flex-col gap-3">
            <CheckboxField
              label="Add a HEALTHCHECK"
              checked={options.healthcheck.enabled}
              onChange={(checked) => updateOptions({ healthcheck: { ...options.healthcheck, enabled: checked } })}
            />
            {options.healthcheck.enabled && (
              <>
                <TextField
                  label="Command"
                  value={options.healthcheck.command}
                  onChange={(value) => updateOptions({ healthcheck: { ...options.healthcheck, command: value } })}
                  placeholder="curl -f http://localhost:3000/ || exit 1"
                />
                <div className="flex flex-wrap gap-3">
                  <div className="min-w-0 flex-1 basis-24">
                    <TextField
                      label="Interval"
                      value={options.healthcheck.interval}
                      onChange={(value) => updateOptions({ healthcheck: { ...options.healthcheck, interval: value } })}
                      placeholder="30s"
                    />
                  </div>
                  <div className="min-w-0 flex-1 basis-24">
                    <TextField
                      label="Timeout"
                      value={options.healthcheck.timeout}
                      onChange={(value) => updateOptions({ healthcheck: { ...options.healthcheck, timeout: value } })}
                      placeholder="3s"
                    />
                  </div>
                  <div className="min-w-0 flex-1 basis-24">
                    <TextField
                      label="Retries"
                      type="number"
                      value={String(options.healthcheck.retries)}
                      onChange={(value) =>
                        updateOptions({
                          healthcheck: { ...options.healthcheck, retries: Number.parseInt(value, 10) || 1 },
                        })
                      }
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </Panel>

        <Panel title="Entrypoint / CMD override">
          <div className="flex flex-col gap-3">
            <TextField
              label="ENTRYPOINT (optional)"
              value={options.entrypointOverride}
              onChange={(value) => updateOptions({ entrypointOverride: value })}
              placeholder="Leave empty for the template default"
              hint="Space-separated command."
            />
            <TextField
              label="CMD (optional)"
              value={options.cmdOverride}
              onChange={(value) => updateOptions({ cmdOverride: value })}
              placeholder="Leave empty for the template default"
              hint="Space-separated command."
            />
          </div>
        </Panel>
      </div>

      {/* Output */}
      <div className="flex flex-col gap-4">
        <Panel
          title="Output"
          actions={
            <>
              <CopyButton getText={() => activeContent} />
              <Button variant="secondary" onClick={() => downloadTextFile(activeFilename, activeContent)}>
                Download
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-3">
            <Toolbar>
              <Button
                variant={activeTab === 'dockerfile' ? 'primary' : 'secondary'}
                onClick={() => setActiveTab('dockerfile')}
              >
                Dockerfile
              </Button>
              <Button
                variant={activeTab === 'dockerignore' ? 'primary' : 'secondary'}
                onClick={() => setActiveTab('dockerignore')}
              >
                .dockerignore
              </Button>
            </Toolbar>
            <TextArea
              aria-label={`${activeFilename} output`}
              value={activeContent}
              readOnly
              className="min-h-[420px]"
            />
          </div>
        </Panel>

        <Panel title="Best-practice hints">
          <ul className="flex flex-col gap-1.5 text-sm">
            {hints.map((hint) => (
              <li
                key={hint.label}
                className={`flex items-start gap-2 ${
                  hint.active ? 'text-[var(--color-fg)]' : 'text-[var(--color-muted)]'
                }`}
              >
                <span aria-hidden="true">{hint.active ? '✓' : '○'}</span>
                <span>{hint.label}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
