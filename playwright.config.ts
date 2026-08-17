import { defineConfig } from '@playwright/test'

const ci = Boolean(process.env.CI)

export default defineConfig({
  testDir: 'e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    ...(ci ? {} : { channel: 'chrome' }),
    headless: true,
    viewport: { width: 1440, height: 900 },
    permissions: ['clipboard-read', 'clipboard-write'],
    trace: 'off',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !ci,
    timeout: 120_000,
  },
})
