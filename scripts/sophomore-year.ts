/**
 * Build Reyna's "sophomore year" issue as an importable .zine.json.
 * Does not write seed.ts or the local SQLite. Studio → import is the desk path.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { applyLook } from '../src/lib/looks.ts'
import { bagForType, linkBag, SAMPLES } from '../src/lib/samples.ts'
import { assertZineShape } from '../src/lib/shape.ts'
import type { Block, LookLayer, Zine } from '../src/lib/types.ts'
import { createBlock } from '../src/lib/widgets.ts'

function scrap(label: string) {
  const sample = SAMPLES.find((row) => row.label === label)
  if (!sample) throw new Error(`missing sample: ${label}`)
  return sample
}

function plant(block: Block, label: string): Block {
  const sample = scrap(label)
  return applyLook(block, { label, bag: bagForType(block.type, sample.bag) })
}

function plantInk(block: Block, label: string, ink: string): Block {
  return applyLook(block, { label, bag: bagForType(block.type, { ink }) })
}

export function buildSophomoreYear(now = Date.now()): Zine {
  const web = scrap('web corner')
  const live: LookLayer[] = [{ label: web.label, bag: web.bag, linked: true }]

  const heading = plantInk(createBlock('heading', 'miles'), 'sophomore year', 'sophomore year.')
  if (heading.type === 'heading') heading.size = 'xl'

  // Motif first (linked), featured scraps later so they win the photo cut.
  let [badge, dayOne, board, desk, gesture] = linkBag(
    [
      createBlock('sticker', 'miles'),
      createBlock('hero', 'miles'),
      createBlock('grid', 'miles'),
      createBlock('sticker', 'miles'),
      createBlock('hero', 'miles'),
    ],
    web.bag,
    live,
  )

  badge = plant(plant(badge, 'intern badge'), 'hand tilt')
  dayOne = plantInk(plant(plant(dayOne, 'rooftop skyline'), 'grain'), 'day one', 'eleven weeks, one badge, no NDA about the coffee.')
  if (board.type === 'grid') {
    board = {
      ...board,
      layout: 'three',
      panels: [
        { text: 'panel 12A', fill: 'var(--accent)' },
        {
          text: 'kept for the animatic',
          fill: 'var(--accent-2)',
          src: scrap('storyboard').bag.photo,
        },
        { text: 'cut in review', fill: 'var(--accent-3)' },
      ],
      looks: [...(board.looks ?? []), { label: 'three', bag: { layout: 'three' } }, { label: 'storyboard', bag: { photo: scrap('storyboard').bag.photo } }],
    }
  }
  desk = plantInk(plant(desk, 'lightbox desk'), 'desk hours', 'the lightbox never turns off before 9.')
  gesture = plantInk(
    plant(plant(gesture, 'gesture study'), 'chroma tear'),
    'line of action',
    'keep the line of action. throw the costume.',
  )

  let quote = plant(createBlock('quote', 'miles'), 'the margin')
  quote = plantInk(quote, 'mentor note', 'you are not late. you are in-between.')
  if (quote.type === 'quote') quote.cite = 'the desk next to mine.'

  let poll = plant(createBlock('poll', 'miles'), 'street ask')
  if (poll.type === 'poll') {
    poll = {
      ...poll,
      question: 'what still prints?',
      options: ['the badge', 'the board', 'the gesture', 'the coffee'],
    }
  }

  let colophon = plant(createBlock('colophon', 'miles'), 'kitchen table')
  if (colophon.type === 'colophon') {
    colophon = {
      ...colophon,
      edition: 'first printing · 40 copies',
      press: 'kitchen table riso',
      place: 'wherever the toner is cheap',
      thanks: 'to the desk next to mine, and the eleven weeks.',
    }
  }

  const blocks = [heading, badge, dayOne, board, desk, gesture, quote, poll, colophon]

  return {
    id: 'sophomore-year',
    title: 'sophomore year',
    vibe: 'miles',
    blocks,
    owner: 'you',
    createdAt: now,
    updatedAt: now,
    views: 0,
    likes: 0,
    remixes: 0,
    published: false,
    dropsAt: null,
    tags: ['internship', 'animation', 'diary'],
    finish: 'riso',
    series: 'sophomore year',
    issueNo: 1,
    penName: 'reyna',
    editionSize: 40,
  }
}

const zine = assertZineShape(buildSophomoreYear())
const json = `${JSON.stringify(zine, null, 2)}\n`
const desktopDir = join(homedir(), 'Desktop')
mkdirSync(desktopDir, { recursive: true })
const desktop = join(desktopDir, 'sophomore-year.zine.json')
const local = join(process.cwd(), 'sophomore-year.zine.json')
writeFileSync(local, json)
writeFileSync(desktop, json)
const photos = zine.blocks.filter((block) => {
  if (block.type === 'hero' || block.type === 'sticker') return Boolean('src' in block && block.src)
  if (block.type === 'grid') return block.panels.some((panel) => panel.src)
  return false
}).length
console.log(`wrote ${local}`)
console.log(`wrote ${desktop}`)
console.log(`${zine.blocks.length} widgets, ${photos} photo-holding blocks, import in Studio — not seeded`)
