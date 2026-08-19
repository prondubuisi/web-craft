import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  bagForType,
  canHoldBag,
  linkBag,
  matchSample,
  misregisterBlock,
  pickMisregister,
  pickN,
  starterPage,
} from './samples'
import { createBlock } from './widgets'

const mixed = {
  ink: 'city ink',
  cite: 'the xerox machine',
  x: 8,
  y: 22,
  tilt: 2.4,
}

test('bagForType keeps only cuts the widget can hold', () => {
  assert.deepEqual(bagForType('sticker', mixed), { ink: 'city ink', x: 8, y: 22, tilt: 2.4 })
  assert.deepEqual(bagForType('quote', mixed), { ink: 'city ink', cite: 'the xerox machine' })
  assert.deepEqual(bagForType('divider', mixed), { tilt: 2.4 })
  assert.deepEqual(bagForType('heading', { x: 8, y: 22 }), {})
})

test('canHoldBag is false when every cut is foreign', () => {
  assert.equal(canHoldBag('heading', { x: 8, y: 22 }), false)
  assert.equal(canHoldBag('sticker', { x: 8 }), true)
  assert.equal(canHoldBag('quote', { cite: 'the margin' }), true)
})

test('linkBag plants a scrap only on widgets that can hold it', () => {
  const heading = createBlock('heading', 'miles')
  const sticker = createBlock('sticker', 'miles')
  const divider = createBlock('divider', 'miles')
  const next = linkBag([heading, sticker, divider], { ink: 'pass this page' })
  assert.equal(harvestInk(next[0]), 'pass this page')
  assert.equal(harvestInk(next[1]), 'pass this page')
  assert.equal(next[2], divider)
})

test('linkBag with a live layer is idempotent', () => {
  const sticker = createBlock('sticker', 'miles')
  const live = [{ label: 'city', bag: { ink: 'city ink' }, linked: true }]
  const once = linkBag([sticker], { ink: 'city ink' }, live)
  const twice = linkBag(once, { ink: 'city ink' }, live)
  assert.equal(twice[0], once[0])
})

test('matchSample filters pin scraps by attr substring', () => {
  const hits = matchSample('pin')
  assert.ok(hits.length > 0)
  assert.ok(hits.every((sample) => sample.label.includes('pin') || sample.attrs.some((attr) => attr.includes('pin'))))
})

test('matchSample finds pencil scraps by tag, not just label', () => {
  const hits = matchSample('sketch')
  assert.ok(hits.some((sample) => sample.label === 'intern badge'))
  assert.ok(hits.every((sample) => sample.tags?.some((tag) => tag.includes('sketch'))))
  assert.ok(matchSample('internship').some((sample) => sample.label === 'lightbox desk'))
})

function harvestInk(block: { type: string; text?: string }) {
  return 'text' in block ? block.text : undefined
}

function always(n: number) {
  return () => n
}

test('pickN is deterministic with a stub rng', () => {
  assert.deepEqual(pickN(['a', 'b', 'c', 'd'], 3, always(0)), ['a', 'b', 'c'])
  assert.deepEqual(pickN(['a', 'b'], 5, always(0)), ['a', 'b'])
})

test('pickMisregister returns at most three scraps the widget can hold', () => {
  const layers = pickMisregister('sticker', 3, always(0))
  assert.ok(layers.length >= 2 && layers.length <= 3)
  assert.ok(layers.every((layer) => Object.keys(layer.bag).length > 0))
})

test('misregisterBlock appends looks without dropping the block id', () => {
  const block = createBlock('sticker', 'miles')
  const next = misregisterBlock(block, always(0))
  assert.equal(next.id, block.id)
  assert.equal(next.type, 'sticker')
  assert.ok((next.looks?.length ?? 0) >= 2)
})

test('starterPage keeps the title and vibe photo, varies the other scraps', () => {
  const page = starterPage('rooftop hours', 'miles', always(0))
  assert.equal(page.length, 3)
  assert.equal(page[0].type, 'heading')
  if (page[0].type !== 'heading') throw new Error('expected heading')
  assert.equal(page[0].text, 'rooftop hours')
  assert.equal(page[1].type, 'hero')
  if (page[1].type !== 'hero') throw new Error('expected hero')
  assert.equal(page[1].src, '/art/miles.jpg')
  assert.ok((page[1].looks?.length ?? 0) >= 1)
  assert.equal(page[2].type, 'sticker')
})
