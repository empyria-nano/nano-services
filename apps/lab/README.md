# @empyria/lab

Moleculer service hosting the [`@moleculer/lab`](https://moleculer.services) monitoring
dashboard for this workspace: metrics, tracing, and log forwarding via the `Laboratory`
exporter, alongside the usual Empyria `MetaGuard`/`BaseMixin` wiring every service in
this workspace shares.

## Environment variables

All optional — see [env.js](./env.js) for the schema (built on
`@empyria/common`'s `createEnv`, which adds the shared Empyria defaults:
`EMPYRIA_ID_LENGTH`, `NODE_ENV`, `LOG_LEVEL`, `MOLECULER_CACHE_*`, ...).

| Variable                  | Default | Purpose                                                   |
| ------------------------- | ------- | --------------------------------------------------------- |
| `EMPYRIA_PROMETHEUS_PORT` | `3030`  | Port the Prometheus metrics reporter listens on.          |
| `LAB_METRICS_ENABLED`     | `true`  | Whether metrics are exported to the Laboratory dashboard. |
| `LAB_TRACING_ENABLED`     | `true`  | Whether traces are exported to the Laboratory dashboard.  |

## Run

```bash
bun run dev     # hot-reload
bun run start
bun test        # bun:test, with coverage
```

## Notes

`AgentService` binds a real HTTP port for the dashboard on start, so it's deliberately
not exercised with a live broker in tests — see the root [AGENTS.md](../../AGENTS.md#testing-philosophy).
