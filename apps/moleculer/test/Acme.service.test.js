import { describe, test, expect, afterEach } from 'bun:test'
import { ServiceBroker } from 'moleculer'
import Acme from '../services/Acme.service.js'
import { settings } from '../env.js'
import { PRINCIPIA_FEDERATION_ID, MOLECULER_SERVICE_ROLE } from '@empyria/common'

// Acme.service.js only uses BaseMixin (no real network/HTTP I/O), so — unlike
// Lab.service.js's AgentService — it's safe to start with a real in-process ServiceBroker.
let broker

afterEach(async () => {
	if (broker?.started) await broker.stop()
})

describe('Acme.service.js', () => {
	test('settings is the env-derived settings object', () => {
		expect(Acme.settings).toEqual(settings)
	})

	test('starts under a broker and gets a Principia meta stamped via BaseMixin', async () => {
		broker = new ServiceBroker({ logLevel: 'fatal', nodeID: 'acme-service-test' })
		broker.createService(Acme)
		await broker.start()

		const svc = broker.getLocalService({ name: 'Acme', version: Acme.version })
		expect(svc.meta.user.actor).toBe('Acme-service')
		expect(svc.meta.user.federation).toBe(PRINCIPIA_FEDERATION_ID)
		expect(svc.meta.user.role).toBe(MOLECULER_SERVICE_ROLE)

		expect(await broker.call('v1.Acme.packageVersion')).toEqual({
			version: svc.packageVersion(),
		})
	})
})
