import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assertBlocks, assertZineShape } from './shape'
import { createBlock } from './widgets'

function fails(fn: () => unknown, match: RegExp) {
  assert.throws(fn, (err: unknown) => err instanceof Error && match.test(err.message))
}

function heading() {
  return createBlock('heading', 'miles')
}

test('assertBlocks accepts a recipe-valid heading', () => {
  const block = heading()
  const [out] = assertBlocks([block])
  assert.equal(out.id, block.id)
  assert.equal(out.type, 'heading')
})

test('assertBlocks rejects a non-array, an unknown type, and a missing field', () => {
  fails(() => assertBlocks({}), /blocks must be an array/)
  fails(() => assertBlocks([{ id: 'x', type: 'not-a-widget' }]), /known widget/)
  fails(() => assertBlocks([{ id: 'x', type: 'heading', text: 'ok' }]), /size/)
})

test('assertBlocks keeps a valid looks stack and drops an empty one', () => {
  const block = heading()
  const looks = [{ label: 'city', bag: { ink: 'city ink' }, linked: true, overridden: ['ink'] }]
  const [kept] = assertBlocks([{ ...block, looks }])
  assert.deepEqual(kept.looks, looks)
  const [plain] = assertBlocks([{ ...block, looks: [] }])
  assert.equal(plain.looks, undefined)
})

test('assertBlocks rejects a look bag with a non-numeric trim field', () => {
  const block = heading()
  fails(
    () => assertBlocks([{ ...block, looks: [{ label: 'tilt', bag: { tilt: 'sideways' } }] }]),
    /looks\[0\]\.bag\.tilt must be a finite number/,
  )
})

test('assertZineShape accepts a minimal issue and fills defaults', () => {
  const zine = assertZineShape({ title: 'untitled issue', vibe: 'gwen', blocks: [] })
  assert.equal(zine.title, 'untitled issue')
  assert.equal(zine.vibe, 'gwen')
  assert.deepEqual(zine.blocks, [])
  assert.equal(zine.owner, 'you')
  assert.equal(zine.published, false)
  assert.equal(zine.dropsAt, null)
})

test('assertZineShape rejects untrusted junk at the issue boundary', () => {
  fails(() => assertZineShape(null), /issue must be an object/)
  fails(() => assertZineShape({ title: 'x', vibe: 'neon', blocks: [] }), /curse/)
  fails(() => assertZineShape({ title: '   ', vibe: 'miles', blocks: [] }), /non-empty/)
  fails(() => assertZineShape({ title: 'x', vibe: 'miles', blocks: 'nope' }), /blocks must be an array/)
})
