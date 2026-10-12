import { Icon, type IconName } from '../ui/Icon'

const summaries: { label: string; value: string; trend: string; note: string; icon: IconName; tone: string }[] = [
  { label: 'Saldo Atual', value: 'R$ 148.520,00', trend: '+12,4%', note: 'vs. mês anterior', icon: 'wallet', tone: 'green' },
  { label: 'Receitas do Mês', value: 'R$ 42.800,00', trend: '+8,1%', note: 'vs. meta mensal', icon: 'arrow-down', tone: 'neutral' },
  { label: 'Despesas do Mês', value: 'R$ 18.350,00', trend: '-3,5%', note: 'redução de custos', icon: 'arrow-up', tone: 'neutral' },
  { label: 'Resultado Mensal', value: 'R$ 24.450,00', trend: '+15,2%', note: 'superávit operacional', icon: 'trend', tone: 'neutral' },
]

export function SummaryCards() {
  return (
    <section className="summary-grid" aria-label="Resumo financeiro">
      {summaries.map((summary) => (
        <article className={`summary-card ${summary.tone === 'green' ? 'summary-card-highlight' : ''}`} key={summary.label}>
          <div className="summary-topline"><span>{summary.label}</span><span className="summary-icon"><Icon name={summary.icon} size={16} /></span></div>
          <strong className="summary-value">{summary.value}</strong>
          <div className="summary-foot"><span className="trend-chip"><Icon name="trend" size={11} />{summary.trend}</span><span>{summary.note}</span></div>
        </article>
      ))}
    </section>
  )
}
