import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  PIN_X,
  PIN_Y,
  TILT_MAX,
  TILT_MIN,
  clampPin,
  clampTilt,
  overlayPin,
  pinFromPointer,
  pinOrigin,
  tiltFromPointer,
} from './pin'
import { createBlock } from './widgets'

test('clampPin stays on the printable page', () => {
  assert.deepEqual(clampPin(-40, 200), { x: PIN_X.min, y: PIN_Y.max })
  assert.deepEqual(clampPin(12, 20), { x: 12, y: 20 })
})

test('pinOrigin is 0,0 when unset so a fresh sticker does not jump', () => {
  const block = createBlock('sticker', 'miles')
  assert.deepEqual(pinOrigin(block, 0, false), { x: 0, y: 0 })
})

test('pinOrigin scatter fallback is stable for an unpinned hero', () => {
  const block = createBlock('hero', 'miles')
  assert.deepEqual(pinOrigin(block, 4, true), { x: 34, y: 34 })
})

test('pinFromPointer maps a page-percent delta and clamps', () => {
  const next = pinFromPointer(10, 10, 0, 0, 50, 0, 100, 200)
  assert.equal(next.x, 60)
  assert.equal(next.y, 10)
  const clamped = pinFromPointer(10, 10, 0, 0, 400, 400, 100, 100)
  assert.equal(clamped.x, PIN_X.max)
  assert.equal(clamped.y, PIN_Y.max)
})

test('tiltFromPointer stays in the slider range', () => {
  assert.ok(tiltFromPointer(0, 0, 10, 0) <= TILT_MAX)
  assert.ok(tiltFromPointer(0, 0, -10, 0) >= TILT_MIN)
  assert.equal(clampTilt(90), TILT_MAX)
})

test('overlayPin writes x/y/rotation only on the live block', () => {
  const sticker = createBlock('sticker', 'miles')
  if (sticker.type !== 'sticker') throw new Error('expected sticker')
  const live = overlayPin(sticker, { id: sticker.id, x: 8, y: 22, rotation: 3 })
  assert.equal(live.type === 'sticker' && live.x, 8)
  assert.equal(live.type === 'sticker' && live.y, 22)
  assert.equal(live.type === 'sticker' && live.rotation, 3)
  const other = createBlock('sticker', 'miles')
  assert.equal(overlayPin(other, { id: sticker.id, x: 8, y: 22, rotation: 3 }), other)
})
