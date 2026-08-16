import { describe, test, expect } from 'bun:test'
import { AcmeWorkflow } from '../services/Workflow.js'
import { HelloService } from '../services/Services.js'
import { AgentService } from '../services/Agent.js'
import { StorageObject } from '../services/VirtualObject.js'

// ctx.serviceClient/ctx.objectClient are bound to a *definition object* at compile
// time (see AGENTS.md and CallerServiceDef's own docs in @principia/restate for why
// dynamic-by-name dispatch needs a different construct) — the mock below dispatches on
// object identity against the actual imported definitions, the same way real Restate
// client typing does.
function makeCtx({ key = 'run-1' } = {}) {
	const stored = []
	return {
		key,
		stored,
		serviceClient(def) {
			if (def === HelloService) {
				return { hello: async ({ name }) => ({ greeting: `Hello, ${name}!` }) }
			}
			if (def === AgentService) {
				return { ask: async ({ question }) => ({ answer: `stub answer to ${question}` }) }
			}
			throw new Error(`unexpected serviceClient definition: ${def?.name}`)
		},
		objectClient(def, key) {
			if (def === StorageObject) {
				return {
					set: async (value) => stored.push({ key, value }),
				}
			}
			throw new Error(`unexpected objectClient definition: ${def?.name}`)
		},
	}
}

describe('AcmeWorkflow.run', () => {
	test('calls the service and the agent, then stores both results keyed by the run', async () => {
		const ctx = makeCtx({ key: 'run-1' })

		const result = await AcmeWorkflow.workflow.run(ctx, {
			name: 'World',
			question: 'life, universe, everything',
		})

		expect(result).toEqual({
			greeting: 'Hello, World!',
			answer: 'stub answer to life, universe, everything',
		})
		expect(ctx.stored).toEqual([{ key: 'run-1', value: result }])
	})

	test('stores under this run instance own key, not a shared one', async () => {
		const ctx = makeCtx({ key: 'run-2' })
		await AcmeWorkflow.workflow.run(ctx, { name: 'Bob', question: 'q' })
		expect(ctx.stored[0].key).toBe('run-2')
	})
})
