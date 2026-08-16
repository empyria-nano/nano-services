import { describe, test, expect } from 'bun:test'
import config from '../moleculer.config.js'
import { env } from '../env.js'

describe('apps/lab moleculer.config.js', () => {
	test('runs in the Principia namespace with a unique per-process node ID', () => {
		expect(config.namespace).toBe('Principia')
		expect(config.nodeID).toMatch(/^Server-/)
	})

	test('log level and Pino destination come from env, falling back to sane defaults', () => {
		expect(config.logLevel).toBe(env.LOG_LEVEL || 'info')
		const pinoLogger = config.logger.find((entry) => entry.type === 'Pino')
		expect(pinoLogger.options.pino.destination).toBe(env.LOG_FILE || './tmp/moleculer.log')
	})

	test('Prometheus metrics reporter listens on the configured port', () => {
		expect(config.metrics.reporter.options.port).toBe(Number(env.PRINCIPIA_PROMETHEUS_PORT))
	})

	test('registers the MetaGuard middleware', () => {
		expect(config.middlewares.some((mw) => mw.name === 'MetaGuard')).toBe(true)
	})

	test('cacher is disabled unless MOLECULER_CACHE_ENABLED is set', () => {
		if (env.MOLECULER_CACHE_ENABLED) {
			expect(config.cacher.type).toBe('Redis')
		} else {
			expect(config.cacher).toBeFalsy()
		}
	})
})
