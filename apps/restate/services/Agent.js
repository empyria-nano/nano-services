import { defineService } from '@principia/restate'

/**
 * Restate service standing in for an "agent" capability. There's no built-in "agent"
 * primitive in `@restatedev/restate-sdk` (checked directly against the installed
 * `1.6.x` package) — an agent here is just a regular Restate service, the same
 * construct as `HelloService`. `ask` is a stub: it echoes the question back rather
 * than calling a real model, so this file has zero external dependencies until
 * someone wires one up.
 */
export const AgentService = defineService({
	name: 'AgentService',
	handlers: {
		/**
		 * @param {import('@restatedev/restate-sdk').Context} ctx
		 * @param {{question: string}} input
		 * @returns {Promise<{answer: string}>}
		 */
		ask: async (ctx, { question }) => {
			// TODO: replace with a real model call. Kept synchronous/deterministic for
			// now since Restate handlers must be safe to replay.
			return { answer: `You asked: "${question}" — stub agent, no model wired up yet.` }
		},
	},
})
