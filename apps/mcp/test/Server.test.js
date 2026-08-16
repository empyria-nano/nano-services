import { describe, test, expect } from 'bun:test'
import { InMemoryTransport } from '@modelcontextprotocol/server'
import { Client } from '@modelcontextprotocol/client'
import { createMcpServer, serveMcpHttp, connectHttpClient } from '@principia/mcp'
import { services, setup } from '../services/Server.js'
import Library from '../services/Library.js'
import LibraryAdmin, { GUARD_TOKEN_HEADER } from '../services/LibraryAdmin.js'

// setup() calls serveMcpHttp, which binds env.MCP_PORT for real — not exercised live
// here. createMcpServer + InMemoryTransport binds no real network resource, so unlike
// Restate's setupRestate or Moleculer's AgentService, it's safe to drive live here with
// a real MCP Client, matching principia-guard-mcp's own test convention. See AGENTS.md.
async function connected() {
	const server = createMcpServer({ name: 'test-server', version: '1.0.0', services })
	const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
	await server.connect(serverTransport)
	const client = new Client({ name: 'test-client', version: '1.0.0' })
	await client.connect(clientTransport)
	return client
}

describe('Server.js', () => {
	test('publishes Library and LibraryAdmin', () => {
		expect(services).toEqual([Library, LibraryAdmin])
	})

	test('exports setup without starting anything at import time', () => {
		expect(typeof setup).toBe('function')
	})

	test('registers every action as an MCP tool end to end', async () => {
		const client = await connected()
		const { tools } = await client.listTools()
		const names = tools.map((t) => t.name).sort()
		expect(names).toEqual([
			'Library.addBook',
			'Library.getBook',
			'Library.listBooks',
			'LibraryAdmin.resetLibrary',
		])
	})

	test('a full add-then-get round trip works through the real MCP protocol', async () => {
		const client = await connected()

		const added = await client.callTool({
			name: 'Library.addBook',
			arguments: { title: 'Snow Crash', author: 'Neal Stephenson' },
		})
		expect(added.isError).toBeFalsy()
		const book = JSON.parse(added.content[0].text)
		expect(book).toMatchObject({ title: 'Snow Crash', author: 'Neal Stephenson' })

		const fetched = await client.callTool({
			name: 'Library.getBook',
			arguments: { id: book.id },
		})
		expect(JSON.parse(fetched.content[0].text)).toEqual(book)
	})

	test('getBook for an unknown id is a tool error, not a thrown protocol error', async () => {
		const client = await connected()
		const result = await client.callTool({ name: 'Library.getBook', arguments: { id: 'nope' } })
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('No book found')
	})

	test('LibraryAdmin.resetLibrary is unreachable with no HTTP context (InMemoryTransport)', async () => {
		// Guarding is enforced by reading an HTTP request header — InMemoryTransport (like
		// stdio) has no such thing, so a guarded action always rejects here, regardless of
		// token, proving the "guard only works over HTTP" behavior AGENTS.md documents.
		const client = await connected()
		const result = await client.callTool({ name: 'LibraryAdmin.resetLibrary', arguments: {} })
		expect(result.isError).toBe(true)
		expect(result.content[0].text).toContain('missing auth token')
	})
})

describe('guard: { tokenHeader } over real HTTP', () => {
	// Proves Server.js's guard: { tokenHeader: GUARD_TOKEN_HEADER } wiring actually works —
	// InMemoryTransport can't, since token headers require a real HTTP request. Uses its
	// own throwaway service (not the real Library/LibraryAdmin singletons, which hold
	// shared module state other test files depend on) on an OS-assigned ephemeral port
	// (port: 0), closed at the end of each test.
	const TOKEN = 'test-admin-token'
	const GuardedService = {
		name: 'Guarded',
		async resolveToken(tokenKey) {
			return tokenKey === TOKEN ? { name: 'admin' } : undefined
		},
		actions: {
			ping: async () => 'pong',
		},
	}

	async function withGuardedServer(fn) {
		const server = serveMcpHttp(
			{
				name: 'guard-test',
				version: '1.0.0',
				services: [GuardedService],
				guard: { tokenHeader: GUARD_TOKEN_HEADER },
			},
			{ port: 0 },
		)
		try {
			await fn(`http://localhost:${server.port}`)
		} finally {
			await server.close()
		}
	}

	test('a valid token on the configured header is accepted', async () => {
		await withGuardedServer(async (url) => {
			const client = await connectHttpClient({
				name: 'c',
				version: '1.0.0',
				url,
				headers: { [GUARD_TOKEN_HEADER]: TOKEN },
			})
			const result = await client.callTool({ name: 'Guarded.ping', arguments: {} })
			expect(result.isError).toBeFalsy()
			expect(result.content[0].text).toBe('pong')
		})
	})

	test('no token is rejected', async () => {
		await withGuardedServer(async (url) => {
			const client = await connectHttpClient({ name: 'c', version: '1.0.0', url })
			const result = await client.callTool({ name: 'Guarded.ping', arguments: {} })
			expect(result.isError).toBe(true)
			expect(result.content[0].text).toContain('missing auth token')
		})
	})

	test('the wrong token is rejected', async () => {
		await withGuardedServer(async (url) => {
			const client = await connectHttpClient({
				name: 'c',
				version: '1.0.0',
				url,
				headers: { [GUARD_TOKEN_HEADER]: 'wrong' },
			})
			const result = await client.callTool({ name: 'Guarded.ping', arguments: {} })
			expect(result.isError).toBe(true)
			expect(result.content[0].text).toContain('invalid auth token')
		})
	})

	test('a token on the wrong header (e.g. the default "authorization") is rejected', async () => {
		await withGuardedServer(async (url) => {
			const client = await connectHttpClient({
				name: 'c',
				version: '1.0.0',
				url,
				token: TOKEN,
			})
			const result = await client.callTool({ name: 'Guarded.ping', arguments: {} })
			expect(result.isError).toBe(true)
		})
	})
})
