import { defineConfig } from '@playwright/test'

const ci = Boolean(process.env.CI)
const headed = process.env.HEADED === '1'

export default defineConfig({
  testDir: 'e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  // Each worker spawns its own API process + isolated SQLite file (e2e/fixtures.ts).
  // CI runners are 4 vCPUs total; stay conservative there to avoid contention.
  workers: ci ? 2 : 4,
  retries: ci ? 1 : 0,
  reporter: [['list']],
  use: {
    // Same origin as `npm run dev` and the browser. Do not use localhost — Vite is bound to 127.0.0.1.
    baseURL: 'http://127.0.0.1:5173',
    ...(ci ? {} : { channel: 'chrome' }),
    headless: !headed,
    viewport: { width: 1440, height: 900 },
    permissions: ['clipboard-read', 'clipboard-write'],
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !ci,
    timeout: 120_000,
  },
})
