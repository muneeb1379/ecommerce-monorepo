const DEFAULT_CURRENCY = 'USD'

const currencyFormatters = new Map<string, Intl.NumberFormat>()

function currencyFormatter(currency: string): Intl.NumberFormat {
  let formatter = currencyFormatters.get(currency)
  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency })
    } catch {
      // Unknown ISO code from config: fall back instead of crashing the page.
      formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: DEFAULT_CURRENCY })
    }
    currencyFormatters.set(currency, formatter)
  }
  return formatter
}

const numberFormatter = new Intl.NumberFormat('en-US')

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

export function formatCurrency(amount: number, currency: string = DEFAULT_CURRENCY): string {
  return currencyFormatter(currency).format(amount)
}

/** The currency symbol alone (e.g. "$"), for input prefixes. */
export function currencySymbol(currency: string = DEFAULT_CURRENCY): string {
  return (
    currencyFormatter(currency)
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value ?? currency
  )
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

export function formatDateTime(iso: string): string {
  return dateTimeFormatter.format(new Date(iso))
}

export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso))
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}
