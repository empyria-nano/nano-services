# principia-nano-services

Agent-ready canonical scaffold for **Principia** nano-services, built on Bun and plain
ESM. It's a multi-app workspace, not a monorepo in the usual sense: it embraces
independent *applications* — Moleculer services today, Restate workflows or MCP servers
as they're added — alongside project-specific libraries, and runs them as a single unit
via [nx](https://nx.dev). Each app stays a self-contained, individually documented and
tested unit; this repo is the scaffold that assembles them.

## Requirements

- Bun `>=1.4.0` or Node.js `>=26`
- Plain ESM, no build step, no TypeScript

## Layout

```
apps/<name>/         One app per service (Moleculer today; Restate/MCP as they're added)
  package.json        type: module, its own dependencies, dev/start/format/lint/test scripts
  env.js               Validated process.env for this app (see AGENTS.md for the gotchas)
  moleculer.config.js  ServiceBroker configuration (Moleculer apps only)
  services/*.service.js
  test/*.test.js
lib/                  Project-specific shared libraries (workspace members, empty so far)
test/                 Workspace-level integration tests (empty so far)
docker/               Compose files and friends for local infra (empty so far)
docs/                 Longer-form docs that don't belong in a README
```

## Install

```bash
bun install
```

This links `@principia/classification`, `@principia/common`, `@principia/moleculer`,
`@principia/restate`, and `@principia/mcp` from their sibling repos on disk (see
[AGENTS.md](./AGENTS.md) for exactly how, and why `workspace:*` doesn't work here). Clone
these five repos as siblings of this one, under whatever parent directory you like:

```
<some parent dir>/
  principia-classification/
  principia-common/
  principia-guard-moleculer/
  principia-guard-restate/
  principia-guard-mcp/
  principia-nano-services/   <- this repo
```

## Scripts

Run across every app via [nx](https://nx.dev):

```bash
bun run dev          # dev (hot-reload) for every app
bun run start        # start every app
bun run format       # check formatting (oxfmt)
bun run format:fix   # apply formatting
bun run lint         # lint (oxlint)
bun run lint:fix     # lint and fix
bun run test         # run every app's test suite, with coverage
```

Or scope to one app directly:

```bash
cd apps/lab && bun run dev
cd apps/lab && bun test
```

## Apps

| App | Purpose |
| --- | --- |
| [apps/lab](./apps/lab/README.md) | Moleculer service hosting the `@moleculer/lab` monitoring dashboard (metrics, tracing, logs). |
| [apps/acme](./apps/acme/README.md) | Starter Moleculer service scaffold — no custom actions yet; the template to copy for a new service. |

## Adding a new app

Copy `apps/acme` as a starting point:

1. `package.json` — rename, keep `"type": "module"`, declare only the `@principia/*` and
   npm packages this app's own source actually imports (see AGENTS.md on why
   `@principia/classification` usually shouldn't be a direct dependency).
2. `env.js` — a `createEnv({...})` schema for anything beyond the shared Principia
   defaults, validated with `{ coerceTypes: true }` against a *copy* of `process.env`.
3. `moleculer.config.js` — copy as-is; it reads everything from `env.js`.
4. `services/<Name>.service.js` — mix in `BaseMixin` (from `@principia/moleculer`) at
   minimum; keep `settings: {}` unless you deliberately need env values exposed to the
   broker (see AGENTS.md on the settings/secrets footgun).
5. `test/` — one test file per source file, following the existing apps' pattern.
6. A short `README.md` for the app (what it does, its env vars, how to run it).

## Testing philosophy

Services that bind real network I/O on start (like `apps/lab`'s `AgentService`, which
opens an HTTP port for the dashboard) are shape-tested — their declarative Moleculer
service object is asserted against, but no live broker is started for them. Services
built only on `BaseMixin` (no real I/O of their own) are tested with a real, in-process
`ServiceBroker` (no transporter) — see `apps/acme/test/Acme.service.test.js` for the
pattern. See [AGENTS.md](./AGENTS.md) for the reasoning.

## License

ISC © Imre Fazekas
