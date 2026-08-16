import { createEnv, validate, number } from '@empyria/common'

/**
 * Environment schema for the `acme` app: the Principia-wide defaults from
 * {@link createEnv} plus this service's Prometheus port.
 */
const schema = createEnv({
	PRINCIPIA_PROMETHEUS_PORT: number(3031),
})

/**
 * Validated environment for this process.
 *
 * Validates a *copy* of `process.env`, not `process.env` itself — `validate`'s
 * `useDefaults` mutates its input in place, and writing a real number/boolean onto
 * `process.env` directly gets silently stringified by Node (env vars are string-only),
 * which then fails re-validation. `coerceTypes: true` is required for the same reason:
 * every value actually *set* in the environment (not just defaulted) arrives as a
 * string, e.g. `PRINCIPIA_PROMETHEUS_PORT=4040` is `"4040"`, not `4040`. See AGENTS.md.
 */
export const env = validate(schema, { ...process.env }, { coerceTypes: true })

/**
 * Runner settings derived from {@link env}. Currently a straight copy — add cherry-picked
 * fields here as this app grows, the way `apps/lab/env.js` does for metrics/tracing.
 * Don't assign this object wholesale as a Moleculer service's `settings`: it carries the
 * rest of the process environment along (`additionalProperties: true` in the schema), and
 * Moleculer settings are visible via runtime introspection — see `Acme.service.js`.
 */
export const settings = Object.assign({}, env, {})
