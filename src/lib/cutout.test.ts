import { describe, expect, it } from 'vitest'
import { colorDist, cutoutPixels } from './cutout'

describe('cutout', () => {
  it('clears pixels that match the corner background', () => {
    expect(colorDist([10, 10, 10], [12, 11, 10])).toBeLessThan(5)
    const width = 3
    const height = 3
    const white = [250, 250, 250, 255]
    const ink = [10, 20, 200, 255]
    const data = new Uint8ClampedArray([
      ...white, ...white, ...white,
      ...white, ...ink, ...white,
      ...white, ...white, ...white,
    ])
    const next = cutoutPixels(data, width, height, 40)
    expect(next[3]).toBe(0)
    expect(next[(1 * 3 + 1) * 4 + 3]).toBe(255)
  })
})
