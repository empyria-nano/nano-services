# AGENTS.md

Agent-ready canonical scaffold for **Principia** nano-services: a multi-app workspace
(Moleculer services today, Restate/MCP as they're added) assembled from independent
sibling repos and run as a single unit via nx. This file is the "what will bite you"
companion to [README.md](./README.md) — most of it is hard-won from getting local dev
linking and env parsing working at all.

## Runtime

- Requires Bun `>=1.4.0` or Node.js `>=26`, inherited from `@principia/classification`'s
  use of native `Temporal`.
- Plain ESM, no TypeScript, no build step. Every `apps/*/package.json` needs
  `"type": "module"` explicitly — without it, Node has to sniff each file and reparses it
  as ESM with a `MODULE_TYPELESS_PACKAGE_JSON` warning and a real performance cost.
- Style is enforced by oxfmt/oxlint ([.oxfmtrc.json](./.oxfmtrc.json)): tabs, single
  quotes, no semicolons, trailing commas. Run `bun run format:fix` before committing.

## Local dev linking: why `workspace:*` doesn't work here, and what does

The five `@principia/*` packages this repo depends on
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
   computes the *nested* dependency's relative symlink (e.g. `@principia/moleculer`'s own
   dependency on `@principia/common`) using the workspace-declared virtual path depth
   instead of the real, symlink-resolved depth. The symlink Bun writes ends up pointing at
   a nonexistent location, and `@principia/common` throws `ERR_MODULE_NOT_FOUND` at
   runtime — only when actually importing through the chain, so this doesn't show up
   until an app tries to boot.
3. **`workspaces.catalog` + `file:` has the same bug, worse.** Routing a `file:` path
   through a catalog entry and consuming it via `catalog:` from a nested app
   (`apps/lab`, two directories deep) hits an analogous relative-path miscalculation —
   Bun resolves the catalog's `file:` value relative to the *consumer's* directory, not
   the root's, once the consumer isn't the root itself.

**What actually works:** plain `file:../sibling-repo` dependencies, declared directly
(not through a workspace glob, not through a catalog) in every `package.json` that needs
one — root, each app, and critically **inside the sibling repos' own `package.json`
too** (`principia-guard-moleculer`, `-restate`, `-mcp`, and `principia-common` all
depend on `@principia/classification`/`@principia/common`). Since those four repos are
independently "done" and keep git-URL dependencies for their own standalone/published
use, this repo's root `package.json` carries an `overrides` block that forces
`@principia/classification` and `@principia/common` to resolve to the same local `file:`
links *everywhere in the install tree*, without editing those repos:

```json
"dependencies": {
  "@principia/classification": "file:../principia-classification",
  "@principia/common": "file:../principia-common",
  "@principia/moleculer": "file:../principia-guard-moleculer",
  "@principia/restate": "file:../principia-guard-restate",
  "@principia/mcp": "file:../principia-guard-mcp"
},
"overrides": {
  "@principia/classification": "file:../principia-classification",
  "@principia/common": "file:../principia-common"
}
```

Each app that imports one of the five directly declares its own `file:` dependency too
(relative to *that app's* directory, e.g. `apps/lab/package.json` uses
`file:../../../principia-guard-moleculer`) — declare only what the app's own source
actually imports; don't copy the full set from another app's `package.json` (that's how
`apps/acme` ended up with an unused `@moleculer/lab` dependency at one point).

`workspaces.catalog` is still fine — even good — for ordinary semver-ranged packages
shared across apps (`moleculer`, `oxfmt`, `oxlint`, `pino`). The bug is specific to
`file:` specifiers; catalog entries with a plain version range work as documented.

## `file:` deps are hard links, not live symlinks — you must reinstall after editing a sibling repo

This is the single easiest thing to get burned by. Bun's `file:` protocol links files at
the individual-file level, and it does this with **hard links**, not symlinks. A hard
link means two paths share the same inode — editing one *in place* (e.g. `>>` appending)
is instantly visible through the other. But essentially every editor and this
repo's normal editing tools save via an **atomic write** (write a new file, then rename
it over the old path), which allocates a fresh inode at the original path and orphans the
old, shared one. The installed copy under `node_modules/.bun/...` silently keeps serving
the *pre-edit* content.

Practical upshot: after editing anything in `principia-common`, `principia-classification`,
or any of the `principia-guard-*` repos, **you must `rm -rf node_modules bun.lock &&
bun install`** in `principia-nano-services` (and in any app whose `node_modules` might
have its own stale copy) before the change is visible here. There's no warning when this
goes stale — it just silently runs old code. If a fix "isn't working" after editing a
sibling repo, this is the first thing to check: `diff` the installed copy in
`node_modules/.bun/@principia+<pkg>@file+.../node_modules/@principia/<pkg>/<file>` against
the source.

## `process.env` gotchas in env parsing (`apps/*/env.js`)

Every app validates its environment through `@principia/common`'s `createEnv`/`validate`.
Two non-obvious things about `process.env` specifically broke this, both now fixed but
worth understanding if you touch `env.js` in any app:

1. **`process.env` only ever holds strings.** `process.env.PORT = 4040` is immediately
   `"4040"`, not `4040` — Node coerces on assignment, unconditionally. `ata-validator`
   (used by `createEnv`/`validate`) does **not** coerce types by default, so any
   explicitly-set numeric/boolean env var (`PRINCIPIA_PROMETHEUS_PORT=4040`,
   `RESET=true`, ...) fails strict `type: 'number'`/`type: 'boolean'` validation. Every
   `env.js` passes `{ coerceTypes: true }` as `validate`'s third argument to handle this —
   see `principia-common/lib/Ata.js`'s `createValidator`/`validate`, which forward an
   optional `ValidatorOptions` object. This is opt-in per call site deliberately: the
   general-purpose `validate()` used elsewhere (e.g. Restate workflow I/O validation)
   should stay strict.
2. **`ata-validator`'s `useDefaults` mutates its input object in place** — and combines
   badly with fact 1. If `env.js` validates `process.env` directly instead of a copy,
   filling in a missing default (`data.PRINCIPIA_ID_LENGTH = 32`) writes straight onto the
   real `process.env`, which immediately stringifies it back to `"32"` — corrupting the
   very value validation just set, which then fails re-validation. Every `env.js`
   validates `{ ...process.env }` (a plain copy) for exactly this reason. Never pass
   `process.env` itself to `validate`/`createValidator`.

## `NODE_ENV=test`

`bun test` (and most JS test runners) sets `NODE_ENV=test` automatically. `createEnv`'s
`nodeEnv()` schema enum includes `'test'` for this reason — without it, no app validating
`process.env` at import time could ever run its own test suite; every test file would fail
before the first assertion, environment-schema validation rejecting `NODE_ENV` itself.

## Moleculer `settings` can leak the whole environment

`createEnv` schemas use `additionalProperties: true`, so an app's env-derived `settings`
export (in `env.js`) carries the *entire* `process.env` along, not just the schema's known
keys — unrelated vars, API keys, auth sockets, all of it. Moleculer exposes a service's
`settings` via runtime introspection. Never assign that object wholesale as a service's
own `settings:` field — cherry-pick only the specific values a feature needs, the way
`Lab.service.js` pulls `metrics.enabled`/`tracing.enabled` out and leaves `settings: {}`
on the service itself. (`Acme.service.js` did this wrong at one point — fixed.)

## Testing philosophy

- Services that bind real network I/O on Moleculer's `started` hook (e.g. `apps/lab`'s
  `AgentService`, which opens an HTTP port for the Laboratory dashboard) are **not**
  started with a live broker in tests — assert against their declarative service object
  instead. Same reasoning as `principia-guard-restate`'s `setupRestate` precedent.
- Services built only on `BaseMixin` (no real I/O of their own) are safe to start with a
  real, transporter-less, in-process `ServiceBroker` — see
  `apps/acme/test/Acme.service.test.js`, mirroring
  `principia-guard-moleculer/test/Base.mixin.test.js`.
- `env.js` modules compute their exports once, at import time, from whatever
  `process.env` looks like right then. To test multiple scenarios in one file without
  cross-test contamination (and without leaking into *other* test files that also import
  the same `env.js`), use a cache-busting dynamic import per scenario:
  `import(\`../env.js?run=${n}\`)`, setting `process.env` immediately before each import
  and restoring it in `afterEach`.
- Moleculer's `getLocalService`/service lookups need the `{ name, version }` form (or a
  `v<version>.<name>` string) once a service declares a `version` — a bare name lookup
  silently returns `undefined`.
