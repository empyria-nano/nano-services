import { describe, test, expect, afterEach } from 'bun:test'

// env.js computes `env`/`settings` once at import time from `process.env`, so each
// scenario needs its own env snapshot and its own module instance (a `?run=` cache-buster
// forces Bun to re-evaluate the module instead of returning the first import's result).
const ENV_KEYS = ['PRINCIPIA_PROMETHEUS_PORT']
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

describe('apps/acme env.js', () => {
	test('defaults PRINCIPIA_PROMETHEUS_PORT to 3031', async () => {
		const { env } = await loadEnv()
		expect(env.PRINCIPIA_PROMETHEUS_PORT).toBe(3031)
	})

	test('coerces an explicitly-set string port to a number', async () => {
		// Regression test: process.env values are always strings — `PORT=5050` arrives as
		// `"5050"`, not `5050`. Without `coerceTypes: true` this throws instead of parsing.
		const { env } = await loadEnv({ PRINCIPIA_PROMETHEUS_PORT: '5050' })
		expect(env.PRINCIPIA_PROMETHEUS_PORT).toBe(5050)
		expect(typeof env.PRINCIPIA_PROMETHEUS_PORT).toBe('number')
	})

	test('does not mutate the real process.env', async () => {
		delete process.env.PRINCIPIA_PROMETHEUS_PORT
		await loadEnv()
		expect(process.env.PRINCIPIA_PROMETHEUS_PORT).toBeUndefined()
	})

	test('settings is a plain copy of env', async () => {
		const { env, settings } = await loadEnv()
		expect(settings).toEqual(env)
	})
})
