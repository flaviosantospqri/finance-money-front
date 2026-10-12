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
