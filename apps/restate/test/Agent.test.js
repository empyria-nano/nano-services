import { describe, test, expect } from 'bun:test'
import { AgentService } from '../services/Agent.js'

describe('AgentService.ask', () => {
	test('echoes the question back (stub — no model wired up yet)', async () => {
		const result = await AgentService.service.ask(
			{},
			{ question: 'life, universe, everything' },
		)
		expect(result.answer).toContain('life, universe, everything')
	})
})
