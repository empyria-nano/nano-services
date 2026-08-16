# @empyria/mcp-scaffold

[MCP (Model Context Protocol)](https://modelcontextprotocol.io) endpoint for this
workspace, built on `@empyria/mcp`. Reference scaffold showing Moleculer-shaped
services (`{ name, actions }`) published as MCP tools — one public, one demonstrating
`@empyria/mcp`'s token-guard feature.

## What's here

| File                                                   | Purpose                                                                                                                                                                     |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [services/Library.js](./services/Library.js)           | `Library` — a small in-memory book store (`addBook`, `getBook`, `listBooks`), public, no auth. Each action becomes an MCP tool named `"Library.<actionName>"`.              |
| [services/LibraryAdmin.js](./services/LibraryAdmin.js) | `LibraryAdmin` — demo of `@empyria/mcp`'s `resolveToken`/`withMetaGuard` feature. Its one action, `resetLibrary`, requires a valid token on a custom header before it runs. |
| [services/Server.js](./services/Server.js)             | Publishes both services over MCP-over-HTTP via `serveMcpHttp`, passing `guard: { tokenHeader: GUARD_TOKEN_HEADER }` so `LibraryAdmin` actually enforces its guard.          |

## Environment variables

All optional — see [env.js](./env.js) for the schema (built on `@empyria/common`'s
`createEnv`, which adds the shared Empyria defaults).

| Variable              | Default            | Purpose                                                                                                                            |
| --------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `MCP_SERVICE_NAME`    | `MCP-Server`       | Name shown to MCP clients.                                                                                                         |
| `MCP_SERVICE_VERSION` | `1.0.0`            | Version shown to MCP clients.                                                                                                      |
| `MCP_PORT`            | `3032`             | Port the MCP HTTP server binds to.                                                                                                 |
| `MCP_ADMIN_TOKEN`     | `demo-admin-token` | Token `LibraryAdmin.resetLibrary` requires. **Demo default only** — set a real secret via the environment for any real deployment. |

## Run

```bash
bun run dev     # hot-reload
bun run start
bun test        # bun:test, with coverage
```

Once running, call a public tool over HTTP with any MCP client, or inspect it directly:

```bash
curl localhost:3032 \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"Library.addBook","arguments":{"title":"Dune","author":"Frank Herbert"}}}'
```

`LibraryAdmin.resetLibrary` additionally needs the token header `Server.js` configures
(`x-token-key` by default — see `GUARD_TOKEN_HEADER` in `LibraryAdmin.js`):

```bash
curl localhost:3032 \
  -H 'content-type: application/json' \
  -H 'x-token-key: demo-admin-token' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"LibraryAdmin.resetLibrary","arguments":{}}}'
```

Omit the header, or send the wrong token, and the call comes back as a normal tool-call
error (`isError: true`) — not a thrown protocol error.

## Notes

Unlike `apps/restate`'s `setupRestate` or `apps/lab`'s `AgentService` — both of which bind
real network ports — `createMcpServer` paired with an `InMemoryTransport` binds no real
resource at all, so it's safe to drive live with a real `@modelcontextprotocol/client`
`Client` in tests, matching `empyria-guard-mcp`'s own test convention (see
`test/Server.test.js`). The one exception is the guard itself: token headers only exist
on a real HTTP request, so proving `LibraryAdmin`'s guard actually rejects/accepts
correctly needs a real (if ephemeral, `port: 0`) `serveMcpHttp` instance — see the
`"guard: { tokenHeader } over real HTTP"` tests in `test/Server.test.js`, which use a
throwaway service rather than the real `Library`/`LibraryAdmin` singletons to avoid
touching their shared module state. `setup()` itself, which binds the real `MCP_PORT`,
is still left untested live. See the root
[AGENTS.md](../../AGENTS.md#testing-philosophy).
