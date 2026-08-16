import { createEnv, validate, number, bool } from '@empyria/common'

/**
 * Environment schema for the `lab` app: the Principia-wide defaults from
 * {@link createEnv} plus the Prometheus port and metrics/tracing toggles for the
 * `@moleculer/lab` dashboard.
 */
const schema = createEnv({
	PRINCIPIA_PROMETHEUS_PORT: number(3030),
	LAB_METRICS_ENABLED: bool(true),
	LAB_TRACING_ENABLED: bool(true),
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
 * Runner settings derived from {@link env}. Only exposes the specific values `moleculer.
 * config.js` needs (metrics/tracing enabled flags) rather than the full `env` object, since
 * Moleculer settings can be surfaced via runtime introspection and `env` carries the rest
 * of the process environment along (`additionalProperties: true` in the schema).
 */
export const settings = Object.assign({}, env, {
	metrics: {
		enabled: env.LAB_METRICS_ENABLED,
	},
	tracing: {
		enabled: env.LAB_TRACING_ENABLED,
	},
})
