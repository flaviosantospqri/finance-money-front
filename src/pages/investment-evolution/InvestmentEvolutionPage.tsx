import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import type { FinancialAccount } from "../../features/cash-book/cashBookApi";
import { investmentEvolutionApi, type InvestmentEvolutionSummary, type MonthlyInvestmentEvolution } from "../../features/investment-evolution/investmentEvolutionApi";
import type { InvestmentApplication } from "../../features/investments/investmentsApi";
import { formatCurrencyDecimal, formatMonthShort, formatMonthYear } from "../../lib/formatters";
import { usePersistentState } from "../../lib/usePersistentState";
import { MonthNavigator } from "../../components/ui/MonthNavigator";
import { SelectField } from "../../components/ui/SelectField";

const currentYear = new Date().getFullYear();
const monthLabel = (value: string) => formatMonthShort(value);
const fullMonthLabel = (value: string) => formatMonthYear(value);
type ComparisonMonth = { monthly: MonthlyInvestmentEvolution; summary: InvestmentEvolutionSummary };

export function InvestmentEvolutionPage() {
  const initialMonth = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [fromMonth, setFromMonth] = usePersistentState("fllatech-money-evolution-from-month", `${currentYear}-01`);
  const [toMonth, setToMonth] = usePersistentState("fllatech-money-evolution-to-month", initialMonth);
  const [allTime, setAllTime] = usePersistentState("fllatech-money-evolution-all-time", false);
  const [compareMonths, setCompareMonths] = usePersistentState("fllatech-money-evolution-compare-months", false);
  const [firstCompareMonth, setFirstCompareMonth] = usePersistentState("fllatech-money-evolution-first-month", `${currentYear}-01`);
  const [secondCompareMonth, setSecondCompareMonth] = usePersistentState("fllatech-money-evolution-second-month", initialMonth);
  const [accountId, setAccountId] = usePersistentState("fllatech-money-evolution-account", "");
  const [applicationId, setApplicationId] = usePersistentState("fllatech-money-evolution-application", "");
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [applications, setApplications] = useState<InvestmentApplication[]>([]);
  const [rows, setRows] = useState<MonthlyInvestmentEvolution[]>([]);
  const [summary, setSummary] = useState<InvestmentEvolutionSummary | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonMonth[]>([]);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePersistentState("fllatech-money-evolution-page-size", 10);
  const historyRows = compareMonths
    ? comparisonData.map((item) => item.monthly).filter((row, index, list) => list.findIndex((item) => item.month === row.month) === index)
    : rows;
  const pageCount = Math.max(1, Math.ceil(historyRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = historyRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    let active = true;
    Promise.all([investmentEvolutionApi.getAccounts(), investmentEvolutionApi.getApplications()])
      .then(([loadedAccounts, loadedApplications]) => {
        if (!active) return;
        setAccounts(loadedAccounts);
        setApplications(loadedApplications);
        setAccountId((current) => loadedAccounts.some((account) => account.id === current) ? current : "");
        setApplicationId((current) => loadedApplications.some((app) => app.id === current) ? current : "");
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Falha ao carregar filtros."); });
    return () => { active = false; };
  }, []);

  const filteredApplications = useMemo(() => applications.filter((app) => !accountId || app.accountId === accountId), [applications, accountId]);
  const filters = useMemo(() => ({ fromMonth: allTime ? undefined : fromMonth, toMonth: allTime ? undefined : toMonth, allTime: allTime || undefined, accountId: accountId || undefined, applicationId: applicationId || undefined }), [fromMonth, toMonth, allTime, accountId, applicationId]);

  useEffect(() => {
    let active = true;
    if (compareMonths) {
      setLoading(false);
      return () => { active = false; };
    }
    Promise.all([investmentEvolutionApi.getMonthly(filters), investmentEvolutionApi.getSummary(filters)])
      .then(([monthly, totals]) => {
        if (!active) return;
        setRows(monthly);
        setSummary(totals);
        setError("");
      })
      .catch((reason: unknown) => { if (active) { setRows([]); setSummary(null); setError(reason instanceof Error ? reason.message : "Não foi possível carregar a evolução dos investimentos."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, compareMonths]);

  useEffect(() => {
    if (!compareMonths) return;
    let active = true;
    setComparisonLoading(true);
    const requestMonth = async (month: string): Promise<ComparisonMonth> => {
      const monthFilters = { fromMonth: month, toMonth: month, accountId: accountId || undefined, applicationId: applicationId || undefined };
      const [monthlyRows, totals] = await Promise.all([
        investmentEvolutionApi.getMonthly(monthFilters),
        investmentEvolutionApi.getSummary(monthFilters),
      ]);
      const monthly = monthlyRows[0] ?? { month, contributions: "0.00", withdrawals: "0.00", refunds: "0.00", income: "0.00", endingBalance: "0.00" };
      return { monthly, summary: totals };
    };
    Promise.all([requestMonth(firstCompareMonth), requestMonth(secondCompareMonth)])
      .then((data) => { if (active) { setComparisonData(data); setError(""); } })
      .catch((reason: unknown) => { if (active) { setComparisonData([]); setError(reason instanceof Error ? reason.message : "Não foi possível comparar os meses."); } })
      .finally(() => { if (active) setComparisonLoading(false); });
    return () => { active = false; };
  }, [compareMonths, firstCompareMonth, secondCompareMonth, accountId, applicationId]);

  useEffect(() => {
    setPage(1);
  }, [fromMonth, toMonth, allTime, compareMonths, firstCompareMonth, secondCompareMonth, accountId, applicationId]);

  function changeFromMonth(value: string) { setLoading(true); setFromMonth(value); if (value > toMonth) setToMonth(value); }

  function changeToMonth(value: string) { setLoading(true); setToMonth(value); if (value < fromMonth) setFromMonth(value); }

  function exportCsv() {
    const header = ["Mês", "Aportes", "Resgates", "Devoluções", "Rendimentos", "Saldo final"];
    if (compareMonths) {
      const lines = historyRows.map((row) => [fullMonthLabel(row.month), row.contributions, row.withdrawals, row.refunds, row.income, row.endingBalance]);
      const csv = [header, ...lines].map((line) => line.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(";")).join("\r\n");
      const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `comparacao-investimentos-${firstCompareMonth}-${secondCompareMonth}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      return;
    }
    const sum = (key: "contributions" | "withdrawals" | "refunds" | "income") => fromCents(rows.reduce((total, row) => total + toCents(row[key]), 0n));
    const lines = rows.map((row) => [fullMonthLabel(row.month), row.contributions, row.withdrawals, row.refunds, row.income, row.endingBalance]);
    lines.push(["Total do período", sum("contributions"), sum("withdrawals"), sum("refunds"), sum("income"), summary?.endingBalance ?? "0.00"]);
    const csv = [header, ...lines].map((line) => line.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `evolucao-investimentos-${allTime ? "todo-periodo" : `${fromMonth}-${toMonth}`}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const compareYears = !compareMonths && (allTime || fromMonth.slice(0, 4) !== toMonth.slice(0, 4));
  const comparisonYears = Array.from(new Set(rows.map((row) => row.month.slice(0, 4)))).sort();
  const yearColors = ["#00a878", "#5270d8", "#e35468", "#d97706", "#8b5cf6", "#0891b2", "#db2777", "#65a30d", "#7c3aed", "#475569"];
  const chartRows: Array<Record<string, string | number | null>> = compareMonths
    ? comparisonData.map(({ monthly }) => ({
        ...monthly,
        label: fullMonthLabel(monthly.month),
        netFlow: fromCents(toCents(monthly.contributions) + toCents(monthly.income) - toCents(monthly.withdrawals) - toCents(monthly.refunds)),
      }))
    : compareYears
    ? Array.from({ length: 12 }, (_, index) => {
        const month = String(index + 1).padStart(2, "0");
        const point: Record<string, string | number | null> = {
          label: formatMonthShort(`${comparisonYears[0] ?? currentYear}-${month}`),
        };
        for (const year of comparisonYears) {
          const row = rows.find((candidate) => candidate.month === `${year}-${month}`);
          point[`balance_${year}`] = row?.endingBalance ?? null;
          point[`contributions_${year}`] = row?.contributions ?? "0.00";
          point[`income_${year}`] = row?.income ?? "0.00";
          point[`withdrawals_${year}`] = row?.withdrawals ?? "0.00";
          point[`refunds_${year}`] = row?.refunds ?? "0.00";
          point[`flow_${year}`] = row
            ? fromCents(toCents(row.contributions) + toCents(row.income) - toCents(row.withdrawals) - toCents(row.refunds))
            : "0.00";
        }
        return point;
      })
    : rows.map((row) => ({ ...row, label: monthLabel(row.month) }));
  const total = (key: "contributions" | "withdrawals" | "refunds" | "income") => formatCurrencyDecimal(fromCents(rows.reduce((sum, row) => sum + toCents(row[key]), 0n)));

  return (
    <main className="page-content investment-evolution-page">
      <div className="investment-evolution-toolbar">
        <label className="investment-evolution-period-toggle"><input type="checkbox" checked={compareMonths} onChange={(event) => setCompareMonths(event.target.checked)} /><span>Comparar meses</span></label>
        {compareMonths ? <>
          <label>Mês 1<MonthNavigator ariaLabel="Primeiro mês para comparação" value={firstCompareMonth} onChange={setFirstCompareMonth} /></label>
          <label>Mês 2<MonthNavigator ariaLabel="Segundo mês para comparação" value={secondCompareMonth} onChange={setSecondCompareMonth} /></label>
        </> : <>
          <label className="investment-evolution-period-toggle"><input type="checkbox" checked={allTime} onChange={(event) => { setLoading(true); setAllTime(event.target.checked); }} /><span>Todo o período</span></label>
          <label>De<MonthNavigator ariaLabel="Mês e ano inicial" value={fromMonth} disabled={allTime} onChange={changeFromMonth} /></label>
          <label>Até<MonthNavigator ariaLabel="Mês e ano final" value={toMonth} disabled={allTime} onChange={changeToMonth} /></label>
        </>}
        <label>Conta<SelectField ariaLabel="Conta de investimento" value={accountId} onValueChange={(value) => { setLoading(true); setAccountId(value); setApplicationId(""); }} options={[{ value: '', label: 'Todas as contas' }, ...accounts.filter((account) => account.type === "investment").map((account) => ({ value: account.id, label: account.name }))]} /></label>
        <label>Aplicação<SelectField ariaLabel="Aplicação" value={applicationId} onValueChange={(value) => { setLoading(true); setApplicationId(value); }} options={[{ value: '', label: 'Todas as aplicações' }, ...filteredApplications.map((app) => ({ value: app.id, label: app.name }))]} /></label>
        <button className="secondary-button" onClick={exportCsv} disabled={compareMonths ? !comparisonData.length : !rows.length}>Exportar CSV</button>
      </div>

      {error && <div className="cash-book-error" role="alert">{error}</div>}
      <section className="summary-grid investment-evolution-summary" aria-label="Resumo da evolução">
        {compareMonths ? <>
          <CompareMetric label="Patrimônio acumulado" items={comparisonData} valueKey="endingBalance" months={[firstCompareMonth, secondCompareMonth]} />
          <CompareMetric label="Aportes no período" items={comparisonData} valueKey="contributions" months={[firstCompareMonth, secondCompareMonth]} positive />
          <CompareMetric label="Devoluções no período" items={comparisonData} valueKey="refunds" months={[firstCompareMonth, secondCompareMonth]} />
          <CompareMetric label="Rendimentos no período" items={comparisonData} valueKey="income" months={[firstCompareMonth, secondCompareMonth]} positive />
          <CompareMetric label="Variação patrimonial" items={comparisonData} valueKey="variation" months={[firstCompareMonth, secondCompareMonth]} />
        </> : <>
          <Metric label="Patrimônio acumulado" value={summary?.endingBalance ?? "0.00"} />
          <Metric label="Aportes no período" value={summary?.contributions ?? "0.00"} positive />
          <Metric label="Devoluções no período" value={summary?.refunds ?? "0.00"} />
          <Metric label="Rendimentos no período" value={summary?.income ?? "0.00"} positive />
          <Metric label="Variação patrimonial" value={summary?.variation ?? "0.00"} />
        </>}
      </section>

      {(compareMonths ? comparisonLoading : loading) ? <section className="panel investment-evolution-empty">{compareMonths ? "Carregando comparação dos meses…" : "Carregando evolução dos investimentos…"}</section> : (compareMonths ? comparisonData.length === 0 : rows.length === 0) ? <section className="panel investment-evolution-empty">Nenhuma aplicação ou movimentação encontrada para o período.</section> : <>
        <section className="investment-evolution-charts">
          <article className="panel investment-evolution-chart"><header><h2>Patrimônio ao longo do tempo</h2><p>{compareMonths ? "Patrimônio no fechamento de cada mês selecionado" : compareYears ? "Evolução mensal comparada entre os anos" : "Saldo consolidado no fechamento de cada mês"}</p></header><div className="investment-evolution-chart-area"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartRows} margin={{ top: 14, right: 18, bottom: 2, left: 4 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--row-border)"/><XAxis dataKey="label" tick={{ fill: "var(--text-soft)", fontSize: 12 }}/><YAxis tickFormatter={(value: number) => `R$ ${new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`} tick={{ fill: "var(--text-soft)", fontSize: 11 }}/><Tooltip contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--panel-border)", borderRadius: 8, color: "var(--text)", boxShadow: "0 8px 24px rgb(0 0 0 / 24%)" }} labelStyle={{ color: "var(--text)", fontWeight: 650 }} itemStyle={{ color: "var(--text-soft)" }} formatter={(value) => formatCurrencyDecimal(String(value ?? "0"))} labelFormatter={(label, payload) => compareYears ? String(label ?? "") : (payload?.[0]?.payload?.month ? fullMonthLabel(payload[0].payload.month) : String(label ?? ""))}/>{compareYears ? comparisonYears.map((year, index) => <Line key={year} type="monotone" dataKey={`balance_${year}`} name={year} stroke={yearColors[index % yearColors.length]} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={false}/>) : <Line type="monotone" dataKey="endingBalance" name="Patrimônio" stroke="#a8d500" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }}/>}</LineChart></ResponsiveContainer></div></article>
          <article className="panel investment-evolution-chart"><header><h2>{compareMonths ? "Movimentação líquida nos meses" : compareYears ? "Movimentação líquida mensal por ano" : "Aportes, resgates, devoluções e rendimentos"}</h2><p>{compareMonths ? "Aportes e rendimentos menos resgates e devoluções" : compareYears ? "Aportes e rendimentos menos resgates e devoluções; comparação Jan–Dez" : "Movimentações registradas em cada competência"}</p></header><div className="investment-evolution-chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartRows} margin={{ top: 14, right: 12, bottom: 2, left: 4 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--row-border)"/><XAxis dataKey="label" tick={{ fill: "var(--text-soft)", fontSize: 12 }}/><YAxis tickFormatter={(value: number) => `R$ ${new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`} tick={{ fill: "var(--text-soft)", fontSize: 11 }}/><Tooltip allowEscapeViewBox={{ x: true, y: true }} content={compareYears ? (props) => <YearMovementTooltip {...props} years={comparisonYears} colors={yearColors} /> : undefined} contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--panel-border)", borderRadius: 8, color: "var(--text)", boxShadow: "0 8px 24px rgb(0 0 0 / 24%)" }} labelStyle={{ color: "var(--text)", fontWeight: 650 }} itemStyle={{ color: "var(--text-soft)" }} formatter={(value) => formatCurrencyDecimal(String(value ?? "0"))} labelFormatter={(label, payload) => compareYears ? String(label ?? "") : (payload?.[0]?.payload?.month ? fullMonthLabel(payload[0].payload.month) : String(label ?? ""))}/><Legend/>{compareMonths ? <Bar dataKey="netFlow" name="Movimentação líquida" radius={[4, 4, 0, 0]}>{chartRows.map((_, index) => <Cell key={`month-${index}`} fill={yearColors[index]}/>)}</Bar> : compareYears ? comparisonYears.map((year, index) => <Bar key={year} dataKey={`flow_${year}`} name={year} fill={yearColors[index % yearColors.length]} radius={[4, 4, 0, 0]}/>) : <><Bar dataKey="contributions" name="Aportes" fill="#00a878" radius={[4, 4, 0, 0]}/><Bar dataKey="withdrawals" name="Resgates" fill="#e35468" radius={[4, 4, 0, 0]}/><Bar dataKey="refunds" name="Devoluções" fill="#d97706" radius={[4, 4, 0, 0]}/><Bar dataKey="income" name="Rendimentos" fill="#6385d6" radius={[4, 4, 0, 0]}/></>}</BarChart></ResponsiveContainer></div>{compareMonths && <div className="investment-evolution-comparison-legend">{comparisonData.map((item, index) => <span key={`${item.monthly.month}-${index}`}><i style={{ backgroundColor: yearColors[index] }}/>{fullMonthLabel(item.monthly.month)}</span>)}</div>}</article>
        </section>
        <section className="panel investment-evolution-history"><header className="cash-book-table-heading"><div><h2>{compareMonths ? "Meses comparados" : "Histórico mensal"}</h2><p>Posição patrimonial no encerramento de cada competência</p></div><div className="investment-evolution-history-actions"><label className="cash-book-page-size"><span>Exibir</span><SelectField ariaLabel="Meses por página" value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }} options={[10, 50, 100].map((size) => ({ value: String(size), label: String(size) }))}/><span>por página</span></label><button className="secondary-button" onClick={exportCsv}>Exportar CSV</button></div></header><div className="table-scroll"><table className="transactions-table cash-book-table investment-evolution-table"><thead><tr><th>Mês</th><th>Aportes</th><th>Resgates</th><th>Devoluções</th><th>Rendimentos</th><th>Saldo final</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.month}><td>{fullMonthLabel(row.month)}</td><td className="investment-evolution-positive">{formatCurrencyDecimal(row.contributions)}</td><td className="investment-evolution-negative">{formatCurrencyDecimal(row.withdrawals)}</td><td className="investment-evolution-negative">{formatCurrencyDecimal(row.refunds)}</td><td>{formatCurrencyDecimal(row.income)}</td><td><strong>{formatCurrencyDecimal(row.endingBalance)}</strong></td></tr>)}</tbody><tfoot><tr><td>{compareMonths ? "Comparação" : "Total do período"}</td><td>{compareMonths ? "—" : total("contributions")}</td><td>{compareMonths ? "—" : total("withdrawals")}</td><td>{compareMonths ? "—" : total("refunds")}</td><td>{compareMonths ? "—" : total("income")}</td><td>{compareMonths ? "—" : summary ? formatCurrencyDecimal(summary.endingBalance) : "—"}</td></tr></tfoot></table></div><div className="table-footer"><span>Exibindo {historyRows.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, historyRows.length)} de {historyRows.length} meses</span><div className="pagination"><button disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</button><span>{currentPage} / {pageCount}</span><button disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Próxima</button></div></div></section>
      </>}
    </main>
  );
}

function toCents(value: string) { const [whole, fraction = ""] = value.split("."); return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0").slice(0, 2)); }
function fromCents(value: bigint) { const sign = value < 0n ? "-" : ""; const absolute = value < 0n ? -value : value; return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`; }

function Metric({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return <article className="cash-book-summary-card"><span>{label}</span><strong className={positive ? "investment-evolution-positive" : ""}>{formatCurrencyDecimal(value)}</strong></article>;
}

function CompareMetric({ label, items, valueKey, months, positive = false }: { label: string; items: ComparisonMonth[]; valueKey: keyof InvestmentEvolutionSummary; months: [string, string]; positive?: boolean }) {
  return <article className="cash-book-summary-card investment-evolution-compare-card"><span>{label}</span><div>{months.map((month, index) => {
    const item = items[index];
    const value = item?.summary[valueKey];
    return <p key={`${month}-${index}`}><small>{fullMonthLabel(month)}</small><strong className={positive ? "investment-evolution-positive" : ""}>{formatCurrencyDecimal(typeof value === "string" ? value : "0.00")}</strong></p>;
  })}</div></article>;
}

function YearMovementTooltip({ active, payload, label, years, colors }: TooltipContentProps & { years: string[]; colors: string[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as Record<string, string | number | null> | undefined;
  if (!row) return null;
  const amount = (key: string) => formatCurrencyDecimal(String(row[key] ?? "0.00"));
  return <div className="investment-year-tooltip">
    <strong className="investment-year-tooltip-title">{String(label ?? "")}</strong>
    {years.map((year, index) => <section key={year}>
      <h3 style={{ color: colors[index % colors.length] }}>{year}</h3>
      <dl>
        <div><dt>Aportes</dt><dd>+ {amount(`contributions_${year}`)}</dd></div>
        <div><dt>Rendimentos</dt><dd>+ {amount(`income_${year}`)}</dd></div>
        <div><dt>Resgates</dt><dd>− {amount(`withdrawals_${year}`)}</dd></div>
        <div><dt>Devoluções</dt><dd>− {amount(`refunds_${year}`)}</dd></div>
        <div className="investment-year-tooltip-total"><dt>Movimentação líquida</dt><dd>{amount(`flow_${year}`)}</dd></div>
      </dl>
    </section>)}
  </div>;
}
