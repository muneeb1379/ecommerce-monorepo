import { existsSync } from 'node:fs'

/**
 * Loads `.env` files into process.env. The app-local `.env` wins, then the
 * monorepo root `.env` (shared with the admin app). Already-set variables are
 * never overwritten, so real environment variables take precedence over both.
 */
export function loadEnvFiles(): void {
  for (const file of ['.env', '../../.env']) {
    if (existsSync(file)) process.loadEnvFile(file)
  }
}
