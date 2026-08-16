# @empyria/moleculer-scaffold

Starter Moleculer service scaffold for this workspace — no custom actions, events, or
methods yet. It's the template to copy when adding a new Moleculer app: wired up with
`BaseMixin` (from `@empyria/moleculer`) for the standard Principia meta-stamping and
`packageVersion` action, and nothing else.

## Environment variables

All optional — see [env.js](./env.js) for the schema (built on
`@empyria/common`'s `createEnv`, which adds the shared Principia defaults:
`PRINCIPIA_ID_LENGTH`, `NODE_ENV`, `LOG_LEVEL`, `MOLECULER_CACHE_*`, ...).

| Variable                    | Default | Purpose                                          |
| --------------------------- | ------- | ------------------------------------------------ |
| `PRINCIPIA_PROMETHEUS_PORT` | `3031`  | Port the Prometheus metrics reporter listens on. |

## Run

```bash
bun run dev     # hot-reload
bun run start
bun test        # bun:test, with coverage
```

## Notes

Unlike `apps/lab`, this service only depends on `BaseMixin` — no real network I/O of its
own — so its tests start a real, in-process `ServiceBroker` rather than shape-testing the
service object. See the root [AGENTS.md](../../AGENTS.md#testing-philosophy).
