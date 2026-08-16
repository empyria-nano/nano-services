import { AgentService } from '@moleculer/lab'

import { settings } from '../env.js'

/**
 * Lab microservice: wires up `@moleculer/lab`'s `AgentService`, which serves the
 * Laboratory monitoring dashboard (binds its own HTTP server on start — see
 * `AGENTS.md` for why this service is deliberately not unit-tested with a live broker).
 *
 * `settings` stays `{}`; only the specific `metrics`/`tracing` enabled flags are pulled
 * out of `../env.js`'s `settings`, not the whole object — see that file's docs for why.
 */
export default {
	mixins: [AgentService],
	settings: {},
	metrics: {
		enabled: settings.metrics.enabled,
		exporter: 'Laboratory',
	},
	tracing: {
		enabled: settings.tracing.enabled,
		exporter: 'Laboratory',
	},
	logger: [
		{
			type: 'Console',
			options: {},
		},
		'Laboratory',
	],
}
