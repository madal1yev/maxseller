import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vitest/config'

/** API manbai NodeNext bo'lgani uchun `.js` importlarni `.ts` fayllarga bog'laydi. */
const resolveJsToTs = {
  name: 'resolve-js-to-ts',
  enforce: 'pre' as const,
  resolveId(source: string, importer: string | undefined) {
    if (!importer || !source.endsWith('.js')) return null
    const target = path.resolve(path.dirname(importer), source.replace(/\.js$/, '.ts'))
    return fs.existsSync(target) ? target : null
  },
}

export default defineConfig({
  plugins: [resolveJsToTs],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 60000,
    hookTimeout: 60000,
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
})
