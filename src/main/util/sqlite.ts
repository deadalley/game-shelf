import { promises as fs } from 'node:fs'
import { createRequire } from 'node:module'
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'

let sqlPromise: Promise<SqlJsStatic> | null = null

function loadSql(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    const require = createRequire(import.meta.url)
    // The wasm is unpacked from the asar archive in packaged builds.
    const wasm = require.resolve('sql.js/dist/sql-wasm.wasm').replace('app.asar', 'app.asar.unpacked')
    sqlPromise = initSqlJs({ locateFile: () => wasm })
  }
  return sqlPromise
}

/**
 * Opens a SQLite file read-only by loading a copy into memory.
 * Launchers keep their databases open, so reading the bytes is safer than opening the file.
 */
export async function openDatabase(path: string): Promise<Database | null> {
  try {
    const [SQL, bytes] = await Promise.all([loadSql(), fs.readFile(path)])
    return new SQL.Database(bytes)
  } catch {
    return null
  }
}

export function queryAll<T = Record<string, unknown>>(db: Database, sql: string): T[] {
  try {
    const res = db.exec(sql)
    if (!res.length) return []
    const { columns, values } = res[0]
    return values.map((row) => Object.fromEntries(columns.map((c, i) => [c, row[i]])) as T)
  } catch {
    return []
  }
}
