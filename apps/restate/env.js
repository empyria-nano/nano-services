import { createEnv, validate, number, string } from '@empyria/common'

/**
 * Environment schema for the `restate` app: the Empyria-wide defaults from
 * {@link createEnv} plus everything `services/Server.js` needs to register this
 * endpoint's services with a running Restate server.
 */
const schema = createEnv({
	RESTATE_ADMIN_URL: string('http://localhost:9070'),
	RESTATE_HOST: string('0.0.0.0'),
	RESTATE_PORT: number(8100),
	RESTATE_HEALTH_PORT: number(8101),
})

/**
 * Validated environment for this process.
 *
 * Validates a *copy* of `process.env`, not `process.env` itself — `validate`'s
 * `useDefaults` mutates its input in place, and writing a real number/boolean onto
 * `process.env` directly gets silently stringified by Node (env vars are string-only),
 * which then fails re-validation. `coerceTypes: true` is required for the same reason:
 * every value actually *set* in the environment (not just defaulted) arrives as a
 * string, e.g. `RESTATE_PORT=9100` is `"9100"`, not `9100`. See AGENTS.md.
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
