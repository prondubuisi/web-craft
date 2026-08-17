import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { assertZineShape } from './shape'

const fixture = JSON.parse(
  readFileSync(join(process.cwd(), 'e2e/fixtures/sample.zine.json'), 'utf8'),
) as unknown

describe('assertZineShape', () => {
  it('accepts a studio export fixture', () => {
    const zine = assertZineShape(fixture)
    expect(zine.title).toBe('imported scrap')
    expect(zine.vibe).toBe('gwen')
    expect(zine.blocks).toHaveLength(2)
    expect(zine.blocks[1]).toMatchObject({ type: 'sticker', text: 'from a json file' })
  })

  it('fills defaults so a snapshot-shaped object is still a Zine', () => {
    const zine = assertZineShape({
      title: 'ghost notes',
      vibe: 'noir',
      owner: '@ink',
      dropsAt: 99,
      blocks: [{ id: 'h', type: 'heading', text: 'ghost notes', size: 'xl' }],
    })
    expect(zine.id).toBe('')
    expect(zine.published).toBe(false)
    expect(zine.owner).toBe('@ink')
    expect(zine.dropsAt).toBe(99)
  })

  it('names the missing title', () => {
    expect(() => assertZineShape({ vibe: 'miles', blocks: [] })).toThrow(/title must be a string/)
  })

  it('names a bad vibe', () => {
    expect(() => assertZineShape({ title: 'x', vibe: 'spider', blocks: [] })).toThrow(
      /vibe must be miles, gwen, peni, ham, or noir/,
    )
  })

  it('names a missing blocks array', () => {
    expect(() => assertZineShape({ title: 'x', vibe: 'miles' })).toThrow(/blocks must be an array/)
  })

  it('names an unknown widget', () => {
    expect(() =>
      assertZineShape({
        title: 'x',
        vibe: 'miles',
        blocks: [{ id: 'b', type: 'carousel', text: 'nope' }],
      }),
    ).toThrow(/blocks\[0\]\.type must be a known widget/)
  })

  it('names a heading with no text', () => {
    expect(() =>
      assertZineShape({
        title: 'x',
        vibe: 'miles',
        blocks: [{ id: 'b', type: 'heading', size: 'xl' }],
      }),
    ).toThrow(/blocks\[0\]\.text must be a string/)
  })

  it('rejects a non-object', () => {
    expect(() => assertZineShape('issue')).toThrow(/issue must be an object/)
  })
})
