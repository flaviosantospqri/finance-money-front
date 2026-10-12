import { Icon, type IconName } from '../ui/Icon';
import { formatCurrencyDecimal } from '../../lib/formatters';
import type { CashBookSummary } from '../../features/cash-book/cashBookApi';

type Totals = Pick<
  CashBookSummary,
  'closingBalance' | 'incomeTotal' | 'expenseTotal' | 'netMovement'
>;

const metrics: {
  label: string;
  key: keyof Totals;
  icon: IconName;
  tone: string;
}[] = [
  { label: 'Saldo consolidado', key: 'closingBalance', icon: 'wallet', tone: 'green' },
  { label: 'Entradas do mês', key: 'incomeTotal', icon: 'arrow-down', tone: 'income' },
  { label: 'Saídas do mês', key: 'expenseTotal', icon: 'arrow-up', tone: 'expense' },
  { label: 'Resultado do mês', key: 'netMovement', icon: 'trend', tone: 'neutral' },
];

export function SummaryCards({ totals }: { totals: Totals }) {
  return (
    <section className="summary-grid" aria-label="Resumo financeiro">
      {metrics.map((metric) => (
        <article className={`summary-card ${metric.tone === 'green' ? 'summary-card-highlight' : ''}`} key={metric.key}>
          <div className="summary-topline">
            <span>{metric.label}</span>
            <span className="summary-icon"><Icon name={metric.icon} size={16} /></span>
          </div>
          <strong className="summary-value">{formatCurrencyDecimal(totals[metric.key])}</strong>
        </article>
      ))}
    </section>
  );
}
