import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { HealthResponse } from '../src/lib/contract.ts'
import { refreshDemoDrop, seedCommunity } from './community.ts'
import type { Db } from './db.ts'
import { registerArchive } from './routes/archive.ts'
import { registerAuth } from './routes/auth.ts'
import { registerBagShelf } from './routes/bag-shelf.ts'
import { registerBoard } from './routes/board.ts'
import { registerCork } from './routes/cork.ts'
import { registerFest } from './routes/fest.ts'
import { registerJam } from './routes/jam.ts'
import { registerMail } from './routes/mail.ts'
import { registerMargins } from './routes/margins.ts'
import { registerSocial } from './routes/social.ts'
import { registerZines } from './routes/zines.ts'

export function createApp(db: Db) {
  seedCommunity(db)
  const app = new Hono()

  app.use(
    '/api/*',
    cors({
      origin: ['http://127.0.0.1:5173', 'http://localhost:5173', 'https://prondubuisi.github.io'],
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
    }),
  )

  app.get('/api/health', (c) => {
    refreshDemoDrop(db)
    const payload: HealthResponse = { ok: true }
    return c.json(payload)
  })

  registerAuth(app, db)
  registerZines(app, db)
  registerSocial(app, db)
  registerBoard(app, db)
  registerBagShelf(app, db)
  registerMail(app, db)
  registerJam(app, db)
  registerArchive(app, db)
  registerMargins(app, db)
  registerFest(app, db)
  registerCork(app, db)

  return app
}
