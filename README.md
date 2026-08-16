# empyria-nano-services

Agent-ready canonical scaffold for **Principia** nano-services, built on Bun and plain
ESM. It's a multi-app workspace, not a monorepo in the usual sense: it embraces
independent _applications_ — Moleculer services, Restate workflows, MCP servers — side by
side, alongside project-specific libraries, and runs them as a single unit via
[nx](https://nx.dev). Each app stays a self-contained, individually documented and tested
unit; this repo is the scaffold that assembles them.

## Requirements

- Bun `>=1.4.0` or Node.js `>=26`
- Plain ESM, no build step, no TypeScript

## Layout

```
apps/<name>/         One app per service (Moleculer, Restate, or MCP)
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

This links `@empyria/classification`, `@empyria/common`, `@empyria/moleculer`,
`@empyria/restate`, and `@empyria/mcp` from their sibling repos on disk (see
[AGENTS.md](./AGENTS.md) for exactly how, and why `workspace:*` doesn't work here). Clone
these five repos as siblings of this one, under whatever parent directory you like:

```
<some parent dir>/
  empyria-classification/
  empyria-common/
  empyria-guard-moleculer/
  empyria-guard-restate/
  empyria-guard-mcp/
  empyria-nano-services/   <- this repo
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

| App                                          | Purpose                                                                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [apps/lab](./apps/lab/README.md)             | Moleculer service hosting the `@moleculer/lab` monitoring dashboard (metrics, tracing, logs).                             |
| [apps/moleculer](./apps/moleculer/README.md) | Starter Moleculer service scaffold — no custom actions yet; the template to copy for a new Moleculer service.             |
| [apps/restate](./apps/restate/README.md)     | Restate endpoint scaffold — a service, a virtual object, an agent-shaped service, and a workflow orchestrating all three. |
| [apps/mcp](./apps/mcp/README.md)             | MCP endpoint scaffold — a Moleculer-shaped `{ name, actions }` service published as MCP tools.                            |

## Adding a new app

Copy the app under `apps/` that matches the backend you're adding — `apps/moleculer` for
Moleculer, `apps/restate` for Restate, `apps/mcp` for MCP — as a starting point:

1. `package.json` — rename following the `@empyria/<app>-scaffold` convention (e.g.
   `@empyria/mcp-scaffold`, not `@empyria/mcp` — the latter collides with the library
   it depends on, see AGENTS.md), keep `"type": "module"`, declare only the `@empyria/*`
   and npm packages this app's own
   source actually imports.
2. `env.js` — a `createEnv({...})` schema for anything beyond the shared Principia
   defaults, validated with `{ coerceTypes: true }` against a _copy_ of `process.env`.
3. Moleculer apps: `moleculer.config.js` copies as-is (it reads everything from `env.js`);
   `services/<Name>.service.js` mixes in `BaseMixin` at minimum. Restate/MCP apps have no
   auto-discovery — `services/Server.js` is a real entrypoint, guarded with
   `if (import.meta.main) { await setup() }` so it's still side-effect-free to import
   (e.g. from a test) — see AGENTS.md.
4. Decide whether a service's `settings`/exported state should be the full env-derived
   object (the standard, simplest option) or a cherry-picked subset, based on whether it
   might ever be exposed beyond trusted callers — see AGENTS.md.
5. `test/` — one test file per source file, following the existing apps' pattern.
6. A short `README.md` for the app (what it does, its env vars, how to run it).

## Testing philosophy

Services that bind real network I/O on start (like `apps/lab`'s `AgentService`, or
`apps/restate`'s `setupRestate`) are shape-tested — their declarative service object is
asserted against, but nothing is started live. Services with no real I/O of their own —
Moleculer services built only on `BaseMixin` (see
`apps/moleculer/test/Acme.service.test.js`), or MCP servers driven over an
`InMemoryTransport` (see `apps/mcp/test/Server.test.js`, which binds no real resource
despite going through a real MCP `Client`) — are tested live. See
[AGENTS.md](./AGENTS.md) for the reasoning.

## License

ISC © Imre Fazekas
