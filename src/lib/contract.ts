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
  token?: string
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
export type MailSendBody = { to: string; body: string; postcard?: boolean; vibe?: VibeId }
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
export type GuestNoteResponse = { note: GuestNote }
export type ShelfResponse = { shelf: ShelfItem[] }
export type PileResponse = { zine: Zine }
export type FollowResponse = { following: boolean }
export type StudioMeResponse = { name: string; bio: string; remixPoints: number }
export type ProfilePatchBody = { bio: string; scene?: string }
export type ProfilePatchResponse = { name: string; bio: string; scene?: string }
export type GuestNoteBody = { body: string }
export type CommentBody = { body: string }
export type CommentOneResponse = { comment: Comment }
export type ReviewBody = { body: string }
export type ReviewOneResponse = { review: Review }
export type MarginBody = { blockId: string; body: string }
export type MarginOneResponse = { note: MarginNote }
export type ZineWriteResponse = { zine: Zine }
export type ViewsResponse = { views: number }
export type BagTuckBody = { zineId: string }
export type BagItemResponse = { item: BagItem }
export type ShelfStockBody = { zineId: string; note?: string }
export type NominateResponse = { noms: number; archived: boolean; mine: boolean }
export type ClaimResponse = { claimed: number; mine: boolean; out: boolean }
export type LoanOneResponse = { loan: Loan }
export type WatchSeriesBody = { series: string }
export type WatchSeriesResponse = { watching: boolean }
export type UnlockBody = { password: string; k?: string }
export type PollVoteBody = { option: number }
export type PollVoteResponse = PollTally
export type StampBody = { zineId: string }
export type CorkSaveBody = { pins: CorkPin[] }
export type ChainPeekResponse = { previous: Zine['blocks']; turn: number }
export type ChainAddBody = { invite: string; blocks: Zine['blocks'] }
export type ChainAddResponse = { invite: string; turn: number }
export type PageHitBody = { page: number; dwellMs: number }
