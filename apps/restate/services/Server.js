import { setupRestate } from '@empyria/restate'

import { env } from '../env.js'

import { HelloService } from './Services.js'
import { AgentService } from './Agent.js'
import { StorageObject } from './VirtualObject.js'
import { AcmeWorkflow } from './Workflow.js'

const shutdownCallbackFn = async () => {
	console.log('Shutting down...')
}
const registrationCallbackFn = async () => {
	console.log('Registration callback...')
}

/**
 * Every service/object/workflow this endpoint binds. Exported on its own (separate from
 * {@link setup}) so it can be asserted against in a test without starting a real
 * HTTP/2 server — `setupRestate` binds real ports, so it's deliberately not exercised
 * live in tests. See AGENTS.md.
 */
export const services = [HelloService, AgentService, StorageObject, AcmeWorkflow]

/**
 * Starts this process's Restate endpoint (binding every definition in {@link services})
 * and registers it with the Restate server's admin API. Exported (rather than run
 * unconditionally) so this module can be imported without side effects, and only
 * actually starts the endpoint when this file is run directly.
 * @returns {Promise<import('@empyria/restate').RestateServer>}
 */
export const setup = async () => {
	return await setupRestate({
		restateAdminURL: env.RESTATE_ADMIN_URL,
		host: env.RESTATE_HOST,
		port: env.RESTATE_PORT,
		healthPort: env.RESTATE_HEALTH_PORT,
		services,
		shutdownCallbackFn,
		registrationCallbackFn,
	})
}

if (import.meta.main) {
	await setup()
}
