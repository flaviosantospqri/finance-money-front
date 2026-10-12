import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Icon } from '../../components/ui/Icon';
import { SelectField } from '../../components/ui/SelectField';
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

type Props = { month: string; onManageRepasses: () => void };
type FormState = {
  item: Forecast | null;
  scope: 'occurrence' | 'future';
} | null;

export function ForecastsPage({ month, onManageRepasses }: Props) {
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
    [reconcileTarget, setReconcileTarget] = useState(''),
    [closeReason, setCloseReason] = useState('');
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
      toast.success(id ? 'Previsão atualizada.' : 'Previsão cadastrada.');
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
      toast.success(scope === 'future' ? 'Esta previsão e as próximas foram removidas.' : 'Previsão removida.');
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
      toast.success('Previsão duplicada.');
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
      toast.success('Movimentação conciliada.');
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
      toast.success('Previsão encerrada com justificativa.');
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Não foi possível encerrar a previsão.',
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
          <SelectField ariaLabel="Filtrar categoria" value={categoryId} onValueChange={setCategoryId} options={[{ value: '', label: 'Todas' }, ...categories.map((category) => ({ value: category.id, label: category.name }))]} />
        </label>
        <label className="filter-select">
          <span>Situação</span>
          <SelectField ariaLabel="Filtrar situação" value={status} onValueChange={setStatus} options={[{ value: '', label: 'Todas' }, { value: 'pending', label: 'Pendente' }, { value: 'partial', label: 'Parcial' }, { value: 'realized', label: 'Realizado' }, { value: 'overdue', label: 'Vencido' }, { value: 'cancelled', label: 'Cancelado' }]} />
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
          Recebimentos{' '}
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
                      <h2>Repasses desta competência</h2>
                      <p>
                        Consulte os valores por destinação na tabela. As regras globais e ajustes mensais ficam em Repasses.
                      </p>
                    </div>
                    <div className="distribution-actions">
                      <button className="secondary-button" onClick={onManageRepasses}>
                        Gerenciar repasses
                      </button>
                    </div>
                  </header>
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
