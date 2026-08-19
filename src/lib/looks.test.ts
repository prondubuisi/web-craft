import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { LookLayer } from './types'
import { applyLook, breakingLooks, mergeLinkedLooks, removeLook, reorderLooks, withOverrides } from './looks'
import { createBlock } from './widgets'
import { harvest as harvestBlock } from './widgetLang'

function sticker() {
  return createBlock('sticker', 'miles')
}

function layer(label: string, bag: LookLayer['bag'], extra?: Partial<LookLayer>): LookLayer {
  return { label, bag, ...extra }
}

test('removeLook of the middle layer matches never applying it', () => {
  const base = sticker()
  const city = layer('city', { ink: 'city ink' })
  const tilt = layer('hand tilt', { tilt: 2.4 })
  const pin = layer('corner pin', { x: 8, y: 22 })
  const stacked = applyLook(applyLook(applyLook(base, city), tilt), pin)
  const removed = removeLook(stacked, 1, 'miles')
  const skipped = applyLook(applyLook({ ...base }, city), pin)
  assert.deepEqual(harvestBlock(removed), harvestBlock(skipped))
  assert.deepEqual(
    removed.looks?.map((item) => item.label),
    ['city', 'corner pin'],
  )
})

test('reorderLooks later layer wins an overlapping ink cut', () => {
  const base = sticker()
  const first = applyLook(base, layer('city', { ink: 'first' }))
  const both = applyLook(first, layer('diary', { ink: 'second' }))
  assert.equal(harvestBlock(both).ink, 'second')
  const flipped = reorderLooks(both, 1, 0, 'miles')
  assert.equal(harvestBlock(flipped).ink, 'first')
  assert.deepEqual(
    flipped.looks?.map((item) => item.label),
    ['diary', 'city'],
  )
})

test('hand-edited field stays after the contributing look is removed', () => {
  const stacked = applyLook(sticker(), layer('city', { ink: 'city ink' }))
  if (stacked.type !== 'sticker') throw new Error('expected sticker')
  const edited = withOverrides(stacked, { ...stacked, text: 'handmade' })
  assert.deepEqual(edited.looks?.[0]?.overridden, ['ink'])
  const removed = removeLook(edited, 0, 'miles')
  assert.equal(harvestBlock(removed).ink, 'handmade')
})

test('mergeLinkedLooks is a no-op when the live link is already applied', () => {
  const slim = { ink: 'city ink' }
  const linked = layer('city', slim, { linked: true })
  const once = mergeLinkedLooks(sticker(), [linked], slim)
  const twice = mergeLinkedLooks(once, [linked], slim)
  assert.equal(twice, once)
})

test('breakingLooks flags a hand-edit of a still-linked field', () => {
  const linked = applyLook(sticker(), layer('hand tilt', { tilt: 2.4 }, { linked: true }))
  if (linked.type !== 'sticker') throw new Error('expected sticker')
  const next = { ...linked, rotation: 6 }
  assert.equal(breakingLooks(linked, next).length, 1)
  assert.equal(breakingLooks(linked, next)[0]?.label, 'hand tilt')
})

test('breakingLooks ignores an already-overridden linked field', () => {
  const linked = applyLook(sticker(), layer('hand tilt', { tilt: 2.4 }, { linked: true }))
  if (linked.type !== 'sticker') throw new Error('expected sticker')
  const marked = withOverrides(linked, { ...linked, rotation: 5 })
  const again = { ...marked, rotation: 7 }
  assert.equal(breakingLooks(marked, again).length, 0)
})
