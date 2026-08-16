import { defineService } from '@principia/restate'

/**
 * Stateless Restate service exposing a single `hello` handler. The minimal example of
 * a plain Restate service — no state, no cross-service calls.
 */
export const HelloService = defineService({
	name: 'HelloService',
	handlers: {
		/**
		 * @param {import('@restatedev/restate-sdk').Context} ctx
		 * @param {{name: string}} input
		 * @returns {Promise<{greeting: string}>}
		 */
		hello: async (ctx, { name }) => {
			return { greeting: `Hello, ${name}!` }
		},
	},
})
