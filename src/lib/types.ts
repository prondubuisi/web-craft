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
  | 'strip'
  | 'colophon'
  | 'blackout'
  | 'contents'
  | 'insert'
  | 'reply'

/**
 * One contributor on a block's appearance stack. `bag` is snapshotted at
 * apply time so replay does not depend on the live SAMPLES list.
 *
 * Hand-edits do not drop the layer — they mark the touched keys in
 * `overridden`. Removing the layer later then leaves those fields alone
 * instead of snapping them back to the sample (or the widget default).
 */
export type LookLayer = {
  label: string
  bag: {
    ink?: string
    cite?: string
    photo?: string
    tape?: string
    size?: 'xl' | 'lg' | 'md'
    tilt?: number
    density?: number
    split?: number
    style?: 'scribble' | 'speed' | 'zip'
    layout?: 'two' | 'three' | 'asymmetric'
    x?: number
    y?: number
    items?: string[]
    holes?: number[]
  }
  linked?: boolean
  overridden?: string[]
}

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
  src?: string
  x?: number
  y?: number
}

export type HeroBlock = {
  id: string
  type: 'hero'
  src: string
  caption: string
  density: number
  split: number
  x?: number
  y?: number
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

export type StripPanel = {
  text: string
  src?: string
}

export type StripBlock = {
  id: string
  type: 'strip'
  panels: StripPanel[]
}

export type ColophonBlock = {
  id: string
  type: 'colophon'
  edition: string
  press: string
  place: string
  thanks: string
}

export type BlackoutBlock = {
  id: string
  type: 'blackout'
  text: string
  hidden: number[]
}

export type ContentsLine = {
  label: string
}

export type ContentsBlock = {
  id: string
  type: 'contents'
  lines: ContentsLine[]
}

export type InsertBlock = {
  id: string
  type: 'insert'
  title: string
  text: string
}

export type ReplyBlock = {
  id: string
  type: 'reply'
  prompt: string
}

export type Block = (
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
  | StripBlock
  | ColophonBlock
  | BlackoutBlock
  | ContentsBlock
  | InsertBlock
  | ReplyBlock
) & {
  looks?: LookLayer[]
}

export type Visibility = 'public' | 'unlisted'
export type FinishId = 'clean' | 'riso' | 'grain'

export type GuestNote = {
  id: string
  author: string
  body: string
  createdAt: number
}

export type ShelfItem = {
  zineId: string
  title: string
  owner: string
  note: string
  vibe?: VibeId
}

export type PageStat = {
  page: number
  views: number
  dwellMs: number
}

export type StreamSort = 'new' | 'likes' | 'remixes'

export type JamFormat = 'any' | 'one' | 'card'

export type Jam = {
  id: string
  title: string
  prompt: string
  format: JamFormat
  startsAt: number
  endsAt: number
}

export type MarginNote = {
  id: string
  zineId: string
  blockId: string
  author: string
  body: string
  createdAt: number
}

export type ListingKind = 'trade' | 'collab' | 'feedback'

export type Listing = {
  id: string
  author: string
  kind: ListingKind
  body: string
  zineId?: string
  zineTitle?: string
  createdAt: number
  swapped?: boolean
}

export type Comment = {
  id: string
  zineId: string
  author: string
  body: string
  createdAt: number
}

export type Review = {
  id: string
  zineId: string
  author: string
  body: string
  createdAt: number
}

export type Letter = {
  id: string
  from: string
  to: string
  body: string
  read: boolean
  createdAt: number
  postcard?: boolean
  vibe?: VibeId
}

export type MailThread = {
  handle: string
  last: Letter
  unread: number
}

export type BagItem = {
  zineId: string
  title: string
  owner: string
  vibe?: VibeId
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
  | 'jammer'
  | 'fest-goer'
  | 'collector'
  | 'compiler'
  | 'subscriber'

export type ZineCore = {
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
}

export type ZinePublish = {
  published: boolean
  dropsAt?: number | null
  remixedFrom?: string
  visibility?: Visibility
  shareKey?: string
  hasPass?: boolean
  passHash?: string
}

export type ZineEdition = {
  tags?: string[]
  finish?: FinishId
  series?: string
  issueNo?: number
  penName?: string
  editionSize?: number
  claimed?: number
  claimedByMe?: boolean
}

export type ZineExtras = {
  chainKey?: string
  chainOpen?: boolean
  jamId?: string
  bSide?: string
  noms?: number
  archived?: boolean
  errata?: string
  includes?: CompItem[]
  dedication?: string
  scatter?: boolean
}

export type Zine = ZineCore & ZinePublish & ZineEdition & ZineExtras

export type CompItem = {
  zineId: string
  title: string
  owner: string
}

export type Loan = {
  zineId: string
  title: string
  dueAt: number
}

export type NoticeKind =
  | 'like'
  | 'comment'
  | 'remix'
  | 'follow'
  | 'drop'
  | 'review'
  | 'mail'
  | 'archive'
  | 'dedicate'
  | 'series'

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

export type FestTable = {
  id: string
  owner: string
  name: string
  scene: string
  blurb: string
  zineIds: string[]
  createdAt: number
  sitters?: string[]
}

export type CorkPin = {
  id: string
  text: string
  x: number
  y: number
  rotation: number
  src?: string
}

export type Stamp = {
  zineId: string
  title: string
  owner: string
  vibe?: VibeId
  scene?: string
  createdAt: number
}

export type Profile = {
  name: string
  remixPoints: number
  likedIds: string[]
  following: string[]
  scene?: string
}

export type AppState = {
  profile: Profile
  zines: Zine[]
}

export type PreviewMode = 'page' | 'phone' | 'tablet' | 'fold'
