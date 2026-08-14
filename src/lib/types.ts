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
  | 'quote'
  | 'poll'
  | 'audio'

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

export type QuoteBlock = {
  id: string
  type: 'quote'
  text: string
  cite: string
}

export type PollBlock = {
  id: string
  type: 'poll'
  question: string
  options: string[]
}

export type AudioBlock = {
  id: string
  type: 'audio'
  src: string
  caption: string
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
  | QuoteBlock
  | PollBlock
  | AudioBlock

export type Visibility = 'public' | 'unlisted'

export type StreamSort = 'new' | 'likes' | 'remixes'

export type ListingKind = 'trade' | 'collab' | 'feedback'

export type Listing = {
  id: string
  author: string
  kind: ListingKind
  body: string
  zineId?: string
  zineTitle?: string
  createdAt: number
}

export type Comment = {
  id: string
  zineId: string
  author: string
  body: string
  createdAt: number
}

export type PollTally = {
  counts: number[]
  mine: number | null
}

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
  visibility?: Visibility
  shareKey?: string
  hasPass?: boolean
  passHash?: string
}

export type NoticeKind = 'like' | 'comment' | 'remix' | 'follow' | 'drop'

export type Notice = {
  id: string
  kind: NoticeKind
  actor: string
  zineId?: string
  zineTitle?: string
  body?: string
  read: boolean
  createdAt: number
}

export type Profile = {
  name: string
  remixPoints: number
  likedIds: string[]
  following: string[]
}

export type AppState = {
  profile: Profile
  zines: Zine[]
}

export type PreviewMode = 'page' | 'phone' | 'tablet' | 'fold'
