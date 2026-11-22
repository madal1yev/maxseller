import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Works whether Vercel runs from the repo root or from maxseller-app.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const app = path.join(repoRoot, 'maxseller-app')

execSync('npm install --no-audit --no-fund', { cwd: app, stdio: 'inherit' })
execSync('npm run build', { cwd: app, stdio: 'inherit' })
