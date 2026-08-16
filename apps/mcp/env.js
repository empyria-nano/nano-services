import { createEnv, validate, string, number } from '@empyria/common'

/**
 * Environment schema for the `mcp` app: the Principia-wide defaults from {@link createEnv}
 * plus everything `services/Server.js` needs to identify and serve this MCP endpoint.
 */
const schema = createEnv({
	MCP_SERVICE_NAME: string('MCP-Server'),
	MCP_SERVICE_VERSION: string('1.0.0'),
	MCP_PORT: number(3032),
	// Demo-only default — a real deployment must set a real secret via the environment,
	// never rely on this fallback. See services/LibraryAdmin.js.
	MCP_ADMIN_TOKEN: string('demo-admin-token'),
})

/**
 * Validated environment for this process.
 *
 * Validates a *copy* of `process.env`, not `process.env` itself — `validate`'s
 * `useDefaults` mutates its input in place, and writing a real number/boolean onto
 * `process.env` directly gets silently stringified by Node (env vars are string-only),
 * which then fails re-validation. `coerceTypes: true` is required for the same reason:
 * every value actually *set* in the environment (not just defaulted) arrives as a
 * string, e.g. `MCP_PORT=4000` is `"4000"`, not `4000`. See AGENTS.md.
 */
export const env = validate(schema, { ...process.env }, { coerceTypes: true })

/**
 * Runner settings derived from {@link env} — the standard way to configure a service
 * here. Note this carries the *entire* process environment along, not just the schema's
 * declared keys (`additionalProperties: true` in `createEnv`'s schema lets any var
 * through), which matters if `settings` is ever exposed somewhere with broader
 * visibility than this process itself.
 */
export const settings = Object.assign({}, env, {})
