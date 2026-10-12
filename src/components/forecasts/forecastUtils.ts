export const currentDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const normalizeMoney = (value: string) =>
  value.trim().includes(',')
    ? value.trim().replace(/\./g, '').replace(',', '.')
    : value.trim();
export const statusLabel: Record<
  'pending' | 'partial' | 'realized' | 'overdue' | 'cancelled',
  string
> = {
  pending: 'Pendente',
  partial: 'Parcial',
  realized: 'Realizado',
  overdue: 'Vencido',
  cancelled: 'Cancelado',
};
export function allocatedAmount(amount: string, percentage: string) {
  const [whole = '0', fraction = ''] = amount.split('.');
  const cents =
    BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
  const [percentWhole = '0', percentFraction = ''] = percentage.split('.');
  const basis =
    BigInt(percentWhole) * 100n +
    BigInt(percentFraction.padEnd(2, '0').slice(0, 2));
  const result = (cents * basis + 5000n) / 10000n;
  return `${result / 100n}.${(result % 100n).toString().padStart(2, '0')}`;
}
