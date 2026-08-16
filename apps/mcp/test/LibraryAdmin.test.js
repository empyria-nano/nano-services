import { describe, test, expect } from 'bun:test'
import LibraryAdmin from '../services/LibraryAdmin.js'
import { env } from '../env.js'

describe('LibraryAdmin.resolveToken', () => {
	test('resolves a user for the configured admin token', async () => {
		expect(await LibraryAdmin.resolveToken(env.MCP_ADMIN_TOKEN)).toEqual({ name: 'admin' })
	})

	test('rejects any other token', async () => {
		expect(await LibraryAdmin.resolveToken('wrong')).toBeUndefined()
		expect(await LibraryAdmin.resolveToken('')).toBeUndefined()
	})
})

describe('LibraryAdmin.resetLibrary', () => {
	test('reports who cleared the library, from extra.user set by resolveToken', async () => {
		const result = await LibraryAdmin.actions.resetLibrary.handler(
			{},
			{ user: { name: 'admin' } },
		)
		expect(result).toEqual({ cleared: true, by: 'admin' })
	})
})
