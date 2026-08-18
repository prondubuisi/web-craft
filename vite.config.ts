import http from 'node:http'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const DEFAULT_API_PORT = 8787

/**
 * Routes /api to a per-Playwright-worker backend when the request carries
 * `x-e2e-worker` (see e2e/fixtures.ts), otherwise the normal dev API.
 * A plain middleware, not `server.proxy`, because this Vite's bundled
 * proxy does not invoke a `router` option — verified directly, not assumed.
 */
function apiProxy(): Plugin {
  return {
    name: 'api-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api')) return next()
        const worker = req.headers['x-e2e-worker']
        const port = typeof worker === 'string' ? DEFAULT_API_PORT + 1 + Number(worker) : DEFAULT_API_PORT
        const proxyReq = http.request(
          { host: '127.0.0.1', port, path: req.url, method: req.method, headers: req.headers },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers)
            proxyRes.pipe(res)
          },
        )
        proxyReq.on('error', (err) => {
          res.writeHead(502)
          res.end(String(err))
        })
        req.pipe(proxyReq)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiProxy()],
  base: process.env.GITHUB_PAGES === 'true' ? '/web-craft/' : '/',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
})
