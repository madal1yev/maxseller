import pg from 'pg'
import fs from 'node:fs'
import path from 'node:path'

const client = new pg.Client({
  host: '127.0.0.1',
  port: Number(process.env.PGLITE_PORT || 55433),
  user: 'postgres',
  database: 'postgres',
})
await client.connect()

await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
const file = path.resolve('prisma/migrations/20261117000000_init/migration.sql')
const sql = fs.readFileSync(file, 'utf8')
await client.query(sql)

const tables = await client.query(
  "select table_name from information_schema.tables where table_schema='public' order by table_name",
)
console.log(`Schema qo'llanildi: ${tables.rows.length} ta jadval`)
console.log(tables.rows.map((r) => r.table_name).join(', '))
await client.end()
