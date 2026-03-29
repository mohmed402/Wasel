/**
 * Download Playwright Chromium after npm install (Railway, local).
 * On Vercel, set SKIP_PLAYWRIGHT_BROWSER=1 when using SHEIN_SCRAPER_SERVICE_URL only.
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cli = join(root, 'node_modules', 'playwright', 'cli.js')

if (process.env.SKIP_PLAYWRIGHT_BROWSER === '1') {
  process.exit(0)
}

if (!existsSync(cli)) {
  process.exit(0)
}

const r = spawnSync(process.execPath, [cli, 'install', 'chromium'], {
  cwd: root,
  stdio: 'inherit',
})
process.exit(r.status === null ? 1 : r.status)
