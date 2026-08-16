import { BaseMixin } from '@empyria/moleculer'

import { settings } from '../env.js'

/**
 * Acme microservice. Currently a starter scaffold: no custom actions/events yet, wired
 * up with {@link BaseMixin} for the Principia meta-stamping and `packageVersion` action.
 *
 * `settings` is the env-derived object from `../env.js` — the standard way to configure
 * a Moleculer service here. Note that it currently carries the *entire* process
 * environment, not just the schema's declared keys (`additionalProperties: true` in
 * `createEnv`'s schema lets any var through), and Moleculer exposes a service's
 * `settings` via runtime introspection — worth keeping in mind if this service ever
 * runs somewhere its introspection is reachable by anything other services trust.
 */
export default {
	name: 'Acme',
	version: 1.0,

	mixins: [BaseMixin],

	settings,

	dependencies: [],
	async started() {},
	async stopped() {},

	methods: {},

	events: {},

	actions: {},
}
