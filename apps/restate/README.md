# @empyria/restate-app

[Restate](https://restate.dev) endpoint for this workspace, built on `@empyria/restate`.
Reference scaffold demonstrating the four Restate constructs together: a plain service, a
virtual object, an agent-shaped service, and a workflow orchestrating all three.

## What's here

| File                                                     | Restate construct | Purpose                                                                                                                                                                                                                                                     |
| -------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [services/Services.js](./services/Services.js)           | Service           | `HelloService` — a single `hello` handler, no state.                                                                                                                                                                                                        |
| [services/VirtualObject.js](./services/VirtualObject.js) | Virtual object    | `StorageObject` — durable per-key storage for one value (`set`/`get`).                                                                                                                                                                                      |
| [services/Agent.js](./services/Agent.js)                 | Service           | `AgentService` — stands in for an agent capability. `ask` is a stub (echoes the question back); there's no built-in "agent" primitive in `@restatedev/restate-sdk` — an agent is just a regular service. Wire up a real model call when this app needs one. |
| [services/Workflow.js](./services/Workflow.js)           | Workflow          | `AcmeWorkflow` (registered as `"Acme"`) — calls `HelloService` and `AgentService`, then stores both results in a `StorageObject` instance keyed by the workflow run's own ID.                                                                               |
| [services/Server.js](./services/Server.js)               | —                 | Binds all four to a Restate endpoint and registers it with the admin API.                                                                                                                                                                                   |

## Environment variables

All optional — see [env.js](./env.js) for the schema (built on `@empyria/common`'s
`createEnv`, which adds the shared Empyria defaults).

| Variable              | Default                 | Purpose                                                       |
| --------------------- | ----------------------- | ------------------------------------------------------------- |
| `RESTATE_ADMIN_URL`   | `http://localhost:9070` | Restate server's admin API, used to register this deployment. |
| `RESTATE_HOST`        | `0.0.0.0`               | Host this endpoint's HTTP/2 server binds to.                  |
| `RESTATE_PORT`        | `8100`                  | Port this endpoint's HTTP/2 server binds to.                  |
| `RESTATE_HEALTH_PORT` | `8101`                  | Port the `/health` check server binds to.                     |

## Run

Requires a running Restate server (see the
[Restate quickstart](https://docs.restate.dev/get_started/quickstart)) reachable at
`RESTATE_ADMIN_URL`.

```bash
bun run dev     # hot-reload
bun run start
bun test        # bun:test, with coverage
```

Once running and registered, try the workflow:

```bash
curl localhost:8080/Acme/some-run-id/run/send \
  -H 'content-type: application/json' \
  -d '{"name": "World", "question": "life, universe, everything"}'
```

(`8080` is Restate's own ingress port, not this app's `RESTATE_PORT` — the ingress is
where clients call in; `RESTATE_PORT` is where Restate calls back into this process.)

## Notes

`setupRestate` binds a real HTTP/2 port and a health-check port, so — like `apps/lab`'s
`AgentService` — `Server.js` is shape-tested (`services` is asserted against directly)
rather than started in tests. Every handler is tested individually with a mocked
`ctx`, the same pattern `empyria-guard-restate`'s own tests use. See the root
[AGENTS.md](../../AGENTS.md#testing-philosophy).
