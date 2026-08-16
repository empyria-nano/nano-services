import { describe, test, expect } from 'bun:test'
import { services, setup } from '../services/Server.js'
import { HelloService } from '../services/Services.js'
import { AgentService } from '../services/Agent.js'
import { StorageObject } from '../services/VirtualObject.js'
import { AcmeWorkflow } from '../services/Workflow.js'

// setupRestate binds a real HTTP/2 server and a health-check port, and registers the
// deployment with a (presumably not running, in a test) Restate admin API — so this
// only asserts the declarative shape this module wires up, never calling setup(). See
// AGENTS.md's testing philosophy.
describe('Server.js', () => {
	test('binds every definition this app exports', () => {
		expect(services).toEqual([HelloService, AgentService, StorageObject, AcmeWorkflow])
	})

	test('exports setup without starting anything at import time', () => {
		expect(typeof setup).toBe('function')
	})
})
