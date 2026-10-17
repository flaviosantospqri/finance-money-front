import { useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Icon } from '../../components/ui/Icon';
import { cashBookApi, type CashBookAnalytics } from '../../features/cash-book/cashBookApi';
import { investmentEvolutionApi, type MonthlyInvestmentEvolution } from '../../features/investment-evolution/investmentEvolutionApi';
import { formatCurrencyDecimal, formatMonthShort, formatMonthYear } from '../../lib/formatters';
import { usePersistentState } from '../../lib/usePersistentState';

type Props = {
  onOpenCashBook: () => void;
  onOpenClosing: () => void;
  onOpenInvestments: () => void;
};

type DashboardTotals = { income: string; expenses: string; net: string; investments: string };
type PeriodComparison = { income: string; expenses: string; net: string; investments: string };
type RootSlice = { id: string; name: string; amount: number };

const zeroTotals: DashboardTotals = { income: '0.00', expenses: '0.00', net: '0.00', investments: '0.00' };
const zeroComparison: PeriodComparison = { income: '0.00', expenses: '0.00', net: '0.00', investments: '0.00' };
const chartColors = ['#a3d900', '#00a878', '#5b7ddd', '#f59e0b', '#e6526b', '#9b6be8', '#16a6b6', '#e78343', '#76869a'];
const moneyAxis = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });

function sumMoney(values: string[]) {
  const cents = values.reduce((total, value) => {
    const normalized = value.trim();
    const negative = normalized.startsWith('-');
    const [whole = '0', fraction = ''] = normalized.replace(/^[+-]/, '').split('.');
    const amount = BigInt(whole || '0') * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
    return total + (negative ? -amount : amount);
  }, 0n);
  const sign = cents < 0n ? '-' : '';
  const absolute = cents < 0n ? -cents : cents;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`;
}

function subtractMoney(minuend: string, subtrahend: string) {
  const negativeSubtrahend = subtrahend.startsWith('-') ? subtrahend.slice(1) : `-${subtrahend}`;
  return sumMoney([minuend, negativeSubtrahend]);
}

function shiftMonth(month: string, offset: number) {
  const [year, value] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, value - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function currentMonth() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

function numeric(value: string | undefined) { return Number(value ?? 0); }

function MetricCard({ label, value, icon, tone, note, format = 'currency' }: { label: string; value: string; icon: 'wallet' | 'arrow-down' | 'arrow-up' | 'trend' | 'investments'; tone?: string; note: string; format?: 'currency' | 'text' }) {
  return <article className={`dashboard-metric${tone ? ` ${tone}` : ''}`}>
    <div className="dashboard-metric-heading"><span>{label}</span><i><Icon name={icon} size={16} /></i></div>
    <strong>{format === 'currency' ? formatCurrencyDecimal(value) : value}</strong>
    <small>{note}</small>
  </article>;
}

function ComparisonItem({ label, current, previous, lowerIsBetter = false }: { label: string; current: string; previous: string; lowerIsBetter?: boolean }) {
  const delta = subtractMoney(current, previous);
  const deltaValue = numeric(delta);
  const previousValue = numeric(previous);
  const percentage = previousValue === 0 ? null : (deltaValue / Math.abs(previousValue)) * 100;
  const status = deltaValue === 0 ? 'neutral' : (lowerIsBetter ? deltaValue < 0 : deltaValue > 0) ? 'positive' : 'negative';
  const sign = deltaValue > 0 ? '+' : deltaValue < 0 ? '−' : '';
  const amount = `${sign}${formatCurrencyDecimal(Math.abs(deltaValue).toFixed(2))}`;
  const percentLabel = percentage === null ? (deltaValue === 0 ? '0%' : 'sem base anterior') : `${percentage > 0 ? '+' : ''}${percentage.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

  return <div className="dashboard-comparison-item">
    <span>{label}</span>
    <strong className={status}>{amount}</strong>
    <small className={status}>{percentLabel}</small>
  </div>;
}

function ChartPanel({ title, subtitle, children, className = '', action }: { title: string; subtitle: string; children: React.ReactNode; className?: string; action?: React.ReactNode }) {
  return <article className={`panel dashboard-chart-panel ${className}`}>
    <header className="dashboard-chart-heading"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</header>
    {children}
  </article>;
}

function ChartTooltip({ active, payload, label, month = false }: { active?: boolean; payload?: { name?: string; value?: string | number; color?: string }[]; label?: string; month?: boolean }) {
  if (!active || !payload?.length) return null;
  return <div className="dashboard-tooltip">
    {label && <strong>{month ? formatMonthYear(label) : label}</strong>}
    {payload.map((item) => <div key={item.name} className="dashboard-tooltip-row"><i style={{ background: item.color }} /><span>{item.name}</span><b>{formatCurrencyDecimal(String(item.value ?? 0))}</b></div>)}
  </div>;
}

function CategoryLegend({ rows, selectedId, onSelect }: { rows: RootSlice[]; selectedId?: string; onSelect?: (id: string) => void }) {
  return <div className="dashboard-pie-legend">
    {rows.map((row, index) => <button key={row.id} className={row.id === selectedId ? 'selected' : ''} onClick={() => onSelect?.(row.id)} title={`${row.name}: ${formatCurrencyDecimal(row.amount.toFixed(2))}`}>
      <i style={{ background: chartColors[index % chartColors.length] }} /><span>{row.name}</span><b>{moneyAxis.format(row.amount)}</b>
    </button>)}
  </div>;
}

export function DashboardPage({ onOpenCashBook, onOpenClosing, onOpenInvestments }: Props) {
  const month = currentMonth();
  const [rangeMonths, setRangeMonths] = usePersistentState('fllatech-money-dashboard-range', 12);
  const [analytics, setAnalytics] = useState<CashBookAnalytics>({ monthly: [], categoryExpenses: [] });
  const [investmentRows, setInvestmentRows] = useState<MonthlyInvestmentEvolution[]>([]);
  const [totals, setTotals] = useState<DashboardTotals>(zeroTotals);
  const [comparison, setComparison] = useState<PeriodComparison>(zeroComparison);
  const [hasAccounts, setHasAccounts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const fromMonth = shiftMonth(month, 1 - rangeMonths);
  const previousToMonth = shiftMonth(fromMonth, -1);
  const previousFromMonth = shiftMonth(previousToMonth, 1 - rangeMonths);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void Promise.all([
      cashBookApi.getAccounts(),
      cashBookApi.getAnalytics(fromMonth, month),
      investmentEvolutionApi.getMonthly({ fromMonth, toMonth: month }),
      investmentEvolutionApi.getSummary({ fromMonth, toMonth: month }),
      cashBookApi.getAnalytics(previousFromMonth, previousToMonth),
      investmentEvolutionApi.getSummary({ fromMonth: previousFromMonth, toMonth: previousToMonth }),
    ]).then(([accounts, cashData, investmentData, investmentSummary, previousCashData, previousInvestmentSummary]) => {
      if (!active) return;
      setHasAccounts(accounts.length > 0);
      setAnalytics(cashData);
      setInvestmentRows(investmentData);
      setTotals({
        income: sumMoney(cashData.monthly.map((row) => row.income)),
        expenses: sumMoney(cashData.monthly.map((row) => row.expenses)),
        net: sumMoney(cashData.monthly.map((row) => row.net)),
        investments: investmentSummary.variation,
      });
      setComparison({
        income: sumMoney(previousCashData.monthly.map((row) => row.income)),
        expenses: sumMoney(previousCashData.monthly.map((row) => row.expenses)),
        net: sumMoney(previousCashData.monthly.map((row) => row.net)),
        investments: previousInvestmentSummary.variation,
      });
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os dados financeiros.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fromMonth, month, previousFromMonth, previousToMonth, retryKey]);

  const monthlyRows = useMemo(() => analytics.monthly.map((row) => ({
    ...row,
    incomeValue: numeric(row.income),
    expenseValue: numeric(row.expenses),
    netValue: numeric(row.net),
    debtValue: numeric(row.debtPayments),
    investmentValue: numeric(investmentRows.find((item) => item.month === row.month)?.endingBalance),
    contributionValue: numeric(investmentRows.find((item) => item.month === row.month)?.contributions),
  })), [analytics.monthly, investmentRows]);

  const periodCategories = useMemo(() => analytics.categoryExpenses.filter((row) => row.month >= fromMonth && row.month <= month), [analytics.categoryExpenses, fromMonth, month]);
  const rootSlices = useMemo(() => {
    const groups = new Map<string, RootSlice>();
    for (const row of periodCategories) {
      const id = row.parentCategoryId ?? row.categoryId ?? 'uncategorized';
      const name = row.parentCategoryName ?? row.categoryName ?? 'Sem categoria';
      const group = groups.get(id) ?? { id, name, amount: 0 };
      group.amount += numeric(row.amount);
      groups.set(id, group);
    }
    return [...groups.values()].sort((a, b) => b.amount - a.amount);
  }, [periodCategories]);
  const [selectedRootId, setSelectedRootId] = useState('');
  const activeRootId = rootSlices.some((row) => row.id === selectedRootId) ? selectedRootId : rootSlices[0]?.id ?? '';
  const selectedRoot = rootSlices.find((row) => row.id === activeRootId);
  const subcategorySlices = useMemo(() => {
    const groups = new Map<string, RootSlice>();
    for (const row of periodCategories) {
      if (row.parentCategoryId === activeRootId) {
        const id = row.categoryId ?? 'uncategorized';
        const name = row.categoryName ?? 'Sem categoria';
        const group = groups.get(id) ?? { id, name, amount: 0 };
        group.amount += numeric(row.amount);
        groups.set(id, group);
      } else if (!row.parentCategoryId && row.categoryId === activeRootId) {
        const group = groups.get('direct') ?? { id: 'direct', name: 'Lançamentos diretos', amount: 0 };
        group.amount += numeric(row.amount);
        groups.set('direct', group);
      }
    }
    return [...groups.values()].sort((a, b) => b.amount - a.amount);
  }, [periodCategories, activeRootId]);
  const periodLabel = `${formatMonthYear(fromMonth)} a ${formatMonthYear(month)}`;
  const previousPeriodLabel = `${formatMonthYear(previousFromMonth)} a ${formatMonthYear(previousToMonth)}`;
  const margin = numeric(totals.income) === 0 ? 0 : (numeric(totals.net) / numeric(totals.income)) * 100;

  return <main className="page-content dashboard-page">
    <section className="panel dashboard-overview">
      <div><span className="dashboard-eyebrow">SAÚDE FINANCEIRA</span><h2>Seu dinheiro, em perspectiva</h2><p>Receitas, patrimônio e despesas consolidados no período selecionado.</p></div>
      <div className="dashboard-actions">
        <button className="secondary-button" onClick={onOpenClosing}>Fechamento</button>
        <button className="secondary-button" onClick={onOpenInvestments}><Icon name="trend" size={15} /> Evolução de investimentos</button>
        <button className="primary-button" onClick={onOpenCashBook}><Icon name="book" size={16} /> Abrir Livro Caixa</button>
      </div>
    </section>

    {error ? <section className="panel dashboard-state" role="alert"><p>{error}</p><button className="secondary-button" onClick={() => setRetryKey((value) => value + 1)}>Tentar novamente</button></section> : null}
    {loading ? <section className="panel dashboard-state"><span className="loading-spinner" /> Reunindo seus dados financeiros…</section> : null}

    {!loading && !error && !hasAccounts ? <section className="panel dashboard-empty"><span className="placeholder-icon"><Icon name="bank" size={22} /></span><h2>Comece pelo Livro Caixa</h2><p>Cadastre uma conta financeira para acompanhar receitas, despesas e investimentos neste painel.</p><button className="primary-button" onClick={onOpenCashBook}>Abrir Livro Caixa</button></section> : null}

    {!loading && !error && hasAccounts && <>
      <section className="dashboard-metrics" aria-label="Indicadores do período">
        <MetricCard label="Receitas do período" value={totals.income} icon="arrow-down" tone="positive" note={periodLabel} />
        <MetricCard label="Despesas do período" value={totals.expenses} icon="arrow-up" tone="negative" note={periodLabel} />
        <MetricCard label="Resultado do período" value={totals.net} icon="trend" tone={numeric(totals.net) < 0 ? 'negative' : 'positive'} note="Receitas menos despesas" />
        <MetricCard label="Margem líquida" value={`${margin.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`} icon="trend" tone={margin < 0 ? 'negative' : 'positive'} note="Resultado ÷ receitas" format="text" />
        <MetricCard label="Variação patrimonial" value={totals.investments} icon="investments" tone={numeric(totals.investments) < 0 ? 'negative' : 'positive'} note={periodLabel} />
      </section>

      <section className="dashboard-comparison" aria-label="Comparação com o período anterior">
        <header><strong>Comparado ao período anterior</strong><span>{previousPeriodLabel}</span></header>
        <div className="dashboard-comparison-grid">
          <ComparisonItem label="Receitas" current={totals.income} previous={comparison.income} />
          <ComparisonItem label="Despesas" current={totals.expenses} previous={comparison.expenses} lowerIsBetter />
          <ComparisonItem label="Resultado" current={totals.net} previous={comparison.net} />
          <ComparisonItem label="Variação patrimonial" current={totals.investments} previous={comparison.investments} />
        </div>
      </section>

      <section className="dashboard-range-bar">
        <div><strong>Evolução financeira</strong><span>Período: {periodLabel}</span></div>
        <div className="dashboard-range-options" role="group" aria-label="Período dos gráficos">
          {[6, 12, 24].map((range) => <button key={range} className={rangeMonths === range ? 'active' : ''} aria-pressed={rangeMonths === range} onClick={() => setRangeMonths(range)}>{range} meses</button>)}
        </div>
      </section>

      <section className="dashboard-chart-grid">
        <ChartPanel title="Receitas e despesas" subtitle={`Fluxo mensal registrado no Livro Caixa · ${periodLabel}`} className="dashboard-chart-large">
          <div className="dashboard-chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthlyRows} margin={{ top: 12, right: 12, bottom: 4, left: 8 }}>
            <defs><linearGradient id="dashboardIncomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00a878" stopOpacity={0.24} /><stop offset="95%" stopColor="#00a878" stopOpacity={0.01} /></linearGradient><linearGradient id="dashboardExpenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e6526b" stopOpacity={0.2} /><stop offset="95%" stopColor="#e6526b" stopOpacity={0.01} /></linearGradient></defs>
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 5" vertical={false} /><XAxis dataKey="month" tickFormatter={formatMonthShort} tick={{ fill: 'var(--text-soft)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} interval={rangeMonths > 12 ? 1 : 0} /><YAxis tickFormatter={(value) => moneyAxis.format(Number(value))} width={78} tick={{ fill: 'var(--text-soft)', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip content={<ChartTooltip month />} /><Legend />
            <Area type="monotone" dataKey="incomeValue" name="Receitas" stroke="#00a878" fill="url(#dashboardIncomeFill)" strokeWidth={2.5} activeDot={{ r: 5 }} />
            <Area type="monotone" dataKey="expenseValue" name="Despesas" stroke="#e6526b" fill="url(#dashboardExpenseFill)" strokeWidth={2.5} activeDot={{ r: 5 }} />
          </AreaChart></ResponsiveContainer></div>
        </ChartPanel>

        <ChartPanel title="Patrimônio investido" subtitle={`Saldo acumulado e aportes por mês · ${periodLabel}`} className="dashboard-chart-large" action={<button className="dashboard-chart-link" onClick={onOpenInvestments}>Detalhar <Icon name="investments" size={14} /></button>}>
          <div className="dashboard-chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthlyRows} margin={{ top: 12, right: 12, bottom: 4, left: 8 }}>
            <defs><linearGradient id="dashboardInvestmentFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a3d900" stopOpacity={0.28} /><stop offset="95%" stopColor="#a3d900" stopOpacity={0.01} /></linearGradient></defs>
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 5" vertical={false} /><XAxis dataKey="month" tickFormatter={formatMonthShort} tick={{ fill: 'var(--text-soft)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} interval={rangeMonths > 12 ? 1 : 0} /><YAxis tickFormatter={(value) => moneyAxis.format(Number(value))} width={78} tick={{ fill: 'var(--text-soft)', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip content={<ChartTooltip month />} /><Legend />
            <Area type="monotone" dataKey="investmentValue" name="Patrimônio" stroke="#8cbd00" fill="url(#dashboardInvestmentFill)" strokeWidth={3} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="contributionValue" name="Aportes" stroke="#5b7ddd" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 2 }} activeDot={{ r: 5 }} />
          </AreaChart></ResponsiveContainer></div>
        </ChartPanel>

        <ChartPanel title="Pagamentos de dívidas e parcelas" subtitle={`Lançamentos por mês · ${periodLabel}`} className="dashboard-chart-large">
          {monthlyRows.some((row) => row.debtValue > 0) ? <div className="dashboard-chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthlyRows} margin={{ top: 12, right: 12, bottom: 4, left: 8 }}>
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="4 5" vertical={false} /><XAxis dataKey="month" tickFormatter={formatMonthShort} tick={{ fill: 'var(--text-soft)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} interval={rangeMonths > 12 ? 1 : 0} /><YAxis tickFormatter={(value) => moneyAxis.format(Number(value))} width={78} tick={{ fill: 'var(--text-soft)', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip content={<ChartTooltip month />} />
            <Bar dataKey="debtValue" name="Pagamentos identificados" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={42} />
          </BarChart></ResponsiveContainer></div> : <div className="dashboard-chart-empty"><span className="dashboard-empty-icon"><Icon name="trend" size={20} /></span><strong>Nenhum pagamento identificado neste período</strong><p>O painel reconhece lançamentos com termos como dívida, empréstimo, financiamento ou parcela na categoria ou descrição.</p></div>}
        </ChartPanel>

        <ChartPanel title="Despesas por categoria" subtitle={`Distribuição dos lançamentos · ${periodLabel}`} className="dashboard-chart-large">
          {rootSlices.length ? <>
            <div className="dashboard-pie-layout"><div className="dashboard-pie-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={rootSlices} dataKey="amount" nameKey="name" innerRadius="54%" outerRadius="78%" paddingAngle={2} stroke="var(--surface)" strokeWidth={3} onClick={(_, index) => { const row = rootSlices[Number(index)]; if (row) setSelectedRootId(row.id); }}>{rootSlices.map((row, index) => <Cell key={row.id} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip content={<ChartTooltip />} /></PieChart></ResponsiveContainer></div><div className="dashboard-pie-total"><span>Total de despesas</span><strong>{formatCurrencyDecimal(totals.expenses)}</strong><small>Clique em uma categoria para detalhar</small></div></div>
            <CategoryLegend rows={rootSlices} selectedId={activeRootId} onSelect={setSelectedRootId} />
          </> : <div className="dashboard-chart-empty"><span className="dashboard-empty-icon"><Icon name="reports" size={20} /></span><strong>Sem despesas categorizadas neste período</strong><p>Quando houver lançamentos no Livro Caixa, a distribuição por categoria aparecerá aqui.</p></div>}
        </ChartPanel>

        <ChartPanel title="Detalhe por subcategoria" subtitle={selectedRoot ? `Composição de ${selectedRoot.name} · ${periodLabel}` : 'Selecione uma categoria no gráfico ao lado'} className="dashboard-chart-large">
          {subcategorySlices.length ? <><div className="dashboard-pie-layout"><div className="dashboard-pie-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={subcategorySlices} dataKey="amount" nameKey="name" innerRadius="54%" outerRadius="78%" paddingAngle={2} stroke="var(--surface)" strokeWidth={3}>{subcategorySlices.map((row, index) => <Cell key={row.id} fill={chartColors[(index + 1) % chartColors.length]} />)}</Pie><Tooltip content={<ChartTooltip />} /></PieChart></ResponsiveContainer></div><div className="dashboard-pie-total"><span>{selectedRoot?.name ?? 'Categoria'}</span><strong>{formatCurrencyDecimal((selectedRoot?.amount ?? 0).toFixed(2))}</strong><small>Total no período</small></div></div><CategoryLegend rows={subcategorySlices} /></> : <div className="dashboard-chart-empty"><span className="dashboard-empty-icon"><Icon name="reports" size={20} /></span><strong>{selectedRoot ? 'Sem detalhamento por subcategoria' : 'Escolha uma categoria'}</strong><p>{selectedRoot ? 'Esta categoria ainda não tem lançamentos em subcategorias no período selecionado.' : 'Clique em uma categoria para ver as subcategorias e os lançamentos diretos.'}</p></div>}
        </ChartPanel>
      </section>

      <section className="dashboard-bottom-bar"><span><i /> Dados consolidados de {periodLabel}.</span><button className="text-link" onClick={onOpenCashBook}>Ver movimentações <Icon name="trend" size={14} /></button></section>
    </>}
  </main>;
}
