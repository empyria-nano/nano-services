import { describe, test, expect, afterEach } from 'bun:test'

// env.js computes `env`/`settings` once at import time from `process.env`, so each
// scenario needs its own env snapshot and its own module instance (a `?run=` cache-buster
// forces Bun to re-evaluate the module instead of returning the first import's result).
const ENV_KEYS = ['RESTATE_ADMIN_URL', 'RESTATE_HOST', 'RESTATE_PORT', 'RESTATE_HEALTH_PORT']
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

describe('apps/restate env.js', () => {
	test('defaults to a local Restate server on the standard admin port', async () => {
		const { env } = await loadEnv()
		expect(env.RESTATE_ADMIN_URL).toBe('http://localhost:9070')
		expect(env.RESTATE_HOST).toBe('0.0.0.0')
		expect(env.RESTATE_PORT).toBe(8100)
		expect(env.RESTATE_HEALTH_PORT).toBe(8101)
	})

	test('coerces explicitly-set numeric env vars to numbers', async () => {
		// Regression test: process.env values are always strings — RESTATE_PORT=9100
		// arrives as "9100", not 9100. Without coerceTypes: true this throws instead.
		const { env } = await loadEnv({ RESTATE_PORT: '9100', RESTATE_HEALTH_PORT: '9101' })
		expect(env.RESTATE_PORT).toBe(9100)
		expect(typeof env.RESTATE_PORT).toBe('number')
		expect(env.RESTATE_HEALTH_PORT).toBe(9101)
	})

	test('honors an explicitly-set admin URL', async () => {
		const { env } = await loadEnv({ RESTATE_ADMIN_URL: 'http://restate.internal:9070' })
		expect(env.RESTATE_ADMIN_URL).toBe('http://restate.internal:9070')
	})

	test('does not mutate the real process.env', async () => {
		delete process.env.RESTATE_PORT
		await loadEnv()
		expect(process.env.RESTATE_PORT).toBeUndefined()
	})
})
