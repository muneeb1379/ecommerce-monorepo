/**
 * Money helpers. Prices are stored as numeric(12,2) and exposed as JSON
 * numbers with two decimals. Arithmetic is done in integer cents so totals
 * never drift from floating point error.
 */

export const toCents = (amount: number): number => Math.round(amount * 100)

export const fromCents = (cents: number): number => cents / 100
