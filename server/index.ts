import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { openDb } from './db.ts'

const PORT = Number(process.env.PORT ?? 8787)
const db = openDb()
const app = createApp(db)

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Zineverse API on http://127.0.0.1:${info.port}`)
})
