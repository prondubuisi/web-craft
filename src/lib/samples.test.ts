import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bagForType, canHoldBag, linkBag, matchSample } from './samples'
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

function harvestInk(block: { type: string; text?: string }) {
  return 'text' in block ? block.text : undefined
}
