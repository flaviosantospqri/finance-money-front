export const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

export function formatCurrencyDecimal(value: string) {
  const isNegative = value.startsWith('-')
  const [whole = '0', fraction = ''] = value.replace('-', '').split('.')
  const groupedWhole = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(BigInt(whole || '0'))
  return `${isNegative ? '- ' : ''}R$\u00a0${groupedWhole},${fraction.padEnd(2, '0').slice(0, 2)}`
}

export function formatDate(value: string) {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

export function capitalizeFirst(value: string) {
  return value ? `${value.slice(0, 1).toLocaleUpperCase('pt-BR')}${value.slice(1)}` : value
}

export function formatMonthYear(value: string) {
  const [year, month] = value.split('-').map(Number)
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(year, month - 1, 1))
  return capitalizeFirst(label)
}

export function formatMonthShort(value: string) {
  const [year, month] = value.split('-').map(Number)
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
    .format(new Date(year, month - 1, 1))
    .replace('.', '')
  return capitalizeFirst(label)
}
