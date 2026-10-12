import { useCallback, useEffect, useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import { DeleteForecastDialog } from '../../components/forecasts/DeleteForecastDialog';
import { ForecastDetail } from '../../components/forecasts/ForecastDetail';
import { ForecastForm } from '../../components/forecasts/ForecastForm';
import { ForecastTable } from '../../components/forecasts/ForecastTable';
import {
  forecastsApi,
  type Destination,
  type Distribution,
  type Forecast,
  type ForecastDetails,
  type ForecastInput,
  type ForecastSummary,
} from '../../features/forecasts/forecastsApi';
import type {
  FinancialAccount,
  FinancialCategory,
} from '../../features/cash-book/cashBookApi';
import { formatCurrencyDecimal } from '../../lib/formatters';

type Props = { month: string };
type FormState = {
  item: Forecast | null;
  scope: 'occurrence' | 'future';
} | null;

export function ForecastsPage({ month }: Props) {
  const [items, setItems] = useState<Forecast[]>([]),
    [summary, setSummary] = useState<ForecastSummary | null>(null);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]),
    [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]),
    [distribution, setDistribution] = useState<Distribution[]>([]);
  const [form, setForm] = useState<FormState>(null),
    [details, setDetails] = useState<ForecastDetails | null>(null),
    [matches, setMatches] = useState<
      Awaited<ReturnType<typeof forecastsApi.matches>>
    >([]);
  const [search, setSearch] = useState(''),
    [categoryId, setCategoryId] = useState(''),
    [status, setStatus] = useState(''),
    [view, setView] = useState<'expense' | 'income' | 'all'>('expense');
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [reconcileTarget, setReconcileTarget] = useState(''),
    [closeReason, setCloseReason] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [pendingCancel, setPendingCancel] = useState<Forecast | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [
        rows,
        totals,
        accountsData,
        categoriesData,
        destData,
        distributionData,
      ] = await Promise.all([
        forecastsApi.getAll({
          period: month,
          categoryId: categoryId || undefined,
          status: status || undefined,
          search: search || undefined,
        }),
        forecastsApi.summary(month),
        forecastsApi.getAccounts(),
        forecastsApi.getCategories(),
        forecastsApi.destinations(),
        forecastsApi.distributions(month),
      ]);
      setItems(rows);
      setSummary(totals);
      setAccounts(accountsData);
      setCategories(categoriesData);
      setDestinations(destData);
      setDistribution(distributionData);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Não foi possível carregar as previsões.',
      );
    } finally {
      setLoading(false);
    }
  }, [month, categoryId, status, search]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function save(
    input: ForecastInput,
    id?: string,
    scope: 'occurrence' | 'future' = 'occurrence',
  ) {
    setBusy(true);
    setError('');
    try {
      if (id) await forecastsApi.update(id, input, scope);
      else await forecastsApi.create(input);
      setForm(null);
      setSuccess(id ? 'Previsão atualizada.' : 'Previsão cadastrada.');
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Não foi possível salvar.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove(item: Forecast, scope: 'occurrence' | 'future') {
    try {
      await forecastsApi.delete(item.id, scope);
      setPendingCancel(null);
      setSuccess(
        scope === 'future'
          ? 'Esta previsão e as próximas foram removidas da planilha.'
          : 'Previsão removida da planilha.',
      );
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Não foi possível cancelar a previsão.',
      );
    }
  }
  async function duplicate(item: Forecast) {
    try {
      await forecastsApi.duplicate(item.id);
      setSuccess('Previsão duplicada.');
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Não foi possível duplicar a previsão.',
      );
    }
  }
  async function openDetails(item: Forecast) {
    setError('');
    try {
      const [row, candidates] = await Promise.all([
        forecastsApi.details(item.id),
        forecastsApi.matches(item.id),
      ]);
      setDetails(row);
      setMatches(candidates);
      setReconcileTarget('');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Não foi possível abrir os detalhes.',
      );
    }
  }
  async function reconcile() {
    if (!details || !reconcileTarget) return;
    setBusy(true);
    try {
      await forecastsApi.reconcile(details.id, reconcileTarget);
      setSuccess('Movimentação conciliada.');
      setDetails(null);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Não foi possível conciliar.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function unlink(reconciliationId: string) {
    if (!details) return;
    try {
      await forecastsApi.unlink(details.id, reconciliationId);
      await openDetails(details);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Não foi possível desfazer a conciliação.',
      );
    }
  }
  async function closeForecast() {
    if (!details || !closeReason.trim()) return;
    try {
      await forecastsApi.close(details.id, closeReason);
      setDetails(null);
      setCloseReason('');
      setSuccess('Previsão encerrada com justificativa.');
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Não foi possível encerrar a previsão.',
      );
    }
  }
  async function saveDistribution() {
    try {
      const saved = await forecastsApi.saveDistributions(
        month,
        distribution.map(({ id, percentage, valueType, value }) => ({
          destinationId: id,
          percentage,
          valueType,
          value,
        })),
      );
      setDistribution(saved);
      setSuccess('Distribuição salva.');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Não foi possível salvar a distribuição.',
      );
    }
  }
  async function copyDistribution() {
    const [year, mm] = month.split('-').map(Number);
    const next = new Date(year, mm, 1);
    const target = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    try {
      const copied = await forecastsApi.copyDistributions(month, target);
      if (target === month) setDistribution(copied);
      setSuccess(`Distribuição copiada para ${target}.`);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Não foi possível copiar a distribuição.',
      );
    }
  }
  async function addDestination() {
    if (!newDestination.trim()) return;
    try {
      await forecastsApi.createDestination(newDestination);
      setNewDestination('');
      await load();
      setSuccess('Destinação adicionada.');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Não foi possível adicionar a destinação.',
      );
    }
  }

  return (
    <main className="page-content forecasts-page">
      <section className="cash-book-toolbar forecasts-toolbar">
        <button
          className="primary-button"
          onClick={() => setForm({ item: null, scope: 'occurrence' })}
        >
          <Icon name="plus" size={16} />
          Nova previsão
        </button>
      </section>
      {success && (
        <div className="cash-book-feedback success" role="status">
          {success}
          <button onClick={() => setSuccess('')} aria-label="Dispensar">
            <Icon name="close" size={14} />
          </button>
        </div>
      )}
      {error && (
        <div className="cash-book-feedback error" role="alert">
          {error}
          <button onClick={() => setError('')} aria-label="Dispensar">
            <Icon name="close" size={14} />
          </button>
        </div>
      )}
      {summary && (
        <section
          className="cash-book-summary forecasts-summary"
          aria-label="Resumo das previsões"
        >
          {[
            ['Receitas previstas', summary.incomePlanned, 'income'],
            ['Despesas previstas', summary.expensePlanned, 'expense'],
            ['Comprometido pendente', summary.committedPending, 'neutral'],
            ['Saldo projetado', summary.projectedBalance, 'balance'],
          ].map(([label, value, tone]) => (
            <article className={`cash-book-summary-card ${tone}`} key={label}>
              <div>
                <span>{label}</span>
              </div>
              <strong>{formatCurrencyDecimal(value)}</strong>
              {label === 'Saldo projetado' && (
                <small>
                  Saldo real {formatCurrencyDecimal(summary.realBalance)} ·
                  futuro {formatCurrencyDecimal(summary.futureNet)}
                </small>
              )}
            </article>
          ))}
        </section>
      )}
      <section
        className="cash-book-filters forecasts-filters"
        aria-label="Filtros de previsões"
      >
        <label className="search-field">
          <span>⌕</span>
          <input
            aria-label="Buscar descrição"
            placeholder="Buscar previsões por descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="filter-select">
          <span>Categoria</span>
          <select
            aria-label="Filtrar categoria"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-select">
          <span>Situação</span>
          <select
            aria-label="Filtrar situação"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todas</option>
            <option value="pending">Pendente</option>
            <option value="partial">Parcial</option>
            <option value="realized">Realizado</option>
            <option value="overdue">Vencido</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </label>
      </section>
      <nav className="forecast-view-tabs" aria-label="Tipo de previsão">
        <button
          className={view === 'expense' ? 'active' : ''}
          onClick={() => setView('expense')}
        >
          Contas a pagar{' '}
          <span>{items.filter((item) => item.kind === 'expense').length}</span>
        </button>
        <button
          className={view === 'income' ? 'active' : ''}
          onClick={() => setView('income')}
        >
          Recebimentos e divisão{' '}
          <span>{items.filter((item) => item.kind === 'income').length}</span>
        </button>
        <button
          className={view === 'all' ? 'active' : ''}
          onClick={() => setView('all')}
        >
          Todas
        </button>
      </nav>
      {loading ? (
        <section className="panel">
          <div className="cash-book-state">
            <span className="loading-spinner" />
            Carregando previsões…
          </div>
        </section>
      ) : (
        <>
          {(view === 'expense' || view === 'all') && (
            <ForecastTable
              title="Contas a pagar"
              description="Compromissos previstos e pagamentos já conciliados."
              items={items.filter((item) => item.kind === 'expense')}
              distribution={distribution}
              mode="expense"
              onView={openDetails}
              onEdit={(item) => setForm({ item, scope: 'occurrence' })}
              onDuplicate={duplicate}
              onRemove={setPendingCancel}
            />
          )}
          {(view === 'income' || view === 'all') && (
            <>
              {view === 'income' && (
                <section className="panel forecast-distribution">
                  <header className="panel-heading">
                    <div>
                      <h2>Divisão das receitas</h2>
                      <p>
                        Repasses vigentes neste mês. Salvar aqui altera somente esta competência.
                      </p>
                    </div>
                    <div className="distribution-actions">
                      <button
                        className="secondary-button"
                        onClick={() => void copyDistribution()}
                      >
                        Copiar para o próximo mês
                      </button>
                      <button
                        className="secondary-button"
                        onClick={() => void saveDistribution()}
                      >
                        Salvar distribuição
                      </button>
                    </div>
                  </header>
                  <div className="distribution-grid">
                    {distribution.map((row) => (
                      <label key={row.id} className="distribution-card">
                        <span>{row.name}</span>
                        <div>
                          <select
                            aria-label={`Tipo de repasse para ${row.name}`}
                            value={row.valueType}
                            onChange={(e) =>
                              setDistribution((current) =>
                                current.map((item) => item.id === row.id
                                  ? { ...item, valueType: e.target.value as 'percentage' | 'fixed' }
                                  : item),
                              )
                            }
                          >
                            <option value="percentage">%</option>
                            <option value="fixed">R$</option>
                          </select>
                          <input
                            aria-label={`Valor do repasse para ${row.name}`}
                            type="number"
                            min="0"
                            max={row.valueType === 'percentage' ? '100' : undefined}
                            step="0.01"
                            value={row.value}
                            onChange={(e) =>
                              setDistribution((current) =>
                                current.map((item) =>
                                  item.id === row.id
                                    ? { ...item, value: e.target.value, percentage: item.valueType === 'percentage' ? e.target.value : '0' }
                                    : item,
                                ),
                              )
                            }
                          />
                          <span>%</span>
                        </div>
                        <small>
                          Orçamento {formatCurrencyDecimal(row.budget)} ·
                          Consumido {formatCurrencyDecimal(row.consumed)}
                        </small>
                      </label>
                    ))}
                  </div>
                  <p className="distribution-total">
                    Total:{' '}
                    {distribution
                      .reduce((sum, row) => sum + (row.valueType === 'percentage' ? Number(row.value) : 0), 0)
                      .toFixed(2)}
                    %
                  </p>
                  <div className="distribution-add">
                    <input
                      aria-label="Nova destinação"
                      placeholder="Adicionar destinação"
                      value={newDestination}
                      onChange={(e) => setNewDestination(e.target.value)}
                    />
                    <button
                      className="secondary-button"
                      onClick={() => void addDestination()}
                    >
                      Adicionar
                    </button>
                  </div>
                </section>
              )}
              <ForecastTable
                title="Recebimentos previstos"
                description="Clientes, datas e divisão planejada de cada recebimento."
                items={items.filter((item) => item.kind === 'income')}
                distribution={distribution}
                mode="income"
                onView={openDetails}
                onEdit={(item) => setForm({ item, scope: 'occurrence' })}
                onDuplicate={duplicate}
                onRemove={setPendingCancel}
              />
            </>
          )}
        </>
      )}
      {form && (
        <ForecastForm
          item={form.item}
          scope={form.scope}
          accounts={accounts}
          categories={categories}
          destinations={destinations}
          busy={busy}
          onClose={() => setForm(null)}
          onSave={save}
        />
      )}
      {details && (
        <ForecastDetail
          item={details}
          matches={matches}
          target={reconcileTarget}
          closeReason={closeReason}
          busy={busy}
          onTarget={setReconcileTarget}
          onReason={setCloseReason}
          onClose={() => setDetails(null)}
          onReconcile={() => void reconcile()}
          onUnlink={unlink}
          onCloseForecast={() => void closeForecast()}
        />
      )}
      {pendingCancel && (
        <DeleteForecastDialog
          item={pendingCancel}
          onCancel={() => setPendingCancel(null)}
          onConfirm={(scope) => void remove(pendingCancel, scope)}
        />
      )}
    </main>
  );
}
