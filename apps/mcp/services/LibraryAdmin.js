import { env } from '../env.js'
import { clearLibrary } from './Library.js'

/**
 * Header `LibraryAdmin`'s token is expected on. Passed to `createMcpServer`/`serveMcpHttp`
 * as `guard: { tokenHeader: GUARD_TOKEN_HEADER }` in `Server.js` — a non-default header,
 * chosen deliberately so the demo actually exercises the `guard` option instead of
 * relying on `lib/Guard.js`'s `"authorization"` default silently doing the right thing.
 */
export const GUARD_TOKEN_HEADER = 'x-token-key'

/**
 * Demo of `@empyria/mcp`'s token-guard feature (`withMetaGuard`, applied automatically
 * by `createMcpServer` to any service that declares `resolveToken`): every action on
 * *this* service requires a resolved token — guarding is per-service, all-or-nothing,
 * which is why this is a separate service from the public `Library` rather than a mixed
 * bag of guarded/unguarded actions on one.
 *
 * This only works over HTTP — tokens travel as request headers (here,
 * {@link GUARD_TOKEN_HEADER}), and stdio (or an in-memory transport, as used in most
 * tests) has none, so a call with no HTTP context is always rejected regardless of
 * token. See `@empyria/mcp`'s `lib/Guard.js` docs.
 *
 * The token check here is a single hardcoded env var purely for demo purposes — a real
 * deployment should resolve against a real identity/secret store, the way this
 * function's JSDoc parameter names mirror `empyria-guard-moleculer`'s `MetaGuard`.
 */
export default {
	name: 'LibraryAdmin',

	/**
	 * @param {string} tokenKey - Token read from {@link GUARD_TOKEN_HEADER}.
	 * @returns {Promise<{name: string}|undefined>} A truthy "user" to allow the call
	 *   through (attached to the handler's `extra.user`), or a falsy value to reject it.
	 */
	async resolveToken(tokenKey) {
		if (tokenKey !== env.MCP_ADMIN_TOKEN) return undefined
		return { name: 'admin' }
	},

	actions: {
		/**
		 * Wipes the library's entire book store. Requires a valid admin token.
		 * @param {{}} params
		 * @param {Object} extra - `extra.user` is `{ name: 'admin' }`, set by
		 *   `resolveToken` above once the token is validated.
		 * @returns {{cleared: true}}
		 */
		resetLibrary: {
			description: 'Clear the entire library (requires an admin token)',
			handler: async (params, extra) => {
				clearLibrary()
				return { cleared: true, by: extra?.user?.name }
			},
		},
	},
}
