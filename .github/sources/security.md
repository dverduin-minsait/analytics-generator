# Source: Security

> Trusted reference for all security requirements in this repository.
> Security properties are non-negotiable. No agent may relax them without explicit user approval and a documented threat model entry.

---

## Process Isolation Model

Electron runs two types of processes. Their security properties are fixed:

| Property | Main process | Renderer process |
|---|---|---|
| `nodeIntegration` | N/A | `false` |
| `contextIsolation` | N/A | `true` |
| `sandbox` | N/A | `true` |
| Node.js access | Full | None |
| Filesystem access | Full | Via IPC only |
| Network access | Full | Via IPC or `https:` fetch |

These settings are configured in `main.ts` and must never be weakened.

---

## Trust Model

### What the renderer can trust

- The typed `window.electronAPI` surface: all methods are typed, allowlisted, and return structured responses
- Angular's own sanitization for interpolated values

### What the renderer cannot trust and must not use

- `window.require` — not available (nodeIntegration: false)
- `window.process` — not available in sandboxed renderer
- `__dirname`, `__filename` — not available
- Any direct filesystem path — paths are resolved and validated in the main process

### What the main process must not trust from the renderer

- Any string that will be used as a file path — must be validated against an allowed base
- Any string that will be used as a command — no shell execution of renderer-supplied strings
- Any integer used as an index into a sensitive array — must be range-checked

---

## IPC Security

### Channel Allowlist

All valid channel names are defined in `src/shared/ipc-channels.ts` as `as const`. The preload script only calls channels from this list. Any attempt by the renderer to invoke an unlisted channel is ignored by the main process (never registered with `ipcMain.handle`).

### Path Validation

Any file path received from the renderer via IPC must be resolved against an allowed base:

```typescript
function assertWithinBase(userPath: string, base: string): void {
  const resolved = require('path').resolve(userPath);
  const normalizedBase = require('path').resolve(base);
  if (!resolved.startsWith(normalizedBase + require('path').sep) && resolved !== normalizedBase) {
    throw new Error(`Path traversal rejected: ${userPath}`);
  }
}
```

Allowed bases:
- Project files: `~/.analytics-platform/`
- User-selected files: only paths returned from `dialog.showOpenDialog()` are accepted

### No Shell Execution

`child_process.exec()` and `child_process.spawn()` with shell mode are forbidden. If a subprocess is needed, use `spawn()` with an explicit argument array and `shell: false`.

---

## Content Security Policy

### Production (enforced via `session.defaultSession.webRequest.onHeadersReceived`)

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
font-src 'self';
connect-src 'self' https:;
object-src 'none';
base-uri 'none';
```

`'unsafe-inline'` for `style-src` is required because Angular's ViewEncapsulation emulates scoped styles via injected style tags. This is acceptable. `script-src` must never include `'unsafe-inline'` or `'unsafe-eval'`.

### Development (in `index.html` meta tag)

A relaxed CSP is applied only in development mode. It is overridden by the production header in packaged builds.

---

## Credential Storage

LLM API keys and provider settings are stored in `~/.analytics-platform/settings.json`. This file:
- Is written only from `LLMGateway.saveSettings()`
- Is never included in `electron-builder` packaging
- Is never committed to version control (included in `.gitignore`)
- Must not be returned through any IPC channel that exposes credentials to the renderer — return only non-secret metadata (provider type, model name) when the UI needs to display configuration

---

## External URLs

The `window-open` handler in `main.ts` is configured to open all external URLs in the default OS browser via `shell.openExternal()`. The `shell.openExternal()` call is only made for URLs that begin with `https://`. `http://` URLs and custom schemes are blocked.

---

## Dependency Security

- Run `npm audit` before every release
- `devDependencies` are never bundled in packaged builds (enforced by `electron-builder`)
- Native modules, if added, must be pinned to exact versions and their hashes verified
- Electron must be kept up to date — each major version contains security fixes

---

## OWASP Top 10 Applicability

| Risk | Applicability | Mitigation |
|---|---|---|
| A01 Broken Access Control | Low (single-user desktop) | Path validation on IPC handlers |
| A02 Cryptographic Failures | Medium (API key storage) | Keys stored in user home only, never logged |
| A03 Injection | Medium (file path, prompt injection) | Path validation; prompt sanitization |
| A05 Security Misconfiguration | High (Electron defaults are insecure) | Explicit `BrowserWindow` security settings |
| A06 Vulnerable Components | Medium | `npm audit`; pinned Electron version |
| A08 Software Integrity Failures | Medium (packaged app) | `electron-builder` code signing |
