# AGENTS.md

Agent-ready canonical scaffold for **Empyria** nano-services: a multi-app workspace
(Moleculer, Restate, and MCP apps side by side) assembled from independent sibling repos
and run as a single unit via nx. This file is the "what will bite you" companion to
[README.md](./README.md) — most of it is hard-won from getting local dev linking and env
parsing working at all.

## Runtime

- Requires Bun `>=1.4.0` or Node.js `>=26`, inherited from `@empyria/classification`'s
  use of native `Temporal`.
- Plain ESM, no TypeScript, no build step. Every `apps/*/package.json` needs
  `"type": "module"` explicitly — without it, Node has to sniff each file and reparses it
  as ESM with a `MODULE_TYPELESS_PACKAGE_JSON` warning and a real performance cost.
- Style is enforced by oxfmt/oxlint ([.oxfmtrc.json](./.oxfmtrc.json)): tabs, single
  quotes, no semicolons, trailing commas. Run `bun run format:fix` before committing.

## Local dev linking: why `workspace:*` doesn't work here, and what does

The five `@empyria/*` packages this repo depends on
(`classification`/`common`/`moleculer`/`restate`/`mcp`) live in **sibling repos on
disk**, not nested inside this one — that's the whole point of the multi-repo design.
That single fact rules out Bun's `workspace:*` protocol, and it took real trial and error
to nail down exactly why and what actually works instead:

1. **Bun's workspace glob skips symlinked directories.** Symlinking a sibling repo into
   e.g. `external/*` and adding that glob to `workspaces` silently fails to discover it —
   confirmed directly: a real directory under the same glob gets found, a symlinked one
   with the identical pattern doesn't.
2. **Forcing an explicit (non-glob) workspace path that happens to be a symlink half-works,
   then breaks one level deeper.** The top-level `workspace:*` resolves fine, but Bun
   computes the _nested_ dependency's relative symlink (e.g. `@empyria/moleculer`'s own
   dependency on `@empyria/common`) using the workspace-declared virtual path depth
   instead of the real, symlink-resolved depth. The symlink Bun writes ends up pointing at
   a nonexistent location, and `@empyria/common` throws `ERR_MODULE_NOT_FOUND` at
   runtime — only when actually importing through the chain, so this doesn't show up
   until an app tries to boot.
3. **`workspaces.catalog` + `file:` has the same bug, worse.** Routing a `file:` path
   through a catalog entry and consuming it via `catalog:` from a nested app
   (`apps/lab`, two directories deep) hits an analogous relative-path miscalculation —
   Bun resolves the catalog's `file:` value relative to the _consumer's_ directory, not
   the root's, once the consumer isn't the root itself.

**What actually works:** plain `file:../sibling-repo` dependencies, declared directly
(not through a workspace glob, not through a catalog) in every `package.json` that needs
one — root, each app, and critically **inside the sibling repos' own `package.json`
too** (`empyria-guard-moleculer`, `-restate`, `-mcp`, and `empyria-common` all
depend on `@empyria/classification`/`@empyria/common`). Since those four repos are
independently "done" and keep git-URL dependencies for their own standalone/published
use, this repo's root `package.json` carries an `overrides` block that forces
`@empyria/classification` and `@empyria/common` to resolve to the same local `file:`
links _everywhere in the install tree_, without editing those repos:

```json
"dependencies": {
  "@empyria/classification": "0.1.0",
  "@empyria/common": "0.1.0",
  "@empyria/moleculer": "0.1.0",
  "@empyria/restate": "0.1.0",
  "@empyria/mcp": "0.1.0"
},
```

Each app that imports one of the five directly declares its own `file:` dependency too
(relative to _that app's_ directory, e.g. `apps/lab/package.json` uses
`file:../../../empyria-guard-moleculer`) — declare only what the app's own source
actually imports; don't copy the full set from another app's `package.json` (that's how
`apps/moleculer` ended up with an unused `@moleculer/lab` dependency at one point).

`workspaces.catalog` is still fine — even good — for ordinary semver-ranged packages
shared across apps (`moleculer`, `oxfmt`, `oxlint`, `pino`). The bug is specific to
`file:` specifiers; catalog entries with a plain version range work as documented.

## `file:` deps are hard links, not live symlinks — you must reinstall after editing a sibling repo

This is the single easiest thing to get burned by. Bun's `file:` protocol links files at
the individual-file level, and it does this with **hard links**, not symlinks. A hard
link means two paths share the same inode — editing one _in place_ (e.g. `>>` appending)
is instantly visible through the other. But essentially every editor and this
repo's normal editing tools save via an **atomic write** (write a new file, then rename
it over the old path), which allocates a fresh inode at the original path and orphans the
old, shared one. The installed copy under `node_modules/.bun/...` silently keeps serving
the _pre-edit_ content.

Practical upshot: after editing anything in `empyria-common`, `empyria-classification`,
or any of the `empyria-guard-*` repos, **you must `rm -rf node_modules bun.lock &&
bun install`** in `empyria-nano-services` (and in any app whose `node_modules` might
have its own stale copy) before the change is visible here. There's no warning when this
goes stale — it just silently runs old code. If a fix "isn't working" after editing a
sibling repo, this is the first thing to check: `diff` the installed copy in
`node_modules/.bun/@empyria+<pkg>@file+.../node_modules/@empyria/<pkg>/<file>` against
the source.

## `process.env` gotchas in env parsing (`apps/*/env.js`)

Every app validates its environment through `@empyria/common`'s `createEnv`/`validate`.
Two non-obvious things about `process.env` specifically broke this, both now fixed but
worth understanding if you touch `env.js` in any app:

1. **`process.env` only ever holds strings.** `process.env.PORT = 4040` is immediately
   `"4040"`, not `4040` — Node coerces on assignment, unconditionally. `ata-validator`
   (used by `createEnv`/`validate`) does **not** coerce types by default, so any
   explicitly-set numeric/boolean env var (`EMPYRIA_PROMETHEUS_PORT=4040`,
   `RESET=true`, ...) fails strict `type: 'number'`/`type: 'boolean'` validation. Every
   `env.js` passes `{ coerceTypes: true }` as `validate`'s third argument to handle this —
   see `empyria-common/lib/Ata.js`'s `createValidator`/`validate`, which forward an
   optional `ValidatorOptions` object. This is opt-in per call site deliberately: the
   general-purpose `validate()` used elsewhere (e.g. Restate workflow I/O validation)
   should stay strict.
2. **`ata-validator`'s `useDefaults` mutates its input object in place** — and combines
   badly with fact 1. If `env.js` validates `process.env` directly instead of a copy,
   filling in a missing default (`data.EMPYRIA_ID_LENGTH = 32`) writes straight onto the
   real `process.env`, which immediately stringifies it back to `"32"` — corrupting the
   very value validation just set, which then fails re-validation. Every `env.js`
   validates `{ ...process.env }` (a plain copy) for exactly this reason. Never pass
   `process.env` itself to `validate`/`createValidator`.

## `NODE_ENV=test`

`bun test` (and most JS test runners) sets `NODE_ENV=test` automatically. `createEnv`'s
`nodeEnv()` schema enum includes `'test'` for this reason — without it, no app validating
`process.env` at import time could ever run its own test suite; every test file would fail
before the first assertion, environment-schema validation rejecting `NODE_ENV` itself.

## Moleculer `settings` carries the whole environment along

`createEnv` schemas use `additionalProperties: true`, so an app's env-derived `settings`
export (in `env.js`) carries the _entire_ `process.env` along, not just the schema's known
keys — unrelated vars, API keys, auth sockets, all of it. Assigning that object as a
service's own `settings:` field (`Acme.service.js` does this — it's the standard way to
configure a Moleculer service here, deriving settings from env) is deliberate, not a bug.
Just be aware Moleculer exposes a service's `settings` via runtime introspection, so this
matters if a service ever runs somewhere its introspection is reachable by something that
shouldn't see the rest of the process environment. `Lab.service.js` takes the other
approach — cherry-picking only `metrics.enabled`/`tracing.enabled` out and leaving
`settings: {}` on the service itself — both are fine; pick per-app based on whether the
service's settings might ever be exposed beyond trusted callers.

## Don't name an app's package after a library it depends on

`apps/restate`'s `package.json` was briefly named `@empyria/restate` — the same name
as the `@empyria/restate` library (`empyria-guard-restate`) it depends on. That's a
real collision, not just confusing: the app and its own dependency would both resolve
under the identical package name in the install tree, making `import ... from
'@empyria/restate'` inside the app's own source ambiguous. It's now
`@empyria/restate-scaffold` (every app package here is named `@empyria/<app>-scaffold`
— `apps/moleculer` is `@empyria/moleculer-scaffold`, `apps/mcp` is
`@empyria/mcp-scaffold`), which sidesteps the trap for every current and future app: the
`-scaffold` suffix never matches a library's own name.

## Non-Moleculer apps need their own entrypoint

`apps/lab`/`apps/moleculer` are started via `moleculer-runner services/**/*.service.js`,
which auto-discovers and boots every matching file — there's no explicit "start" code.
Restate and MCP apps have no equivalent auto-discovery; `apps/restate/services/Server.js`
and `apps/mcp/services/Server.js` are real entrypoint scripts, each guarded with
`if (import.meta.main) { await setup() }` so the module can still be imported
side-effect-free (e.g. from a test asserting on its exported `services` array) while also
being directly runnable via `bun services/Server.js` — which is what those apps'
`package.json` `dev`/`start` scripts do instead of invoking `moleculer-runner`.

## Restate specifics

- There's no built-in "agent" primitive in `@restatedev/restate-sdk` (checked directly
  against the installed `1.6.x` package — nothing beyond unrelated `user_agent` HTTP
  header code). An "agent service" is just a regular Restate service; see
  `apps/restate/services/Agent.js`, whose `ask` handler is a deliberate stub for
  whoever wires up a real model call.
- `restate.service({...})`/`restate.object({...})`/`restate.workflow({...})` (and
  `@empyria/restate`'s `defineService`/`defineObject`/`defineWorkflow` passthroughs)
  do **not** put your handlers under `.handlers` on the returned definition — they're at
  `.service`, `.object`, or `.workflow` respectively (e.g.
  `HelloService.service.hello(ctx, input)`). Same fact `empyria-guard-restate`'s own
  AGENTS.md notes for `restate.service`/`restate.object`; it's true for `workflow()` too.
- Cross-construct calls from within a handler use `ctx.serviceClient(Def)`,
  `ctx.objectClient(Def, key)`, or `ctx.workflowClient(Def, key)` — bound to the actual
  definition object (not a name string), then called like `.methodName(args)`. See
  `apps/restate/services/Workflow.js`.
- Tests mock `ctx` directly (matching `empyria-guard-restate/test/Cron.test.js`'s own
  pattern) rather than exercising real Restate machinery — see
  `apps/restate/test/Workflow.test.js`. `setupRestate` binds a real HTTP/2 port and a
  health-check port, so `Server.js` is shape-tested only (its `services` array, exported
  separately from `setup`), never started live in tests — same reasoning as the
  Moleculer `AgentService` case below.

## Testing philosophy

- Services that bind real network I/O on start — Moleculer's `AgentService` (`apps/lab`,
  opens an HTTP port for the Laboratory dashboard), Restate's `setupRestate`
  (`apps/restate`, binds an HTTP/2 port and a health-check port) — are **not** started
  live in tests; assert against their declarative service object instead.
- Services with no real I/O of their own are safe to exercise live:
    - Moleculer services built only on `BaseMixin` — a real, transporter-less, in-process
      `ServiceBroker` (see `apps/moleculer/test/Acme.service.test.js`, mirroring
      `empyria-guard-moleculer/test/Base.mixin.test.js`).
    - MCP servers via `createMcpServer` + `InMemoryTransport` (see
      `apps/mcp/test/Server.test.js`) — despite going through a real
      `@modelcontextprotocol/client` `Client`, this binds no real network resource at all,
      unlike `serveMcpHttp`/`Bun.serve`. Matches `empyria-guard-mcp`'s own test
      convention.
- One deliberate exception: `@empyria/mcp`'s token guard (`resolveToken`/
  `withMetaGuard`, demoed in `apps/mcp/services/LibraryAdmin.js`) reads the token from a
  real HTTP request header (`extra.http.req.headers`) — `InMemoryTransport` has no such
  thing, so it can only prove the _rejection_ path (no token ⇒ always rejected,
  regardless of transport), never the _acceptance_ path. Proving a valid token is
  actually accepted needs a real, if ephemeral (`port: 0`), `serveMcpHttp` instance — see
  `apps/mcp/test/Server.test.js`'s `"guard: { tokenHeader } over real HTTP"` block, which
  uses its own throwaway service rather than the real `Library`/`LibraryAdmin`
  singletons specifically to avoid mutating shared module state other test files in the
  same run depend on (`bun test` shares one module registry across every file it runs —
  same reason `env.js` needs the cache-busting trick below).
- `env.js` modules compute their exports once, at import time, from whatever
  `process.env` looks like right then. To test multiple scenarios in one file without
  cross-test contamination (and without leaking into _other_ test files that also import
  the same `env.js`), use a cache-busting dynamic import per scenario:
  `import(\`../env.js?run=${n}\`)`, setting `process.env`immediately before each import
and restoring it in`afterEach`.
- Moleculer's `getLocalService`/service lookups need the `{ name, version }` form (or a
  `v<version>.<name>` string) once a service declares a `version` — a bare name lookup
  silently returns `undefined`.
