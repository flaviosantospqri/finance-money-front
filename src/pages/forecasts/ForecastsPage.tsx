import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Icon } from '../../components/ui/Icon';
import { SelectField } from '../../components/ui/SelectField';
import { DeleteForecastDialog } from '../../components/forecasts/DeleteForecastDialog';
import { ForecastGroupDialog } from '../../components/forecasts/ForecastGroupDialog';
import { ForecastBuiltinTabDialog } from '../../components/forecasts/ForecastBuiltinTabDialog';
import { ForecastDetail } from '../../components/forecasts/ForecastDetail';
import { ForecastForm } from '../../components/forecasts/ForecastForm';
import { ForecastTable } from '../../components/forecasts/ForecastTable';
import {
  forecastsApi,
  type Distribution,
  type Forecast,
  type ForecastDetails,
  type ForecastInput,
  type ForecastGroup,
  type ForecastSummary,
} from '../../features/forecasts/forecastsApi';
import type {
  FinancialAccount,
  FinancialCategory,
} from '../../features/cash-book/cashBookApi';
import { formatCurrencyDecimal } from '../../lib/formatters';
import { usePersistentState } from '../../lib/usePersistentState';

type Props = { month: string; onManageRepasses: () => void };
type FormState = {
  item: Forecast | null;
  scope: 'occurrence' | 'future';
} | null;

function sumForecastCents(rows: Forecast[], field: 'amount' | 'realized' | 'pending') {
  return rows.reduce((total, row) => {
    const raw = row[field] ?? '0';
    const negative = raw.startsWith('-');
    const [whole = '0', fraction = ''] = raw.replace('-', '').split('.');
    const value = BigInt(whole || '0') * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
    return total + (negative ? -value : value);
  }, 0n);
}

function centsToDecimal(cents: bigint) {
  const absolute = cents < 0n ? -cents : cents;
  return `${cents < 0n ? '-' : ''}${absolute / 100n}.${(absolute % 100n).toString().padStart(2, '0')}`;
}

function sumForecastField(rows: Forecast[], field: 'amount' | 'realized' | 'pending') {
  return centsToDecimal(sumForecastCents(rows, field));
}

function sumForecastNet(rows: Forecast[], field: 'amount' | 'realized' | 'pending') {
  // Alocação percentual para investimentos não reduz o resultado operacional.
  const operatingRows = rows.filter(
    (row) =>
      !(
        row.kind === 'expense' &&
        row.amountType === 'income_percentage' &&
        /(^|\W)investimentos?(\W|$)/i.test(row.categoryName ?? '')
      ),
  );
  return centsToDecimal(
    sumForecastCents(operatingRows.filter((row) => row.kind === 'income'), field) -
      sumForecastCents(operatingRows.filter((row) => row.kind === 'expense'), field),
  );
}

function sumForecastExpenses(rows: Forecast[], field: 'amount' | 'realized' | 'pending') {
  return sumForecastField(
    rows.filter(
      (row) =>
        row.kind === 'expense' &&
        !(
          row.amountType === 'income_percentage' &&
          /(^|\W)investimentos?(\W|$)/i.test(row.categoryName ?? '')
        ),
    ),
    field,
  );
}

export function ForecastsPage({ month, onManageRepasses }: Props) {
  const [items, setItems] = useState<Forecast[]>([]),
    [summary, setSummary] = useState<ForecastSummary | null>(null);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]),
    [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [distribution, setDistribution] = useState<Distribution[]>([]);
  const [groups, setGroups] = useState<ForecastGroup[]>([]);
  const [groupDialog, setGroupDialog] = useState<ForecastGroup | null | false>(false);
  const [groupBusy, setGroupBusy] = useState(false);
  const [form, setForm] = useState<FormState>(null),
    [details, setDetails] = useState<ForecastDetails | null>(null),
    [matches, setMatches] = useState<
      Awaited<ReturnType<typeof forecastsApi.matches>>
    >([]);
  const [search, setSearch] = usePersistentState('fllatech-money-forecasts-search', ''),
    [categoryId, setCategoryId] = usePersistentState('fllatech-money-forecasts-category', ''),
    [status, setStatus] = usePersistentState('fllatech-money-forecasts-status', ''),
    [view, setView] = usePersistentState<'expense' | 'income' | 'all' | `group:${string}`>('fllatech-money-forecasts-view', 'expense');
  const [tabOrder, setTabOrder] = usePersistentState<string[]>('fllatech-money-forecasts-tab-order', []);
  const [builtinTabNames, setBuiltinTabNames] = usePersistentState<Record<string, string>>('fllatech-money-forecasts-tab-names', {});
  const [editingBuiltinTab, setEditingBuiltinTab] = useState<'expense' | 'income' | 'all' | null>(null);
  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [reconcileTargets, setReconcileTargets] = useState<string[]>([]),
    [closeReason, setCloseReason] = useState('');
  const [pendingCancel, setPendingCancel] = useState<Forecast | null>(null);
  const [showProjectionBreakdown, setShowProjectionBreakdown] = usePersistentState('fllatech-money-forecasts-projection-breakdown', false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [
        rows,
        totals,
        accountsData,
        categoriesData,
        distributionData,
        groupsData,
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
        forecastsApi.distributions(month),
        forecastsApi.groups(),
      ]);
      setItems(rows);
      setSummary(totals);
      setAccounts(accountsData);
      setCategories(categoriesData);
      setCategoryId((current) => categoriesData.some((category) => category.id === current) ? current : '');
      setDistribution(distributionData);
      setGroups(groupsData);
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

  useEffect(() => {
    if (view.startsWith('group:') && groups.length > 0 && !groups.some((group) => `group:${group.id}` === view)) {
      setView('expense');
    }
  }, [groups, setView, view]);

  async function save(
    input: ForecastInput,
    id?: string,
    scope: 'occurrence' | 'future' = 'occurrence',
  ) {
    setBusy(true);
    setError('');
    try {
      if (id) {
        await forecastsApi.update(
          id,
          {
            description: input.description,
            amount: input.amount,
            dueDate: input.dueDate,
            categoryId: input.categoryId,
            accountId: input.accountId,
            destinationId: input.destinationId,
            notes: input.notes,
            groupId: input.groupId,
          },
          scope,
        );
      } else await forecastsApi.create(input);
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
  async function saveGroup(name: string) {
    setGroupBusy(true);
    try {
      const saved = groupDialog
        ? await forecastsApi.updateGroup(groupDialog.id, name)
        : await forecastsApi.createGroup(name);
      setGroups(await forecastsApi.groups());
      if (!groupDialog) setView(`group:${saved.id}`);
      setGroupDialog(false);
      toast.success(groupDialog ? 'Aba atualizada.' : 'Aba criada.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar a aba.');
    } finally {
      setGroupBusy(false);
    }
  }
  async function deleteGroup() {
    if (!groupDialog) return;
    setGroupBusy(true);
    try {
      await forecastsApi.deleteGroup(groupDialog.id);
      setGroups(await forecastsApi.groups());
      if (view === `group:${groupDialog.id}`) setView('expense');
      setGroupDialog(false);
      toast.success('Aba excluída. As previsões foram mantidas em Contas a pagar.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível excluir a aba.');
    } finally {
      setGroupBusy(false);
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
      setReconcileTargets([]);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Não foi possível abrir os detalhes.',
      );
    }
  }
  async function reconcile() {
    if (!details || reconcileTargets.length === 0) return;
    setBusy(true);
    try {
      await forecastsApi.reconcile(details.id, reconcileTargets);
      toast.success(`${reconcileTargets.length} movimentação(ões) conciliada(s).`);
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
  const activeRows = items.filter((item) => item.status !== 'cancelled');
  const activeIncomeRows = activeRows.filter((item) => item.kind === 'income');
  const activeExpenseRows = activeRows.filter((item) => item.kind === 'expense');
  const tabs = [
    { key: 'expense', view: 'expense' as const },
    { key: 'income', view: 'income' as const },
    { key: 'all', view: 'all' as const },
    ...groups.map((group) => ({ key: `group:${group.id}`, view: `group:${group.id}` as const, group })),
  ];
  const orderedTabs = [
    ...tabOrder.map((key) => tabs.find((tab) => tab.key === key)).filter((tab): tab is (typeof tabs)[number] => Boolean(tab)),
    ...tabs.filter((tab) => !tabOrder.includes(tab.key)),
  ];
  function moveTab(targetKey: string) {
    if (!draggedTab || draggedTab === targetKey) return;
    const currentOrder = orderedTabs.map((tab) => tab.key);
    const from = currentOrder.indexOf(draggedTab);
    const to = currentOrder.indexOf(targetKey);
    if (from < 0 || to < 0) return;
    currentOrder.splice(to, 0, currentOrder.splice(from, 1)[0]);
    setTabOrder(currentOrder);
    setDraggedTab(null);
  }
  const currentTabRows = activeRows.filter((item) => {
    if (view === 'income') return item.kind === 'income';
    if (view === 'all') return true;
    if (view.startsWith('group:')) return item.kind === 'expense' && item.groupId === view.slice(6);
    return item.kind === 'expense' && !item.groupId;
  });
  const defaultTabNames = { expense: 'Contas a pagar', income: 'Recebimentos', all: 'Todas' };
  const tabName = (key: keyof typeof defaultTabNames) => builtinTabNames[key]?.trim() || defaultTabNames[key];
  const currentTabName = view.startsWith('group:')
    ? groups.find((group) => group.id === view.slice(6))?.name ?? 'Contas a pagar'
    : tabName(view === 'income' ? 'income' : view === 'all' ? 'all' : 'expense');
  const totalFields = [
    { key: 'amount' as const, label: 'Previsto' },
    { key: 'realized' as const, label: 'Realizado' },
    { key: 'pending' as const, label: 'Pendente' },
  ];
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
            ['Saldo final', summary.resultProjected, 'balance'],
          ].map(([label, value, tone]) => (
            <article className={`cash-book-summary-card ${tone}`} key={label}>
              <div>
                <span>{label}</span>
              </div>
              <strong>{formatCurrencyDecimal(value)}</strong>
              {label === 'Saldo final' && (
                <div className="forecast-projection-summary">
                  <button className="text-link" type="button" aria-expanded={showProjectionBreakdown} onClick={() => setShowProjectionBreakdown((visible) => !visible)}>
                    {showProjectionBreakdown ? 'Ocultar composição' : 'Ver composição'}
                  </button>
                </div>
              )}
            </article>
          ))}
        </section>
      )}
      {summary && showProjectionBreakdown && (
        <section className="panel forecast-projection-breakdown" aria-label="Composição do saldo final">
          <header><div><h2>Composição do saldo final</h2><p>Receitas previstas menos despesas previstas na competência selecionada.</p></div></header>
          <dl>
            <div><dt>Receitas previstas</dt><dd className="income">+ {formatCurrencyDecimal(summary.incomePlanned)}</dd></div>
            <div><dt>Despesas previstas</dt><dd className="expense">− {formatCurrencyDecimal(summary.expensePlanned)}</dd></div>
            <div className="forecast-projection-total"><dt>Saldo final</dt><dd>{formatCurrencyDecimal(summary.resultProjected)}</dd></div>
          </dl>
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
          <SelectField ariaLabel="Filtrar categoria" value={categoryId} onValueChange={setCategoryId} options={[{ value: '', label: 'Todas' }, ...categories.map((category) => ({ value: category.id, label: `${category.destinationName} · ${category.parentCategoryName ? `${category.parentCategoryName} / ` : ""}${category.name}` }))]} />
        </label>
        <label className="filter-select">
          <span>Situação</span>
          <SelectField ariaLabel="Filtrar situação" value={status} onValueChange={setStatus} options={[{ value: '', label: 'Todas' }, { value: 'pending', label: 'Pendente' }, { value: 'partial', label: 'Parcial' }, { value: 'realized', label: 'Realizado' }, { value: 'overdue', label: 'Vencido' }, { value: 'cancelled', label: 'Cancelado' }]} />
        </label>
      </section>
      <nav className="forecast-view-tabs" aria-label="Tipo de previsão">
        {orderedTabs.map((tab) => {
          const common = {
            draggable: true,
            onDragStart: () => setDraggedTab(tab.key),
            onDragOver: (event: React.DragEvent) => event.preventDefault(),
            onDrop: () => moveTab(tab.key),
            onDragEnd: () => setDraggedTab(null),
            title: 'Arraste para reordenar · clique duas vezes no nome para editar',
          };
          if (tab.key === 'expense' || tab.key === 'income' || tab.key === 'all') {
            const tabKey = tab.key;
            const label = tabName(tabKey);
            const amount = tabKey === 'expense'
              ? sumForecastField(activeRows.filter((item) => item.kind === 'expense' && !item.groupId), 'amount')
              : tabKey === 'income'
                ? sumForecastField(activeRows.filter((item) => item.kind === 'income'), 'amount')
                : sumForecastNet(activeRows, 'amount');
            const count = tabKey === 'expense'
              ? items.filter((item) => item.kind === 'expense' && item.status !== 'cancelled' && !item.groupId).length
              : tabKey === 'income' ? items.filter((item) => item.kind === 'income' && item.status !== 'cancelled').length : null;
            return <div key={tab.key} {...common} className={`forecast-view-tab-item ${view === tabKey ? 'active' : ''}${draggedTab === tab.key ? ' is-dragging' : ''}`}><button className={view === tabKey ? 'active' : ''} onClick={() => setView(tabKey)} onDoubleClick={() => setEditingBuiltinTab(tabKey)}>{label}{count !== null && <span>{count}</span>}<span className="forecast-tab-amount" title={tabKey === 'all' ? 'Saldo previsto líquido: receitas menos despesas' : undefined}>{formatCurrencyDecimal(amount)}</span></button></div>;
          }
          if (!('group' in tab)) return null;
          const group = tab.group;
          const groupRows = activeRows.filter((item) => item.kind === 'expense' && item.groupId === group.id);
          return <div key={tab.key} {...common} className={`forecast-view-tab-item ${view === tab.view ? 'active' : ''}${draggedTab === tab.key ? ' is-dragging' : ''}`}><button className={view === tab.view ? 'active' : ''} onClick={() => setView(tab.view)} onDoubleClick={() => setGroupDialog(group)}>{group.name} <span>{groupRows.length}</span><span className="forecast-tab-amount">{formatCurrencyDecimal(sumForecastField(groupRows, 'amount'))}</span></button></div>;
        })}
        <button className="forecast-add-tab" onClick={() => setGroupDialog(null)}>
          <Icon name="plus" size={14} /> Nova aba
        </button>
      </nav>
      <section className={`forecast-tab-totals${view === 'all' ? ' is-single' : ''}`} aria-label="Totais das previsões">
        {view !== 'all' && (
          <article>
            <div className="forecast-tab-total-heading"><strong>Total da aba · {currentTabName}</strong><small>Mês selecionado e filtros ativos</small></div>
            <dl>{totalFields.map(({ key, label }) => (
              <div key={key}><dt>{label}</dt><dd>{formatCurrencyDecimal(sumForecastField(currentTabRows, key))}</dd></div>
            ))}</dl>
          </article>
        )}
        <article className="forecast-overall-totals">
          <div className="forecast-tab-total-heading"><strong>Resumo · Todas as abas</strong><small>Resultado = receitas − despesas em cada linha</small></div>
          <div className="forecast-overall-table-scroll">
            <table className="forecast-overall-table">
              <thead><tr><th></th><th>Receitas</th><th>Despesas</th><th>Resultado</th></tr></thead>
              <tbody>{totalFields.map(({ key, label }) => (
                <tr key={key}>
                  <th scope="row">{label}</th>
                  <td>{formatCurrencyDecimal(sumForecastField(activeIncomeRows, key))}</td>
                  <td>{formatCurrencyDecimal(sumForecastExpenses(activeExpenseRows, key))}</td>
                  <td><strong>{formatCurrencyDecimal(sumForecastNet(activeRows, key))}</strong></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </article>
      </section>
      {loading ? (
        <section className="panel">
          <div className="cash-book-state">
            <span className="loading-spinner" />
            Carregando previsões…
          </div>
        </section>
      ) : (
        <>
          {view === 'all' && (
            <ForecastTable
              title="Todas as previsões"
              description="Contas a pagar e recebimentos previstos em uma única lista."
              items={items.filter((item) => item.status !== 'cancelled')}
              distribution={distribution}
              mode="all"
              onView={openDetails}
              onEdit={(item) => setForm({ item, scope: 'occurrence' })}
              onDuplicate={duplicate}
              onRemove={setPendingCancel}
            />
          )}
          {(view === 'expense' || view.startsWith('group:')) && (
            <ForecastTable
              title={view.startsWith('group:') ? groups.find((group) => `group:${group.id}` === view)?.name ?? tabName('expense') : tabName('expense')}
              description={view.startsWith('group:') ? 'Despesas organizadas nesta aba.' : 'Compromissos previstos e pagamentos já conciliados.'}
              items={items.filter((item) => item.kind === 'expense' && (view.startsWith('group:') ? item.groupId === view.slice(6) : !item.groupId))}
              distribution={distribution}
              mode="expense"
              onView={openDetails}
              onEdit={(item) => setForm({ item, scope: 'occurrence' })}
              onDuplicate={duplicate}
              onRemove={setPendingCancel}
            />
          )}
          {view === 'income' && (
            <>
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
          groups={groups}
          defaultGroupId={view.startsWith('group:') ? view.slice(6) : undefined}
          busy={busy}
          onClose={() => setForm(null)}
          onSave={save}
        />
      )}
      {details && (
        <ForecastDetail
          item={details}
          matches={matches}
          targets={reconcileTargets}
          closeReason={closeReason}
          busy={busy}
          onTarget={(entryId) => setReconcileTargets((current) => current.includes(entryId) ? current.filter((id) => id !== entryId) : [...current, entryId])}
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
      {groupDialog !== false && (
        <ForecastGroupDialog
          group={groupDialog}
          busy={groupBusy}
          onClose={() => setGroupDialog(false)}
          onSave={saveGroup}
          onDelete={groupDialog ? deleteGroup : undefined}
        />
      )}
      {editingBuiltinTab && (
        <ForecastBuiltinTabDialog
          title={tabName(editingBuiltinTab)}
          initialName={tabName(editingBuiltinTab)}
          onClose={() => setEditingBuiltinTab(null)}
          onSave={(name) => {
            setBuiltinTabNames((current) => ({ ...current, [editingBuiltinTab]: name }));
            setEditingBuiltinTab(null);
            toast.success('Nome da aba atualizado.');
          }}
        />
      )}
    </main>
  );
}
