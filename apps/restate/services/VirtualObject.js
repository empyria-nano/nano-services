import { restate, defineObject } from '@principia/restate'

const VALUE_STATE_NAME = 'value'

/**
 * Restate virtual object holding a single piece of durable, per-key state. Each object
 * instance (addressed by its key) has its own independent `value` — set it via `set`,
 * read it back via `get`.
 */
export const StorageObject = defineObject({
	name: 'StorageObject',
	handlers: {
		/**
		 * @param {import('@restatedev/restate-sdk').ObjectContext} ctx
		 * @param {*} value - Anything JSON-serializable.
		 * @returns {Promise<void>}
		 */
		set: async (ctx, value) => {
			ctx.set(VALUE_STATE_NAME, value)
		},

		/**
		 * Shared (read-only, concurrently-callable) handler — doesn't need exclusive
		 * access to the object's state the way `set` does.
		 * @param {import('@restatedev/restate-sdk').ObjectSharedContext} ctx
		 * @returns {Promise<*>} Whatever was last stored via `set`, or `undefined`.
		 */
		get: restate.handlers.object.shared(async (ctx) => {
			return await ctx.get(VALUE_STATE_NAME)
		}),
	},
})
