import { describe, test, expect } from 'bun:test'
import { StorageObject } from '../services/VirtualObject.js'

function makeCtx({ existing } = {}) {
	const sets = []
	return {
		sets,
		get: async () => existing,
		set: (key, value) => sets.push([key, value]),
	}
}

describe('StorageObject.set', () => {
	test('stores the given value under this object instance', async () => {
		const ctx = makeCtx()
		await StorageObject.object.set(ctx, { answer: 42 })
		expect(ctx.sets).toEqual([['value', { answer: 42 }]])
	})
})

describe('StorageObject.get', () => {
	test('returns whatever was last stored', async () => {
		const ctx = makeCtx({ existing: { answer: 42 } })
		expect(await StorageObject.object.get(ctx)).toEqual({ answer: 42 })
	})

	test('returns undefined when nothing has been stored yet', async () => {
		const ctx = makeCtx()
		expect(await StorageObject.object.get(ctx)).toBeUndefined()
	})
})
