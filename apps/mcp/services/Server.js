import { serveMcpHttp } from '@empyria/mcp'

import { env } from '../env.js'
import Library from './Library.js'
import LibraryAdmin, { GUARD_TOKEN_HEADER } from './LibraryAdmin.js'

/**
 * Every service this endpoint publishes as MCP tools. Exported on its own (separate from
 * {@link setup}) so it can be asserted against in a test — or driven live over an
 * `InMemoryTransport`, which binds no real network resource — without starting the real
 * HTTP server `setup` does. See AGENTS.md.
 *
 * `LibraryAdmin` demonstrates `@empyria/mcp`'s token-guard feature — its actions only
 * work when called over HTTP with a valid token on {@link GUARD_TOKEN_HEADER}. See its
 * own docs.
 */
export const services = [Library, LibraryAdmin]

/**
 * Starts this process's MCP server over HTTP (via `Bun.serve`), publishing every service
 * in {@link services} as MCP tools. `guard` configures the header `LibraryAdmin`'s token
 * is read from — it's a no-op for `Library`, which has no `resolveToken` and so is never
 * wrapped by `withMetaGuard` in the first place (guarding is opt-in per service, not
 * something `guard` imposes on services that didn't ask for it).
 *
 * Exported (rather than run unconditionally) so this module can be imported without side
 * effects, and only actually starts listening when this file is run directly.
 * @returns {ReturnType<import('@empyria/mcp').serveMcpHttp>}
 */
export const setup = async () => {
	const server = serveMcpHttp(
		{
			name: env.MCP_SERVICE_NAME,
			version: env.MCP_SERVICE_VERSION,
			services,
			guard: { tokenHeader: GUARD_TOKEN_HEADER },
		},
		{ port: env.MCP_PORT },
	)

	console.log(`MCP server "${env.MCP_SERVICE_NAME}" listening on :${env.MCP_PORT}`)

	return server
}

if (import.meta.main) {
	await setup()
}
