/**
 * Per-worker backend isolation. Each Playwright worker gets its own Hono
 * API process on its own port, backed by its own temp SQLite file (via the
 * `PORT` / `DATABASE_PATH` env vars `server/index.ts` already reads). Every
 * spec imports `test`/`expect` from here instead of `@playwright/test` so
 * board / mail / cork / claims never race across workers.
 *
 * Routing: vite.config.ts's `api-proxy` plugin sends `/api` to
 * `8788 + workerIndex` when a request carries `x-e2e-worker`; the `context`
 * fixture below sets that header for every request the worker's pages make.
 */
import { expect, test as base } from '@playwright/test'
import { type ChildProcess, spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const WORKER_API_BASE_PORT = 8788

/** The `x-e2e-worker` value for a worker's `apiPort` — pass to routedContext/openSecondDesk. */
export function workerHeader(apiPort: number): string {
  return String(apiPort - WORKER_API_BASE_PORT)
}

async function waitForHealth(port: number, timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`)
      if (res.ok) return
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error(`worker API on :${port} did not become healthy within ${timeoutMs}ms`)
}

export const test = base.extend<object, { workerApiPort: number }>({
  workerApiPort: [
    // oxlint-disable-next-line no-empty-pattern -- Playwright's fixture signature requires this first param.
    async ({}, provide, workerInfo) => {
      const port = WORKER_API_BASE_PORT + workerInfo.workerIndex
      const dbDir = mkdtempSync(join(tmpdir(), 'zineverse-e2e-'))
      const dbPath = join(dbDir, `worker-${workerInfo.workerIndex}.sqlite`)
      const proc: ChildProcess = spawn(
        process.execPath,
        [join(process.cwd(), 'node_modules/.bin/tsx'), 'server/index.ts'],
        {
          cwd: process.cwd(),
          env: { ...process.env, PORT: String(port), DATABASE_PATH: dbPath },
          stdio: 'pipe',
        },
      )
      let stderr = ''
      proc.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString()
      })

      try {
        await waitForHealth(port)
      } catch (err) {
        proc.kill()
        rmSync(dbDir, { recursive: true, force: true })
        throw new Error(`${(err as Error).message}\n${stderr}`)
      }

      await provide(port)

      proc.kill()
      rmSync(dbDir, { recursive: true, force: true })
    },
    { scope: 'worker', auto: true },
  ],

  // Header-scoped to /api only — setExtraHTTPHeaders is context-wide and broke
  // cross-origin Google Fonts preflight (the header isn't in their allowlist).
  context: async ({ context, workerApiPort }, provide) => {
    const worker = workerHeader(workerApiPort)
    await context.route('**/api/**', (route) => {
      route.continue({ headers: { ...route.request().headers(), 'x-e2e-worker': worker } })
    })
    await provide(context)
  },
})

export { expect }
