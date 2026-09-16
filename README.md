# Dockerfile Generator

Generate a production-grade `Dockerfile` and `.dockerignore` for popular
stacks from a form — fast, free, and 100% client-side. Nothing you enter is
ever sent over the network; everything runs in your browser.

**Live:** https://techshield-tech.github.io/dockerfile-generator/

Part of [MMOALL Developer Tools](https://mmoall.com/tools).

## Features

- Nine stack templates, each a pure generator function: Node.js, Next.js
  (standalone output), Vite/React (static build served by nginx), Python,
  Go, Java (Spring Boot), .NET, PHP-FPM, and a plain static site via nginx.
- Per-stack package manager choices where relevant: npm / pnpm / yarn / bun
  for Node-based stacks, pip / poetry / uv for Python, Maven / Gradle for
  Spring Boot.
- Shared options that apply across stacks:
  - Base image version.
  - Multi-stage build on/off.
  - Run as non-root user on/off, with a configurable username/UID.
  - Working directory.
  - Exposed port(s).
  - `ENV` key/value pairs baked into the image.
  - `ARG` build arguments, with optional defaults.
  - `HEALTHCHECK`, with command/interval/timeout/retries.
  - BuildKit `RUN --mount=type=cache,...` cache mounts for the stack's
    package manager (npm/pnpm/yarn/bun cache, pip/poetry/uv cache, Go build
    cache, Maven/Gradle cache, NuGet cache, Composer cache) — the required
    `# syntax=docker/dockerfile:1` pragma is added automatically.
  - `ENTRYPOINT` / `CMD` override, otherwise each template picks a sensible
    default.
  - OCI image `LABEL`s.
- Output shown as two tabs, Dockerfile and .dockerignore, each with copy and
  download buttons (downloads as `Dockerfile` / `.dockerignore`).
- A best-practice checklist under the output shows which practices are
  active for the current configuration (pinned base image tag, multi-stage
  build, non-root user, minimized layers, `.dockerignore` present, cache
  mounts, healthcheck, exposed ports).
- Responsive down to 360px viewport width: form above, output below on
  narrow screens.

## Embedding

This tool can be embedded in an iframe, e.g. on mmoall.com. In embed mode it
renders only the tool itself (no header/footer) on a transparent background.

```html
<iframe
  id="dockerfile-generator"
  src="https://techshield-tech.github.io/dockerfile-generator/?embed=1&theme=dark"
  style="width: 100%; border: 0;"
  title="Dockerfile Generator"
></iframe>

<script>
  const iframe = document.getElementById('dockerfile-generator');

  // Resize the iframe to fit its content.
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (data && data.type === 'mmoall-tool:height' && data.slug === 'dockerfile-generator') {
      iframe.style.height = `${data.height}px`;
    }
    if (data && data.type === 'mmoall-tool:ready' && data.slug === 'dockerfile-generator') {
      // The tool has mounted and is ready.
    }
  });

  // Push a theme change into the iframe (only accepted from an allowed origin).
  iframe.contentWindow.postMessage({ type: 'mmoall-tool:theme', theme: 'dark' }, '*');
</script>
```

### Contract

- `?embed=1` in the URL renders only the tool (no chrome), transparent
  background.
- `?theme=light` / `?theme=dark` sets the initial theme; otherwise it follows
  `prefers-color-scheme`.
- The page listens for `window.postMessage({type:'mmoall-tool:theme', theme})`
  from the parent frame to change theme at runtime. Only messages whose
  `event.origin` is `https://mmoall.com`, `https://www.mmoall.com`, or
  `http://localhost:3000` are accepted.
- On mount (embed mode only), the page posts
  `{type:'mmoall-tool:ready', slug:'dockerfile-generator'}` to `window.parent`.
- Whenever its rendered height changes (embed mode only), the page posts
  `{type:'mmoall-tool:height', slug:'dockerfile-generator', height}` to
  `window.parent`.

## Local development

```bash
bun install
bun dev
```

Build for production:

```bash
bun run build
```

Deployment to GitHub Pages happens automatically via
`.github/workflows/deploy.yml` on every push to `main`.

## License

MIT — see [LICENSE](./LICENSE).
