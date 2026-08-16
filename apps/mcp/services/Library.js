import { randomUUID } from 'node:crypto'
import { string } from '@principia/common'

/** In-memory book store — resets on every process restart. */
const books = new Map()

/**
 * Clears the book store. Not exposed as an MCP tool by this service — see
 * `LibraryAdmin.js`, which wraps this behind a token-guarded action.
 */
export function clearLibrary() {
	books.clear()
}

/**
 * Simple in-memory "Library" MCP service — the MCP equivalent of a Moleculer service:
 * a plain `{ name, actions }` object (see `@principia/mcp`'s `ServiceDef`), where every
 * action becomes an MCP tool named `"Library.<actionName>"`.
 */
export default {
	name: 'Library',

	actions: {
		/**
		 * @param {{title: string, author: string}} params
		 * @returns {{id: string, title: string, author: string}} The newly stored book.
		 */
		addBook: {
			description: 'Add a book to the library',
			params: { title: string(), author: string() },
			handler: async ({ title, author }) => {
				const book = { id: randomUUID(), title, author }
				books.set(book.id, book)
				return book
			},
		},

		/**
		 * @param {{id: string}} params
		 * @returns {{id: string, title: string, author: string}}
		 * @throws {Error} If no book exists with the given `id`.
		 */
		getBook: {
			description: 'Look up a single book by ID',
			params: { id: string() },
			handler: async ({ id }) => {
				const book = books.get(id)
				if (!book) throw new Error(`No book found with id "${id}"`)
				return book
			},
		},

		/**
		 * Bare-function action — no params, no description; the library's whole catalog.
		 * @returns {Array<{id: string, title: string, author: string}>}
		 */
		listBooks: async () => Array.from(books.values()),
	},
}
