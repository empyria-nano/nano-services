import { describe, test, expect } from 'bun:test'
import Library from '../services/Library.js'

// The library's book store is module-level, shared state — these tests avoid asserting
// on the *whole* collection (which would depend on test execution order) and instead
// check the specific book each test itself created.

describe('Library.addBook', () => {
	test('stores a book and returns it with a generated id', async () => {
		const book = await Library.actions.addBook.handler({
			title: 'Dune',
			author: 'Frank Herbert',
		})
		expect(book).toMatchObject({ title: 'Dune', author: 'Frank Herbert' })
		expect(typeof book.id).toBe('string')
		expect(book.id.length).toBeGreaterThan(0)
	})

	test('two books get distinct ids', async () => {
		const a = await Library.actions.addBook.handler({ title: 'A', author: 'X' })
		const b = await Library.actions.addBook.handler({ title: 'B', author: 'Y' })
		expect(a.id).not.toBe(b.id)
	})
})

describe('Library.getBook', () => {
	test('returns a previously added book by id', async () => {
		const added = await Library.actions.addBook.handler({
			title: 'Foundation',
			author: 'Asimov',
		})
		const fetched = await Library.actions.getBook.handler({ id: added.id })
		expect(fetched).toEqual(added)
	})

	test('throws for an unknown id', async () => {
		await expect(Library.actions.getBook.handler({ id: 'does-not-exist' })).rejects.toThrow(
			/No book found/,
		)
	})
})

describe('Library.listBooks', () => {
	test('includes a book after it is added', async () => {
		const added = await Library.actions.addBook.handler({
			title: 'Neuromancer',
			author: 'Gibson',
		})
		const all = await Library.actions.listBooks()
		expect(all).toContainEqual(added)
	})
})
