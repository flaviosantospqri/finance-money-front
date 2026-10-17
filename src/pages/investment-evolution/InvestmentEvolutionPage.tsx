import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { FinancialAccount } from "../../features/cash-book/cashBookApi";
import { investmentEvolutionApi, type InvestmentEvolutionSummary, type MonthlyInvestmentEvolution } from "../../features/investment-evolution/investmentEvolutionApi";
import type { InvestmentApplication } from "../../features/investments/investmentsApi";
import { formatCurrencyDecimal } from "../../lib/formatters";
import { MonthNavigator } from "../../components/ui/MonthNavigator";
import { SelectField } from "../../components/ui/SelectField";

const currentYear = new Date().getFullYear();
const monthLabel = (value: string) => new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(`${value}-15T12:00:00`)).replace(".", "");
const fullMonthLabel = (value: string) => new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(`${value}-15T12:00:00`));

export function InvestmentEvolutionPage() {
  const initialYear = String(currentYear);
  const [year, setYear] = useState(initialYear);
  const [fromMonth, setFromMonth] = useState(`${initialYear}-01`);
  const [toMonth, setToMonth] = useState(`${initialYear}-12`);
  const [accountId, setAccountId] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [applications, setApplications] = useState<InvestmentApplication[]>([]);
  const [rows, setRows] = useState<MonthlyInvestmentEvolution[]>([]);
  const [summary, setSummary] = useState<InvestmentEvolutionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    let active = true;
    Promise.all([investmentEvolutionApi.getAccounts(), investmentEvolutionApi.getApplications()])
      .then(([loadedAccounts, loadedApplications]) => {
        if (!active) return;
        setAccounts(loadedAccounts);
        setApplications(loadedApplications);
      })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Falha ao carregar filtros."); });
    return () => { active = false; };
  }, []);

  const filteredApplications = useMemo(() => applications.filter((app) => !accountId || app.accountId === accountId), [applications, accountId]);
  const filters = useMemo(() => ({ fromMonth, toMonth, accountId: accountId || undefined, applicationId: applicationId || undefined }), [fromMonth, toMonth, accountId, applicationId]);

  useEffect(() => {
    let active = true;
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
  }, [filters]);

  useEffect(() => {
    setPage(1);
  }, [fromMonth, toMonth, accountId, applicationId]);

  function changeFromMonth(value: string) { setLoading(true); setFromMonth(value); if (value > toMonth) setToMonth(value); }

  function changeToMonth(value: string) { setLoading(true); setToMonth(value); if (value < fromMonth) setFromMonth(value); }

  function changeYear(value: string) {
    setLoading(true);
    setYear(value);
    setFromMonth(`${value}-01`);
    setToMonth(`${value}-12`);
  }

  function exportCsv() {
    const header = ["Mês", "Aportes", "Resgates", "Rendimentos", "Saldo final"];
    const sum = (key: "contributions" | "withdrawals" | "income") => fromCents(rows.reduce((total, row) => total + toCents(row[key]), 0n));
    const lines = rows.map((row) => [fullMonthLabel(row.month), row.contributions, row.withdrawals, row.income, row.endingBalance]);
    lines.push(["Total do período", sum("contributions"), sum("withdrawals"), sum("income"), summary?.endingBalance ?? "0.00"]);
    const csv = [header, ...lines].map((line) => line.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `evolucao-investimentos-${fromMonth}-${toMonth}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const chartRows = rows.map((row) => ({ ...row, label: monthLabel(row.month) }));
  const total = (key: "contributions" | "withdrawals" | "income") => formatCurrencyDecimal(fromCents(rows.reduce((sum, row) => sum + toCents(row[key]), 0n)));

  return (
    <main className="page-content investment-evolution-page">
      <div className="investment-evolution-toolbar">
        <label>Ano<SelectField ariaLabel="Ano" value={year} onValueChange={changeYear} options={Array.from({ length: 8 }, (_, index) => String(currentYear - 5 + index)).map((value) => ({ value, label: value }))} /></label>
        <label>De<MonthNavigator ariaLabel="Mês inicial" value={fromMonth} min={`${year}-01`} max={`${year}-12`} onChange={changeFromMonth} /></label>
        <label>Até<MonthNavigator ariaLabel="Mês final" value={toMonth} min={`${year}-01`} max={`${year}-12`} onChange={changeToMonth} /></label>
        <label>Conta<SelectField ariaLabel="Conta de investimento" value={accountId} onValueChange={(value) => { setLoading(true); setAccountId(value); setApplicationId(""); }} options={[{ value: '', label: 'Todas as contas' }, ...accounts.filter((account) => account.type === "investment").map((account) => ({ value: account.id, label: account.name }))]} /></label>
        <label>Aplicação<SelectField ariaLabel="Aplicação" value={applicationId} onValueChange={(value) => { setLoading(true); setApplicationId(value); }} options={[{ value: '', label: 'Todas as aplicações' }, ...filteredApplications.map((app) => ({ value: app.id, label: app.name }))]} /></label>
        <button className="secondary-button" onClick={exportCsv} disabled={!rows.length}>Exportar CSV</button>
      </div>

      {error && <div className="cash-book-error" role="alert">{error}</div>}
      <section className="summary-grid investment-evolution-summary" aria-label="Resumo da evolução">
        <Metric label="Patrimônio acumulado" value={summary?.endingBalance ?? "0.00"} />
        <Metric label="Aportes no período" value={summary?.contributions ?? "0.00"} positive />
        <Metric label="Rendimentos no período" value={summary?.income ?? "0.00"} positive />
        <Metric label="Variação patrimonial" value={summary?.variation ?? "0.00"} />
      </section>

      {loading ? <section className="panel investment-evolution-empty">Carregando evolução dos investimentos…</section> : rows.length === 0 ? <section className="panel investment-evolution-empty">Nenhuma aplicação ou movimentação encontrada para o período.</section> : <>
        <section className="investment-evolution-charts">
          <article className="panel investment-evolution-chart"><header><h2>Patrimônio ao longo do tempo</h2><p>Saldo consolidado no fechamento de cada mês</p></header><div className="investment-evolution-chart-area"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartRows} margin={{ top: 14, right: 18, bottom: 2, left: 4 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--row-border)"/><XAxis dataKey="label" tick={{ fill: "var(--text-soft)", fontSize: 12 }}/><YAxis tickFormatter={(value: number) => `R$ ${new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`} tick={{ fill: "var(--text-soft)", fontSize: 11 }}/><Tooltip contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--panel-border)", borderRadius: 8, color: "var(--text)", boxShadow: "0 8px 24px rgb(0 0 0 / 24%)" }} labelStyle={{ color: "var(--text)", fontWeight: 650 }} itemStyle={{ color: "var(--text-soft)" }} formatter={(value) => formatCurrencyDecimal(String(value ?? "0"))} labelFormatter={(_, payload) => payload?.[0]?.payload?.month ? fullMonthLabel(payload[0].payload.month) : ""}/><Line type="monotone" dataKey="endingBalance" name="Patrimônio" stroke="#a8d500" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }}/></LineChart></ResponsiveContainer></div></article>
          <article className="panel investment-evolution-chart"><header><h2>Aportes, resgates e rendimentos</h2><p>Movimentações registradas em cada competência</p></header><div className="investment-evolution-chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartRows} margin={{ top: 14, right: 12, bottom: 2, left: 4 }}><CartesianGrid strokeDasharray="3 3" stroke="var(--row-border)"/><XAxis dataKey="label" tick={{ fill: "var(--text-soft)", fontSize: 12 }}/><YAxis tickFormatter={(value: number) => `R$ ${new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`} tick={{ fill: "var(--text-soft)", fontSize: 11 }}/><Tooltip contentStyle={{ backgroundColor: "var(--surface)", border: "1px solid var(--panel-border)", borderRadius: 8, color: "var(--text)", boxShadow: "0 8px 24px rgb(0 0 0 / 24%)" }} labelStyle={{ color: "var(--text)", fontWeight: 650 }} itemStyle={{ color: "var(--text-soft)" }} formatter={(value) => formatCurrencyDecimal(String(value ?? "0"))} labelFormatter={(_, payload) => payload?.[0]?.payload?.month ? fullMonthLabel(payload[0].payload.month) : ""}/><Legend/><Bar dataKey="contributions" name="Aportes" fill="#00a878" radius={[4, 4, 0, 0]}/><Bar dataKey="withdrawals" name="Resgates" fill="#e35468" radius={[4, 4, 0, 0]}/><Bar dataKey="income" name="Rendimentos" fill="#6385d6" radius={[4, 4, 0, 0]}/></BarChart></ResponsiveContainer></div></article>
        </section>
        <section className="panel investment-evolution-history"><header className="cash-book-table-heading"><div><h2>Histórico mensal</h2><p>Posição patrimonial no encerramento de cada competência</p></div><div className="investment-evolution-history-actions"><label className="cash-book-page-size"><span>Exibir</span><SelectField ariaLabel="Meses por página" value={String(pageSize)} onValueChange={(value) => { setPageSize(Number(value)); setPage(1); }} options={[10, 50, 100].map((size) => ({ value: String(size), label: String(size) }))}/><span>por página</span></label><button className="secondary-button" onClick={exportCsv}>Exportar CSV</button></div></header><div className="table-scroll"><table className="transactions-table cash-book-table investment-evolution-table"><thead><tr><th>Mês</th><th>Aportes</th><th>Resgates</th><th>Rendimentos</th><th>Saldo final</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.month}><td>{fullMonthLabel(row.month)}</td><td className="investment-evolution-positive">{formatCurrencyDecimal(row.contributions)}</td><td className="investment-evolution-negative">{formatCurrencyDecimal(row.withdrawals)}</td><td>{formatCurrencyDecimal(row.income)}</td><td><strong>{formatCurrencyDecimal(row.endingBalance)}</strong></td></tr>)}</tbody><tfoot><tr><td>Total do período</td><td>{total("contributions")}</td><td>{total("withdrawals")}</td><td>{total("income")}</td><td>{summary ? formatCurrencyDecimal(summary.endingBalance) : "—"}</td></tr></tfoot></table></div><div className="table-footer"><span>Exibindo {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, rows.length)} de {rows.length} meses</span><div className="pagination"><button disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</button><span>{currentPage} / {pageCount}</span><button disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Próxima</button></div></div></section>
      </>}
    </main>
  );
}

function toCents(value: string) { const [whole, fraction = ""] = value.split("."); return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0").slice(0, 2)); }
function fromCents(value: bigint) { const sign = value < 0n ? "-" : ""; const absolute = value < 0n ? -value : value; return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`; }

function Metric({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return <article className="cash-book-summary-card"><span>{label}</span><strong className={positive ? "investment-evolution-positive" : ""}>{formatCurrencyDecimal(value)}</strong></article>;
}
