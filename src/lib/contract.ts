import type {
  BagItem,
  Comment,
  CorkPin,
  FestTable,
  GuestNote,
  Jam,
  Letter,
  Listing,
  ListingKind,
  Loan,
  MailThread,
  MarginNote,
  Notice,
  PageStat,
  PollTally,
  Review,
  ShelfItem,
  Stamp,
  StreamSort,
  VibeId,
  Zine,
} from './types'

export type ErrorBody = { error: string }
export type OkBody = { ok: true }

export type HealthResponse = { ok: true }

export type AuthBody = { name: string; password: string }
export type AuthOk = { name: string; remixPoints: number; token: string }
export type Session = { name: string }
export type MeResponse = {
  session: Session | null
  remixPoints?: number
  likedIds?: string[]
  following?: string[]
}

export type StreamQuery = {
  q?: string
  vibe?: VibeId
  sort?: StreamSort
  following?: boolean
  tag?: string
  jam?: boolean
  archive?: boolean
}
export type ZineListResponse = { zines: Zine[] }
export type ZineOneResponse = { zine: Zine; sealed?: boolean; locked?: boolean; draft?: boolean; live?: boolean }
export type PublishBody = {
  dropsAt?: number
  visibility?: 'public' | 'unlisted'
  password?: string
  chain?: boolean
}
export type LikeResponse = { liked: boolean; likes: number }

export type ProfileResponse = {
  name: string
  bio: string
  scene?: string
  remixPoints: number
  createdAt: number
  followers?: number
  following?: number
  followedByMe?: boolean
  zines: Zine[]
  guestbook?: GuestNote[]
  shelf?: ShelfItem[]
  stamps?: Stamp[]
  table?: FestTable | null
}

export type BoardListResponse = { listings: Listing[] }
export type BoardPostBody = { kind: ListingKind; body: string; zineId?: string }
export type BoardPostResponse = { listing: Listing }
export type SwapResponse = { swapped: boolean }

export type MailThreadsResponse = { threads: MailThread[] }
export type MailThreadResponse = { handle: string; letters: Letter[] }
export type MailSendBody = { to: string; body: string; postcard?: boolean; vibe?: string }
export type MailSendResponse = { letter: Letter }

export type JamListResponse = { jams: Jam[]; live: Jam | null }
export type JamOneResponse = { jam: Jam; live: boolean; zines: Zine[] }
export type ArchiveResponse = { zines: Zine[] }

export type FestListResponse = { tables: FestTable[] }
export type FestTableBody = { name: string; scene?: string; blurb?: string; zineIds?: string[] }
export type FestTableResponse = { table: FestTable }
export type SitResponse = { sitters: string[] }

export type CorkResponse = { pins: CorkPin[] }
export type CommentsResponse = { comments: Comment[] }
export type ReviewsResponse = { reviews: Review[] }
export type MarginsResponse = { notes: MarginNote[] }
export type BagResponse = { bag: BagItem[] }
export type LoansResponse = { loans: Loan[] }
export type StampsResponse = { stamps: Stamp[] }
export type NoticesResponse = { notices: Notice[] }
export type PagesResponse = { pages: PageStat[] }
export type PollsResponse = { polls: Record<string, PollTally> }
export type GuestbookResponse = { notes: GuestNote[] }
export type ShelfResponse = { shelf: ShelfItem[] }
