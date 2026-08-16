import { describe, test, expect, afterEach } from 'bun:test'

// env.js computes `env`/`settings` once at import time from `process.env`, so each
// scenario needs its own env snapshot and its own module instance (a `?run=` cache-buster
// forces Bun to re-evaluate the module instead of returning the first import's result).
const ENV_KEYS = ['MCP_SERVICE_NAME', 'MCP_SERVICE_VERSION', 'MCP_PORT']
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

describe('apps/mcp env.js', () => {
	test('defaults to MCP-Server 1.0.0 on port 3032', async () => {
		const { env } = await loadEnv()
		expect(env.MCP_SERVICE_NAME).toBe('MCP-Server')
		expect(env.MCP_SERVICE_VERSION).toBe('1.0.0')
		expect(env.MCP_PORT).toBe(3032)
	})

	test('coerces an explicitly-set string port to a number', async () => {
		// Regression test: process.env values are always strings — MCP_PORT=4000 arrives
		// as "4000", not 4000. Without coerceTypes: true this throws instead of parsing.
		const { env } = await loadEnv({ MCP_PORT: '4000' })
		expect(env.MCP_PORT).toBe(4000)
		expect(typeof env.MCP_PORT).toBe('number')
	})

	test('honors an explicitly-set service name/version', async () => {
		const { env } = await loadEnv({ MCP_SERVICE_NAME: 'Custom', MCP_SERVICE_VERSION: '2.0.0' })
		expect(env.MCP_SERVICE_NAME).toBe('Custom')
		expect(env.MCP_SERVICE_VERSION).toBe('2.0.0')
	})

	test('does not mutate the real process.env', async () => {
		delete process.env.MCP_PORT
		await loadEnv()
		expect(process.env.MCP_PORT).toBeUndefined()
	})
})
