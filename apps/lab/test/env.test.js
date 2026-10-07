import { describe, test, expect, afterEach } from 'bun:test'

// env.js computes `env`/`settings` once at import time from `process.env`, so each
// scenario needs its own env snapshot and its own module instance (a `?run=` cache-buster
// forces Bun to re-evaluate the module instead of returning the first import's result).
const ENV_KEYS = ['EMPYRIA_PROMETHEUS_PORT', 'LAB_METRICS_ENABLED', 'LAB_TRACING_ENABLED', 'RESET']
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))
let run = 0

async function loadEnv(overrides = {}) {
	for (const key of ENV_KEYS) delete process.env[key]
	Object.assign(process.env, overrides)
	return import(`../env.js?run=${run++}`)
}

afterEach(() => {
	for (const key of ENV_KEYS) {
		if (originalEnv[key] === undefined) delete process.env[key]
		else process.env[key] = originalEnv[key]
	}
})

describe('apps/lab env.js', () => {
	test('fills in the shared Empyria defaults, correctly typed, when nothing is set', async () => {
		const { env } = await loadEnv()
		expect(env.EMPYRIA_PROMETHEUS_PORT).toBe(3030)
		expect(env.LAB_METRICS_ENABLED).toBe(true)
		expect(env.LAB_TRACING_ENABLED).toBe(true)
		// bun test sets NODE_ENV=test itself; 'local' is nodeEnv()'s default but NODE_ENV
		// is never actually unset here, so the accurate expectation is the runner's value.
		expect(env.NODE_ENV).toBe('test')
		expect(env.RESET).toBe(false)
	})

	test('coerces explicitly-set string env vars to their schema types', async () => {
		// Regression test: process.env values are always strings — `PORT=4040` arrives as
		// `"4040"`, not `4040`. Without `coerceTypes: true` this throws instead of parsing.
		const { env } = await loadEnv({
			EMPYRIA_PROMETHEUS_PORT: '4040',
			LAB_METRICS_ENABLED: 'false',
			RESET: 'true',
		})
		expect(env.EMPYRIA_PROMETHEUS_PORT).toBe(4040)
		expect(typeof env.EMPYRIA_PROMETHEUS_PORT).toBe('number')
		expect(env.LAB_METRICS_ENABLED).toBe(false)
		expect(env.RESET).toBe(true)
	})

	test('does not mutate the real process.env', async () => {
		// Regression test: validating process.env directly (instead of a copy) lets
		// useDefaults write real numbers/booleans onto it, which Node silently stringifies
		// back — corrupting the very values validation just filled in.
		delete process.env.EMPYRIA_PROMETHEUS_PORT
		await loadEnv()
		expect(process.env.EMPYRIA_PROMETHEUS_PORT).toBeUndefined()
	})

	test('settings mirrors the metrics/tracing enabled flags from env', async () => {
		const { settings } = await loadEnv({
			LAB_METRICS_ENABLED: 'false',
			LAB_TRACING_ENABLED: 'true',
		})
		expect(settings.metrics).toEqual({ enabled: false })
		expect(settings.tracing).toEqual({ enabled: true })
	})
})
