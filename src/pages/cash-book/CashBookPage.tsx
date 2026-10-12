import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CashBookDrawer,
  type CashBookFormData,
} from "../../components/cash-book/CashBookDrawer";
import { CashBookTable } from "../../components/cash-book/CashBookTable";
import { FinancialAccountDialog } from "../../components/cash-book/FinancialAccountDialog";
import { FinancialAccountsManagerDialog } from "../../components/cash-book/FinancialAccountsManagerDialog";
import { FinancialCategoryDialog } from "../../components/cash-book/FinancialCategoryDialog";
import { cashBookApi } from "../../features/cash-book/cashBookApi";
import type {
  CashBookEntry,
  CashBookPageResult,
  CashBookSummary,
  FinancialAccount,
  FinancialCategory,
} from "../../features/cash-book/cashBookApi";
import { formatCurrencyDecimal } from "../../lib/formatters";
import { DatePicker } from "../../components/ui/DatePicker";
import { Icon } from "../../components/ui/Icon";
import { SelectField } from "../../components/ui/SelectField";
import {
  investmentsApi,
  type InvestmentApplication,
} from "../../features/investments/investmentsApi";

type DrawerState = {
  mode: "create" | "edit" | "view";
  entry: CashBookEntry | null;
} | null;

function summaryCards(summary: CashBookSummary) {
  return [
    {
      title: "Saldo inicial",
      value: summary.openingBalance,
      icon: "wallet" as const,
      tone: "neutral",
    },
    {
      title: "Entradas",
      value: summary.incomeTotal,
      icon: "arrow-down" as const,
      tone: "income",
    },
    {
      title: "Saídas",
      value: summary.expenseTotal,
      icon: "arrow-up" as const,
      tone: "expense",
    },
    {
      title: "Saldo final",
      value: summary.closingBalance,
      icon: "trend" as const,
      tone: "balance",
    },
  ];
}

function currentMonth() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthNumber - 1, 1));
  return label.charAt(0).toLocaleUpperCase("pt-BR") + label.slice(1);
}

export function CashBookPage() {
  const [month, onMonthChange] = useState(currentMonth);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [applications, setApplications] = useState<InvestmentApplication[]>([]);
  const [categories, setCategories] = useState<FinancialCategory[]>([]);
  const [accountId, setAccountId] = useState("");
  const [summary, setSummary] = useState<CashBookSummary | null>(null);
  const [pageData, setPageData] = useState<CashBookPageResult | null>(null);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [loadedQuery, setLoadedQuery] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [pendingDelete, setPendingDelete] = useState<CashBookEntry | null>(
    null,
  );
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showAccountManager, setShowAccountManager] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const queryKey = [
    accountId,
    month,
    page,
    search,
    type,
    categoryId,
    fromDate,
    toDate,
    refreshKey,
  ].join("|");
  const [monthYear, monthNumber] = month.split("-").map(Number);
  const monthEndDate = `${month}-${String(new Date(monthYear, monthNumber, 0).getDate()).padStart(2, "0")}`;

  const reloadReferenceData = useCallback(async () => {
    const [loadedAccounts, loadedCategories] = await Promise.all([
      cashBookApi.getAccounts(),
      cashBookApi.getCategories(),
    ]);
    setAccounts(loadedAccounts);
    setCategories(loadedCategories);
    setAccountId((current) => loadedAccounts.some((account) => account.id === current) ? current : loadedAccounts[0]?.id || "");
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      cashBookApi.getAccounts(),
      cashBookApi.getCategories(),
      investmentsApi.getApplications(),
    ])
      .then(([loadedAccounts, loadedCategories, loadedApplications]) => {
        if (!active) return;
        setAccounts(loadedAccounts);
        setCategories(loadedCategories);
        setApplications(loadedApplications);
        setAccountId((current) => current || loadedAccounts[0]?.id || "");
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar contas e categorias.",
          );
      })
      .finally(() => {
        if (active) setReferenceLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!accountId || referenceLoading) return;

    const controller = new AbortController();
    Promise.all([
      cashBookApi.getSummary(accountId, month),
      cashBookApi.getEntries({
        accountId,
        month,
        page,
        pageSize: 10,
        search,
        type: type || undefined,
        categoryId: categoryId || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      }),
    ])
      .then(([loadedSummary, loadedPage]) => {
        if (controller.signal.aborted) return;
        setSummary(loadedSummary);
        setPageData(loadedPage);
        setLoadedQuery(queryKey);
        setError("");
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar o Livro Caixa.",
          );
      });
    return () => controller.abort();
  }, [
    accountId,
    month,
    page,
    search,
    type,
    categoryId,
    fromDate,
    toDate,
    refreshKey,
    referenceLoading,
    queryKey,
  ]);

  async function saveEntry(input: CashBookFormData) {
    if (input.type === "transfer") {
      const transferData = {
        occurredAt: input.occurredAt,
        description: input.description,
        amount: input.amount,
        sourceAccountId: input.sourceAccountId,
        destinationAccountId: input.destinationAccountId,
        sourceApplicationId: input.transferId
          ? input.sourceApplicationId || null
          : input.sourceApplicationId || undefined,
        destinationApplicationId: input.transferId
          ? input.destinationApplicationId || null
          : input.destinationApplicationId || undefined,
        notes: input.notes || undefined,
      };
      if (input.transferId)
        await cashBookApi.updateTransfer(input.transferId, transferData);
      else await cashBookApi.createTransfer(transferData);
    } else {
      const entryData = {
        type: input.type,
        occurredAt: input.occurredAt,
        description: input.description,
        amount: input.amount,
        accountId: input.accountId,
        categoryId: input.categoryId,
        notes: input.notes || undefined,
      };
      if (input.entryId)
        await cashBookApi.updateEntry(input.entryId, entryData);
      else await cashBookApi.createEntry(entryData);
    }
    setDrawer(null);
    toast.success(input.entryId ? "Movimentação atualizada." : "Movimentação cadastrada.");
    setRefreshKey((current) => current + 1);
  }

  async function deleteEntry() {
    if (!pendingDelete) return;
    try {
      if (pendingDelete.transferId)
        await cashBookApi.deleteTransfer(pendingDelete.transferId);
      else await cashBookApi.deleteEntry(pendingDelete.id);
      setPendingDelete(null);
      toast.success("Movimentação excluída. Os saldos foram recalculados.");
      setRefreshKey((current) => current + 1);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível excluir a movimentação.",
      );
      setPendingDelete(null);
    }
  }

  async function createAccount(input: {
    name: string;
    type: "checking" | "payment" | "cash" | "investment";
    institution?: string;
    openingBalance: string;
    referenceDate: string;
  }) {
    const created = await cashBookApi.createAccount(input);
    setShowAccountDialog(false);
    await reloadReferenceData();
    setAccountId(created.id);
    toast.success("Conta financeira cadastrada.");
  }

  async function createCategory(input: {
    name: string;
    nature: "income" | "expense";
  }) {
    await cashBookApi.createCategory(input);
    setShowCategoryDialog(false);
    await reloadReferenceData();
    toast.success("Categoria cadastrada.");
  }

  function setFilterDate(kind: "from" | "to", value: string) {
    onMonthChange(value.slice(0, 7));
    if (kind === "from") {
      setFromDate(value);
      if (toDate && toDate < value) setToDate(value);
    } else {
      setToDate(value);
      if (fromDate && fromDate > value) setFromDate(value);
    }
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setType("");
    setCategoryId("");
    setFromDate("");
    setToDate("");
    setPage(1);
  }

  function retryLoading() {
    setError("");
    if (accounts.length > 0) {
      setRefreshKey((current) => current + 1);
      return;
    }
    setReferenceLoading(true);
    void reloadReferenceData()
      .catch((reason: unknown) => {
        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível carregar contas e categorias.",
        );
      })
      .finally(() => setReferenceLoading(false));
  }

  function changeMonth(value: string) {
    onMonthChange(value);
    setFromDate("");
    setToDate("");
    setPage(1);
  }

  return (
    <main className="page-content cash-book-page">
      <section className="cash-book-toolbar">
        <div className="cash-book-account-group">
          <div className="cash-book-account-main-row">
            <div className="cash-book-account-select">
              <Icon name="bank" size={16} />
              <span>Conta</span>
              <SelectField
                ariaLabel="Conta financeira"
                value={accountId}
                placeholder="Selecione uma conta"
                options={accounts.map((account) => ({ value: account.id, label: account.name }))}
                onValueChange={(value) => { setAccountId(value); setPage(1); }}
                disabled={accounts.length === 0}
              />
            </div>
            <button
              className="secondary-button"
              onClick={() => setShowAccountDialog(true)}
            >
              <Icon name="plus" size={15} />
              Nova conta
            </button>
          </div>
          <button
            className="account-manager-trigger"
            onClick={() => setShowAccountManager(true)}
          >
            Gerenciar contas
          </button>
        </div>
        <DatePicker
          mode="month"
          ariaLabel="Competência do Livro Caixa"
          value={month}
          onChange={changeMonth}
        />
        <button
          className="secondary-button"
          onClick={() => setShowCategoryDialog(true)}
        >
          <Icon name="plus" size={15} />
          Categoria
        </button>
        <button
          className="primary-button"
          onClick={() => setDrawer({ mode: "create", entry: null })}
        >
          <Icon name="plus" size={17} />
          Novo lançamento
        </button>
      </section>

      {error && (
        <div className="cash-book-feedback error" role="alert">
          <Icon name="close" size={15} />
          {error}
          <button className="cash-book-retry" onClick={retryLoading}>
            Tentar novamente
          </button>
          <button aria-label="Dispensar mensagem" onClick={() => setError("")}>
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {loadedQuery === queryKey && summary && (
        <section className="cash-book-summary" aria-label="Resumo da conta">
          {summaryCards(summary).map((card) => (
            <article
              className={`cash-book-summary-card ${card.tone}`}
              key={card.title}
            >
              <div>
                <span>{card.title}</span>
                <i>
                  <Icon name={card.icon} size={16} />
                </i>
              </div>
              <strong>{formatCurrencyDecimal(card.value)}</strong>
              {card.title === "Saldo inicial" && (
                <small>Em {formatMonth(summary.month)}</small>
              )}
            </article>
          ))}
        </section>
      )}

      <section
        className="cash-book-filters"
        aria-label="Filtros do Livro Caixa"
      >
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <input
            aria-label="Buscar movimentações"
            placeholder="Buscar por descrição..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <div className="cash-book-date-filter">
          <span>De</span>
          <DatePicker
            ariaLabel="Filtrar data inicial"
            value={fromDate || `${month}-01`}
            onChange={(value) => setFilterDate("from", value)}
          />
        </div>
        <div className="cash-book-date-filter">
          <span>Até</span>
          <DatePicker
            ariaLabel="Filtrar data final"
            value={toDate || monthEndDate}
            onChange={(value) => setFilterDate("to", value)}
          />
        </div>
        <label className="filter-select">
          <span>Tipo</span>
          <SelectField ariaLabel="Filtrar tipo de movimentação" value={type} onValueChange={(value) => { setType(value); setPage(1); }} options={[{ value: '', label: 'Todos' }, { value: 'income', label: 'Entrada' }, { value: 'expense', label: 'Saída' }, { value: 'transfer', label: 'Transferência' }]} />
        </label>
        <label className="filter-select">
          <span>Categoria</span>
          <SelectField ariaLabel="Filtrar categoria" value={categoryId} onValueChange={(value) => { setCategoryId(value); setPage(1); }} options={[{ value: '', label: 'Todas' }, ...categories.map((category) => ({ value: category.id, label: category.name === 'Outros' ? `Outros (${category.nature === 'income' ? 'receita' : 'despesa'})` : category.name }))]} />
        </label>
        <button className="cash-book-clear-filters" onClick={clearFilters}>
          Limpar filtros
        </button>
      </section>

      {referenceLoading && (
        <div className="cash-book-state">
          <span className="loading-spinner" />
          Carregando contas e categorias…
        </div>
      )}
      {!referenceLoading && accounts.length === 0 && (
        <section className="cash-book-empty-state">
          <span className="placeholder-icon">
            <Icon name="bank" size={22} />
          </span>
          <h2>Cadastre uma conta financeira</h2>
          <p>
            O Livro Caixa precisa de uma conta para registrar os saldos e
            movimentações.
          </p>
          <button
            className="primary-button"
            onClick={() => setShowAccountDialog(true)}
          >
            <Icon name="plus" size={16} />
            Nova conta
          </button>
        </section>
      )}
      {!referenceLoading &&
        accounts.length > 0 &&
        loadedQuery !== queryKey &&
        !error && (
          <div className="cash-book-state">
            <span className="loading-spinner" />
            Carregando movimentações…
          </div>
        )}
      {!referenceLoading &&
        accounts.length > 0 &&
        loadedQuery === queryKey &&
        summary &&
        pageData && (
          <CashBookTable
            entries={pageData.entries}
            pagination={pageData.pagination}
            onPageChange={setPage}
            onView={(entry) => setDrawer({ mode: "view", entry })}
            onEdit={(entry) => setDrawer({ mode: "edit", entry })}
            onDelete={setPendingDelete}
          />
        )}

      {drawer && (
        <CashBookDrawer
          key={`${drawer.mode}-${drawer.entry?.id ?? "new"}`}
          mode={drawer.mode}
          entry={drawer.entry}
          accounts={accounts}
          applications={applications}
          defaultAccountId={accountId}
          categories={categories}
          onClose={() => setDrawer(null)}
          onSave={saveEntry}
        />
      )}
      {showAccountDialog && (
        <FinancialAccountDialog
          onClose={() => setShowAccountDialog(false)}
          onSave={createAccount}
        />
      )}
      {showAccountManager && (
        <FinancialAccountsManagerDialog
          onClose={() => setShowAccountManager(false)}
          onAccountsChanged={reloadReferenceData}
        />
      )}
      {showCategoryDialog && (
        <FinancialCategoryDialog
          onClose={() => setShowCategoryDialog(false)}
          onSave={createCategory}
        />
      )}
      {pendingDelete && (
        <div
          className="modal-layer"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPendingDelete(null);
          }}
        >
          <section
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-cash-book-title"
          >
            <span className="delete-icon">
              <Icon name="trash" size={21} />
            </span>
            <h2 id="delete-cash-book-title">Excluir movimentação?</h2>
            <p>
              {pendingDelete.transferId
                ? "A transferência será removida das duas contas."
                : "A movimentação será excluída do Livro Caixa e os saldos posteriores serão recalculados."}
            </p>
            <div className="dialog-actions">
              <button
                className="secondary-button"
                onClick={() => setPendingDelete(null)}
              >
                Cancelar
              </button>
              <button
                className="danger-button"
                onClick={() => void deleteEntry()}
              >
                Excluir
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
