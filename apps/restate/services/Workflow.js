import { defineWorkflow } from '@principia/restate'
import { HelloService } from './Services.js'
import { AgentService } from './Agent.js'
import { StorageObject } from './VirtualObject.js'

/**
 * `Acme` workflow: calls {@link HelloService} and {@link AgentService}, then persists
 * both results into a {@link StorageObject} instance keyed by this workflow run's own
 * ID (`ctx.key`) — the canonical example of a workflow orchestrating a plain service, an
 * agent-style service, and a virtual object together.
 *
 * A workflow must have exactly one `run` handler, taking a `WorkflowContext` — see
 * `@restatedev/restate-sdk`'s `workflow()` docs.
 */
export const AcmeWorkflow = defineWorkflow({
	name: 'Acme',
	handlers: {
		/**
		 * @param {import('@restatedev/restate-sdk').WorkflowContext} ctx
		 * @param {{name: string, question: string}} input
		 * @returns {Promise<{greeting: string, answer: string}>}
		 */
		run: async (ctx, { name, question }) => {
			const { greeting } = await ctx.serviceClient(HelloService).hello({ name })
			const { answer } = await ctx.serviceClient(AgentService).ask({ question })

			await ctx.objectClient(StorageObject, ctx.key).set({ greeting, answer })

			return { greeting, answer }
		},
	},
})
