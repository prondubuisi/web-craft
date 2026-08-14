import type {
  BagItem,
  Comment,
  FestTable,
  GuestNote,
  Jam,
  Letter,
  Listing,
  ListingKind,
  MailThread,
  MarginNote,
  Notice,
  PageStat,
  PollTally,
  Review,
  ShelfItem,
  Stamp,
  CorkPin,
  Loan,
  StreamSort,
  VibeId,
  Zine,
} from './types'

export type Session = { name: string }

export type Me = {
  session: Session | null
  remixPoints?: number
  likedIds?: string[]
  following?: string[]
}

const TOKEN_KEY = 'zineverse.token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // private mode
  }
}

const prefix = () => (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${prefix()}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string; token?: string }
  if (data.token) setToken(data.token)
  if (!res.ok) throw new Error(data.error || `API ${res.status}`)
  return data
}

export async function apiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${prefix()}/api/health`, {
      signal: AbortSignal.timeout(3000),
    })
    return res.ok
  } catch {
    return false
  }
}

export const api = {
  me: () => req<Me>('/api/auth/me'),
  register: (name: string, password: string) =>
    req<{ name: string; remixPoints: number; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, password }),
    }),
  login: (name: string, password: string) =>
    req<{ name: string; remixPoints: number; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ name, password }),
    }),
  logout: async () => {
    const result = await req<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }).catch(
      () => ({ ok: true }),
    )
    setToken(null)
    return result
  },
  stream: (opts?: {
    q?: string
    vibe?: VibeId
    sort?: StreamSort
    following?: boolean
    tag?: string
    jam?: boolean
    archive?: boolean
  }) => {
    const params = new URLSearchParams()
    if (opts?.q) params.set('q', opts.q)
    if (opts?.vibe) params.set('vibe', opts.vibe)
    if (opts?.sort && opts.sort !== 'new') params.set('sort', opts.sort)
    if (opts?.following) params.set('following', '1')
    if (opts?.tag) params.set('tag', opts.tag)
    if (opts?.jam) params.set('jam', '1')
    if (opts?.archive) params.set('archive', '1')
    const qs = params.toString()
    return req<{ zines: Zine[] }>(`/api/stream${qs ? `?${qs}` : ''}`)
  },
  pile: () => req<{ zine: Zine }>('/api/pile'),
  user: (name: string) =>
    req<{
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
    }>(`/api/users/${encodeURIComponent(name)}`),
  guestbook: (name: string) =>
    req<{ notes: GuestNote[] }>(`/api/users/${encodeURIComponent(name)}/guestbook`),
  signGuestbook: (name: string, body: string) =>
    req<{ note: GuestNote }>(`/api/users/${encodeURIComponent(name)}/guestbook`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  stock: (zineId: string, note?: string) =>
    req<{ shelf: ShelfItem[] }>('/api/shelf', {
      method: 'POST',
      body: JSON.stringify({ zineId, note }),
    }),
  unstock: (zineId: string) => req<{ ok: boolean }>(`/api/shelf/${zineId}`, { method: 'DELETE' }),
  pageStats: (id: string) => req<{ pages: PageStat[] }>(`/api/zines/${id}/pages`),
  pageHit: (id: string, page: number, dwellMs: number) =>
    req<{ ok: boolean }>(`/api/zines/${id}/pages`, {
      method: 'POST',
      body: JSON.stringify({ page, dwellMs }),
    }),
  chainPeek: (id: string, invite: string) =>
    req<{ previous: Zine['blocks']; turn: number }>(
      `/api/zines/${id}/chain?invite=${encodeURIComponent(invite)}`,
    ),
  chainAdd: (id: string, invite: string, blocks: Zine['blocks']) =>
    req<{ invite: string; turn: number }>(`/api/zines/${id}/chain`, {
      method: 'POST',
      body: JSON.stringify({ invite, blocks }),
    }),
  follow: (name: string) =>
    req<{ following: boolean }>(`/api/users/${encodeURIComponent(name)}/follow`, { method: 'POST' }),
  notices: () => req<{ notices: Notice[] }>('/api/notices'),
  readNotices: () => req<{ ok: boolean }>('/api/notices/read', { method: 'POST' }),
  board: (kind?: ListingKind) =>
    req<{ listings: Listing[] }>(`/api/board${kind ? `?kind=${kind}` : ''}`),
  postListing: (body: { kind: ListingKind; body: string; zineId?: string }) =>
    req<{ listing: Listing }>('/api/board', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  removeListing: (id: string) => req<{ ok: boolean }>(`/api/board/${id}`, { method: 'DELETE' }),
  updateMe: (bio: string, scene?: string) =>
    req<{ name: string; bio: string; scene?: string }>('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ bio, scene }),
    }),
  comments: (id: string) => req<{ comments: Comment[] }>(`/api/zines/${id}/comments`),
  comment: (id: string, body: string) =>
    req<{ comment: Comment }>(`/api/zines/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  polls: (id: string) => req<{ polls: Record<string, PollTally> }>(`/api/zines/${id}/polls`),
  votePoll: (id: string, blockId: string, option: number) =>
    req<PollTally>(`/api/zines/${id}/polls/${blockId}`, {
      method: 'POST',
      body: JSON.stringify({ option }),
    }),
  mine: () => req<{ zines: Zine[] }>('/api/zines'),
  get: (id: string, key?: string | null) =>
    req<{ zine: Zine; sealed: boolean; locked?: boolean }>(
      `/api/zines/${id}${key ? `?k=${encodeURIComponent(key)}` : ''}`,
    ),
  unlock: (id: string, password: string, key?: string | null) =>
    req<{ zine: Zine; sealed: boolean; locked: boolean }>(`/api/zines/${id}/unlock`, {
      method: 'POST',
      body: JSON.stringify({ password, k: key ?? undefined }),
    }),
  upsert: (zine: Zine) =>
    req<{ zine: Zine }>(`/api/zines/${zine.id}`, {
      method: 'PUT',
      body: JSON.stringify(zine),
    }),
  remove: (id: string) => req<{ ok: boolean }>(`/api/zines/${id}`, { method: 'DELETE' }),
  publish: (
    id: string,
    dropsAt: number,
    opts?: { visibility?: 'public' | 'unlisted'; password?: string; chain?: boolean },
  ) =>
    req<{ zine: Zine }>(`/api/zines/${id}/publish`, {
      method: 'POST',
      body: JSON.stringify({ dropsAt, ...opts }),
    }),
  like: (id: string) =>
    req<{ liked: boolean; likes: number }>(`/api/zines/${id}/like`, { method: 'POST' }),
  view: (id: string) => req<{ views: number }>(`/api/zines/${id}/view`, { method: 'POST' }),
  remix: (id: string) => req<{ zine: Zine }>(`/api/zines/${id}/remix`, { method: 'POST' }),
  bag: () => req<{ bag: BagItem[] }>('/api/bag'),
  tuck: (zineId: string) =>
    req<{ item: BagItem }>('/api/bag', {
      method: 'POST',
      body: JSON.stringify({ zineId }),
    }),
  dump: (zineId: string) => req<{ ok: boolean }>(`/api/bag/${zineId}`, { method: 'DELETE' }),
  reviews: (id: string) => req<{ reviews: Review[] }>(`/api/zines/${id}/reviews`),
  review: (id: string, body: string) =>
    req<{ review: Review }>(`/api/zines/${id}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),
  mail: () => req<{ threads: MailThread[] }>('/api/mail'),
  thread: (name: string) =>
    req<{ handle: string; letters: Letter[] }>(`/api/mail/${encodeURIComponent(name)}`),
  sendMail: (to: string, body: string, extra?: { postcard?: boolean; vibe?: string }) =>
    req<{ letter: Letter }>('/api/mail', {
      method: 'POST',
      body: JSON.stringify({ to, body, ...extra }),
    }),
  jams: () => req<{ jams: Jam[]; live: Jam | null }>('/api/jams'),
  jam: (id: string) =>
    req<{ jam: Jam; live: boolean; zines: Zine[] }>(`/api/jams/${encodeURIComponent(id)}`),
  archive: () => req<{ zines: Zine[] }>('/api/archive'),
  nominate: (id: string) =>
    req<{ noms: number; archived: boolean; mine: boolean }>(`/api/zines/${id}/nominate`, {
      method: 'POST',
    }),
  margins: (id: string) => req<{ notes: MarginNote[] }>(`/api/zines/${id}/margins`),
  margin: (id: string, blockId: string, body: string) =>
    req<{ note: MarginNote }>(`/api/zines/${id}/margins`, {
      method: 'POST',
      body: JSON.stringify({ blockId, body }),
    }),
  fest: () => req<{ tables: FestTable[] }>('/api/fest'),
  setTable: (body: { name: string; scene?: string; blurb?: string; zineIds?: string[] }) =>
    req<{ table: FestTable }>('/api/fest', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  stamps: () => req<{ stamps: Stamp[] }>('/api/stamps'),
  stamp: (zineId: string) =>
    req<{ stamps: Stamp[] }>('/api/stamps', {
      method: 'POST',
      body: JSON.stringify({ zineId }),
    }),
  claim: (id: string) =>
    req<{ claimed: number; mine: boolean; out: boolean }>(`/api/zines/${id}/claim`, { method: 'POST' }),
  cork: () => req<{ pins: CorkPin[] }>('/api/cork'),
  saveCork: (pins: CorkPin[]) =>
    req<{ ok: boolean }>('/api/cork', {
      method: 'PUT',
      body: JSON.stringify({ pins }),
    }),
  loans: () => req<{ loans: Loan[] }>('/api/loans'),
  checkout: (id: string) =>
    req<{ loan: Loan }>(`/api/zines/${id}/checkout`, { method: 'POST' }),
  watchSeries: (series: string) =>
    req<{ watching: boolean }>('/api/series/watch', {
      method: 'POST',
      body: JSON.stringify({ series }),
    }),
  sit: (id: string) => req<{ sitters: string[] }>(`/api/fest/${encodeURIComponent(id)}/sit`, { method: 'POST' }),
  swapListing: (id: string) =>
    req<{ swapped: boolean }>(`/api/board/${id}/swap`, { method: 'POST' }),
}
