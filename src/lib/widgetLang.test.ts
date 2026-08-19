import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyBag, combineBags, harvest, retarget, shuffleKids } from './widgetLang'
import { createBlock } from './widgets'

test('combineBags is later-wins and leaves unset fields alone', () => {
  assert.deepEqual(combineBags([]), {})
  assert.deepEqual(combineBags([{ ink: 'a', tilt: -2 }, { ink: 'b' }]), { ink: 'b', tilt: -2 })
})

test('harvest then applyBag is a no-op on sticker fields the bag can set', () => {
  const block = createBlock('sticker', 'miles')
  if (block.type !== 'sticker') throw new Error('expected sticker')
  const bag = harvest(block)
  const again = applyBag(block, bag)
  assert.deepEqual(harvest(again), bag)
})

test('applyBag writes only supplied fields', () => {
  const block = createBlock('sticker', 'miles')
  if (block.type !== 'sticker') throw new Error('expected sticker')
  const next = applyBag(block, { ink: 'POW!', tilt: 3.2, x: 8, y: 22 })
  if (next.type !== 'sticker') throw new Error('expected sticker')
  assert.equal(next.text, 'POW!')
  assert.equal(next.rotation, 3.2)
  assert.equal(next.x, 8)
  assert.equal(next.y, 22)
  assert.equal(next.src, block.src)
})

test('retarget keeps id and shared ink when heading becomes a quote', () => {
  const heading = createBlock('heading', 'noir')
  if (heading.type !== 'heading') throw new Error('expected heading')
  const edited = { ...heading, text: 'hold the click' }
  const quote = retarget(edited, 'quote', 'noir')
  assert.equal(quote.id, heading.id)
  assert.equal(quote.type, 'quote')
  assert.equal(harvest(quote).ink, 'hold the click')
})

test('retarget to the same type is identity', () => {
  const block = createBlock('hero', 'peni')
  assert.equal(retarget(block, 'hero', 'peni'), block)
})

test('shuffleKids keeps the same panels, just reordered', () => {
  const grid = createBlock('grid', 'miles')
  if (grid.type !== 'grid') throw new Error('expected grid')
  const texts = grid.panels.map((panel) => panel.text)
  const flipped = shuffleKids(grid, () => 0)
  if (flipped.type !== 'grid') throw new Error('expected grid')
  assert.notDeepEqual(
    flipped.panels.map((panel) => panel.text),
    texts,
  )
  assert.deepEqual(
    [...flipped.panels.map((panel) => panel.text)].sort(),
    [...texts].sort(),
  )
})
