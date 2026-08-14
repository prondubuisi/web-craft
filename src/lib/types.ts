export type VibeId = 'miles' | 'gwen' | 'peni' | 'ham' | 'noir'

export type BlockType =
  | 'heading'
  | 'sticker'
  | 'hero'
  | 'grid'
  | 'divider'
  | 'sfx'
  | 'glitch'
  | 'stack'

export type HeadingBlock = {
  id: string
  type: 'heading'
  text: string
  size: 'xl' | 'lg' | 'md'
}

export type StickerBlock = {
  id: string
  type: 'sticker'
  text: string
  rotation: number
}

export type HeroBlock = {
  id: string
  type: 'hero'
  src: string
  caption: string
  density: number
  split: number
}

export type GridPanel = {
  text: string
  src?: string
  fill: string
}

export type GridBlock = {
  id: string
  type: 'grid'
  layout: 'two' | 'three' | 'asymmetric'
  panels: GridPanel[]
}

export type DividerBlock = {
  id: string
  type: 'divider'
  style: 'scribble' | 'speed' | 'zip'
}

export type SfxBlock = {
  id: string
  type: 'sfx'
  word: string
}

export type GlitchBlock = {
  id: string
  type: 'glitch'
  text: string
}

export type StackCard = {
  title: string
  body: string
}

export type StackBlock = {
  id: string
  type: 'stack'
  cards: StackCard[]
}

export type Block =
  | HeadingBlock
  | StickerBlock
  | HeroBlock
  | GridBlock
  | DividerBlock
  | SfxBlock
  | GlitchBlock
  | StackBlock

export type BadgeId =
  | 'sticker-fiend'
  | 'panel-hopper'
  | 'dropped'
  | 'remixer'
  | 'multiverse'

export type Zine = {
  id: string
  title: string
  vibe: VibeId
  blocks: Block[]
  owner: 'you' | string
  createdAt: number
  updatedAt: number
  views: number
  likes: number
  remixes: number
  published: boolean
  dropsAt?: number | null
  remixedFrom?: string
}

export type Profile = {
  name: string
  remixPoints: number
  likedIds: string[]
}

export type AppState = {
  profile: Profile
  zines: Zine[]
}

export type PreviewMode = 'page' | 'phone' | 'tablet' | 'fold'
