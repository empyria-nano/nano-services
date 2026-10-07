import { describe, test, expect } from 'bun:test'
import { HelloService } from '../services/Services.js'

describe('HelloService.hello', () => {
	test('greets the given name', async () => {
		const result = await HelloService.service.hello({}, { name: 'World' })
		expect(result).toEqual({ greeting: 'Hello, World!' })
	})
})
