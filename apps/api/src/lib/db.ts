import postgres from 'postgres'

/**
 * Anything that can run a query: the pool or an open transaction.
 * Repository functions take an Executor as their first argument so the same
 * function works standalone or inside a service-managed transaction.
 */
export type Executor = postgres.ISql

/** A composable SQL fragment, e.g. a dynamic WHERE clause. */
export type Fragment = postgres.PendingQuery<postgres.Row[]>

export interface Database {
  sql: Executor
  /** Runs `fn` in a transaction; rolls back if it throws. */
  transaction<T>(fn: (tx: Executor) => Promise<T>): Promise<T>
  ping(): Promise<void>
  close(): Promise<void>
}

export interface DatabaseOptions {
  url: string
  poolMax: number
  ssl: boolean
}

export function createDatabase(options: DatabaseOptions): Database {
  const sql = postgres(options.url, {
    max: options.poolMax,
    ssl: options.ssl ? 'require' : false,
    idle_timeout: 30,
    connect_timeout: 10,
    // Supabase's transaction-mode pooler (port 6543) does not support
    // prepared statements. Disabling them works with both pooler modes.
    prepare: false,
    // snake_case columns → camelCase properties, and camelCase keys → snake_case
    // columns when using sql(object) helpers.
    transform: postgres.camel,
    onnotice: () => {},
  })

  return {
    sql,
    async transaction<T>(fn: (tx: Executor) => Promise<T>): Promise<T> {
      return (await sql.begin((tx) => fn(tx))) as T
    },
    async ping() {
      await sql`select 1`
    },
    async close() {
      await sql.end({ timeout: 5 })
    },
  }
}

/**
 * `SET col = value, ...` fragment for a partial update. Keys are camelCase
 * and converted to snake_case columns by the camel transform. Callers must
 * only pass keys they control (never raw request objects).
 */
export function setClause(sql: Executor, values: Record<string, unknown>): Fragment {
  // postgres.js's helper overloads cannot express "any record"; the cast is
  // confined to this function.
  return (sql as unknown as (row: object, columns: string[]) => Fragment)(values, Object.keys(values))
}
