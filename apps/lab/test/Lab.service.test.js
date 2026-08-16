import { describe, test, expect } from 'bun:test'
import { AgentService } from '@moleculer/lab'
import service from '../services/Lab.service.js'

// Lab.service.js's `AgentService` mixin binds a real HTTP port for the Laboratory
// dashboard on Moleculer's `started` lifecycle hook, so this only checks the service's
// declarative shape — it never calls broker.start(). See AGENTS.md.
describe('Lab.service.js', () => {
	test('mixes in AgentService', () => {
		expect(service.mixins).toContain(AgentService)
	})

	test('keeps its own settings empty (env-derived config only feeds metrics/tracing)', () => {
		expect(service.settings).toEqual({})
	})

	test('metrics/tracing enabled flags come from env.js settings', async () => {
		const { settings } = await import('../env.js')
		expect(service.metrics.enabled).toBe(settings.metrics.enabled)
		expect(service.tracing.enabled).toBe(settings.tracing.enabled)
	})

	test('metrics/tracing use the Laboratory exporter', () => {
		expect(service.metrics.exporter).toBe('Laboratory')
		expect(service.tracing.exporter).toBe('Laboratory')
	})

	test('forwards logs to the Laboratory dashboard alongside the console', () => {
		expect(service.logger.some((entry) => entry === 'Laboratory')).toBe(true)
		expect(service.logger.some((entry) => entry?.type === 'Console')).toBe(true)
	})
})
