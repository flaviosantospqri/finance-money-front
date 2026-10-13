import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { Icon } from "../../components/ui/Icon";
import { SelectField } from "../../components/ui/SelectField";
import { FinancialAccountDialog } from "../../components/cash-book/FinancialAccountDialog";
import { InvestmentApplicationDialog } from "../../components/investments/InvestmentApplicationDialog";
import { DeleteInvestmentApplicationDialog } from "../../components/investments/DeleteInvestmentApplicationDialog";
import {
  InvestmentMovementDialog,
  type InvestmentMovementDraft,
} from "../../components/investments/InvestmentMovementDialog";
import { cashBookApi } from "../../features/cash-book/cashBookApi";
import {
  investmentsApi,
  type FinancialAccount,
  type InvestmentApplication,
  type InvestmentMovement,
  type InvestmentSummary,
} from "../../features/investments/investmentsApi";
import { formatCurrencyDecimal } from "../../lib/formatters";

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const moneyInput = (value: string) => value.replace(".", ",");
const normalizeMoney = (value: string) =>
  value.trim().includes(",")
    ? value.trim().replace(/\./g, "").replace(",", ".")
    : value.trim();
const signedValue = (movement: InvestmentMovement) =>
  movement.type === "withdrawal" ||
  (movement.type === "adjustment" && movement.amount.startsWith("-"))
    ? `- ${formatCurrencyDecimal(movement.amount.replace("-", ""))}`
    : `+ ${formatCurrencyDecimal(movement.amount)}`;
const typeLabels = {
  contribution: "Aporte",
  withdrawal: "Resgate",
  income: "Rendimento",
  adjustment: "Ajuste",
};

export function InvestmentsPage({ month }: { month: string }) {
  const [applications, setApplications] = useState<InvestmentApplication[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [summary, setSummary] = useState<InvestmentSummary | null>(null);
  const [movements, setMovements] = useState<InvestmentMovement[]>([]);
  const [applicationId, setApplicationId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [showApplication, setShowApplication] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [editingApplication, setEditingApplication] =
    useState<InvestmentApplication | null>(null);
  const [deleteApplicationTarget, setDeleteApplicationTarget] =
    useState<InvestmentApplication | null>(null);
  const [movementDraft, setMovementDraft] =
    useState<InvestmentMovementDraft | null>(null);
  const [editingMovement, setEditingMovement] =
    useState<InvestmentMovement | null>(null);
  const [saving, setSaving] = useState(false);
  const [movementPage, setMovementPage] = useState(1);
  const [movementPageSize, setMovementPageSize] = useState(10);
  const investmentAccounts = useMemo(
    () => accounts.filter((account) => account.type === "investment"),
    [accounts],
  );
  const selectedApplication = applications.find(
    (app) => app.id === applicationId,
  );
  const movementPageCount = Math.max(1, Math.ceil(movements.length / movementPageSize));
  const currentMovementPage = Math.min(movementPage, movementPageCount);
  const visibleMovements = movements.slice(
    (currentMovementPage - 1) * movementPageSize,
    currentMovementPage * movementPageSize,
  );
  const accountApplications = applications.filter(
    (app) => !accountId || app.accountId === accountId,
  );
  const listedApplications = accountApplications.filter(
    (app) => showInactive || app.active,
  );
  const inactiveApplicationCount = accountApplications.filter(
    (app) => !app.active,
  ).length;

  useEffect(() => {
    let active = true;
    Promise.all([investmentsApi.getApplications(), cashBookApi.getAccounts()])
      .then(([apps, loadedAccounts]) => {
        if (!active) return;
        setApplications(apps);
        setAccounts(loadedAccounts);
        setApplicationId((current) => apps.some((app) => app.id === current) ? current : "");
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar as aplicações.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      investmentsApi.getSummary(
        month,
        accountId || undefined,
        applicationId || undefined,
      ),
      applicationId
        ? investmentsApi.getMovements(applicationId)
        : Promise.resolve([]),
    ])
      .then(([data, rows]) => {
        if (!active) return;
        setSummary(data);
        setMovements(rows);
        setError("");
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Não foi possível carregar os investimentos.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [month, accountId, applicationId, refresh]);

  useEffect(() => {
    setMovementPage(1);
  }, [applicationId]);

  async function saveApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      name: String(form.get("name")).trim(),
      accountId: String(form.get("accountId")),
      investmentType: String(form.get("investmentType")).trim(),
      institution: String(form.get("institution") || "").trim() || undefined,
      notes: String(form.get("notes") || "").trim() || undefined,
    };
    setSaving(true);
    try {
      const saved = editingApplication
        ? await investmentsApi.updateApplication(editingApplication.id, input)
        : await investmentsApi.createApplication(input);
      setShowApplication(false);
      setEditingApplication(null);
      setApplicationId(saved.id);
      toast.success(editingApplication ? "Aplicação atualizada." : "Aplicação cadastrada.");
      setRefresh((value) => value + 1);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível salvar a aplicação.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveInvestmentAccount(input: Parameters<typeof cashBookApi.createAccount>[0]) {
    const account = await cashBookApi.createAccount(input);
    setShowAccountDialog(false);
    setAccountId(account.id);
    toast.success("Conta de investimento cadastrada.");
    setRefresh((value) => value + 1);
  }

  async function saveMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!movementDraft) return;
    const form = new FormData(event.currentTarget);
    const type = movementDraft.type;
    const normalized = normalizeMoney(String(form.get("amount")));
    const date = String(form.get("occurredAt"));
    const notes = String(form.get("notes") || "").trim() || undefined;
    const origin = String(form.get("origin") || "").trim() || undefined;
    setSaving(true);
    try {
      const input = { occurredAt: date, type, amount: normalized, origin, notes };
      if (editingMovement)
        await investmentsApi.updateMovement(editingMovement.id, input);
      else await investmentsApi.createMovement(applicationId, input);
      setMovementDraft(null);
      setEditingMovement(null);
      toast.success("Movimentação registrada.");
      setRefresh((value) => value + 1);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível registrar a movimentação.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function deleteMovement(movement: InvestmentMovement) {
    if (!window.confirm("Excluir esta movimentação do histórico?")) return;
    try {
      await investmentsApi.deleteMovement(movement.id);
      toast.success("Movimentação excluída. O saldo foi recalculado.");
      setRefresh((value) => value + 1);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível excluir a movimentação.",
      );
    }
  }

  async function deleteApplication() {
    if (!deleteApplicationTarget) return;
    setSaving(true);
    try {
      await investmentsApi.deleteApplication(deleteApplicationTarget.id);
      toast.success("Aplicação excluída e removida das listas.");
      if (applicationId === deleteApplicationTarget.id) setApplicationId("");
      setDeleteApplicationTarget(null);
      setRefresh((value) => value + 1);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível excluir a aplicação.",
      );
    } finally {
      setSaving(false);
    }
  }

  const cards = [
    {
      label: "Patrimônio investido",
      value: summary?.investedBalance ?? "0",
      tone: "balance",
      icon: "wallet" as const,
    },
    {
      label: "Aportes no período",
      value: summary?.contributions ?? "0",
      tone: "income",
      icon: "arrow-down" as const,
    },
    {
      label: "Resgates no período",
      value: summary?.withdrawals ?? "0",
      tone: "expense",
      icon: "arrow-up" as const,
    },
    {
      label: "Rendimentos no período",
      value: summary?.income ?? "0",
      tone: "income",
      icon: "trend" as const,
    },
  ];

  return (
    <main className="page-content investments-page">
      {error && (
        <div className="cash-book-feedback error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Fechar">×</button>
        </div>
      )}

      {selectedApplication ? (
        <>
          <section className="panel investment-detail-heading">
            <div className="investment-detail-topline">
              <button className="text-link investment-back-button" onClick={() => setApplicationId("")}>
                <Icon name="chevron" size={14} /> Todas as aplicações
              </button>
              <span className={`investment-status${selectedApplication.active ? " is-active" : ""}`}>
                {selectedApplication.active ? "Ativa" : "Inativa"}
              </span>
            </div>
            <div className="investment-detail-main">
              <span className="investment-app-icon"><Icon name="investments" size={20} /></span>
              <div className="investment-detail-copy">
                <h2>{selectedApplication.name}</h2>
                <p>{selectedApplication.investmentType} · {selectedApplication.accountName}{selectedApplication.institution ? ` · ${selectedApplication.institution}` : ""}</p>
              </div>
              <div className="investment-detail-actions">
                <button className="secondary-button" onClick={() => { setEditingApplication(selectedApplication); setShowApplication(true); }}>
                  <Icon name="edit" size={15} /> Editar aplicação
                </button>
                <button className="primary-button" disabled={!selectedApplication.active} onClick={() => {
                  setEditingMovement(null);
                  setMovementDraft({ type: "contribution", amount: "", occurredAt: today(), origin: "", notes: "" });
                }}>
                  <Icon name="plus" size={16} /> Nova movimentação
                </button>
              </div>
            </div>
            {selectedApplication.notes && <p className="investment-detail-notes">{selectedApplication.notes}</p>}
          </section>
          <section className="cash-book-summary investments-summary">
            {cards.map((card) => (
              <article className={`cash-book-summary-card ${card.tone}`} key={card.label}>
                <div><span>{card.label}</span><i><Icon name={card.icon} size={15} /></i></div>
                <strong>{formatCurrencyDecimal(card.value)}</strong>
                <small>{card.label === "Patrimônio investido" ? `Posição em ${summary?.asOf ?? month}` : `Competência ${month}`}</small>
              </article>
            ))}
          </section>
          <section className="panel cash-book-table-panel investments-ledger">
            <header className="cash-book-table-heading">
              <div><h2>Histórico da aplicação</h2><p>Movimentações em ordem cronológica; o saldo começa em zero e é atualizado a cada lançamento.</p></div>
              <label className="cash-book-page-size investment-history-page-size">
                <span>Exibir</span>
                <SelectField ariaLabel="Movimentações do investimento por página" value={String(movementPageSize)} onValueChange={(value) => { setMovementPageSize(Number(value)); setMovementPage(1); }} options={[10, 50, 100].map((size) => ({ value: String(size), label: String(size) }))} />
                <span>por página</span>
              </label>
            </header>
            {loading ? (
              <div className="cash-book-state">Carregando histórico…</div>
            ) : !movements.length ? (
              <div className="investments-empty compact">
                <h3>Esta aplicação ainda não tem movimentações</h3>
                <p>Registre aportes, resgates e rendimentos. Cada lançamento ficará no histórico desta aplicação.</p>
                <button className="primary-button" disabled={!selectedApplication.active} onClick={() => {
                  setEditingMovement(null);
                  setMovementDraft({ type: "contribution", amount: "", occurredAt: today(), origin: "", notes: "" });
                }}><Icon name="plus" size={15} /> Adicionar movimentação</button>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="transactions-table cash-book-table investments-table investment-detail-table">
                  <thead><tr><th>Data</th><th>Origem / descrição</th><th>Tipo</th><th className="cash-book-balance-heading">Valor</th><th className="cash-book-balance-heading">Rendimento</th><th className="cash-book-balance-heading">Saldo acumulado</th><th>Ações</th></tr></thead>
                  <tbody>
                    {visibleMovements.map((movement) => (
                      <tr key={movement.id}>
                        <td>{new Intl.DateTimeFormat("pt-BR").format(new Date(`${movement.occurredAt}T12:00:00`))}</td>
                        <td>{movement.origin || movement.notes || "—"}</td>
                        <td><span className={`investment-type-chip ${movement.type}`}>{typeLabels[movement.type]}</span></td>
                        <td className={`cash-book-money ${movement.type === "income" || movement.type === "contribution" ? "income" : ""}`}>{signedValue(movement)}</td>
                        <td className="cash-book-money income">{movement.type === "income" ? formatCurrencyDecimal(movement.amount) : "—"}</td>
                        <td className="cash-book-money balance">{formatCurrencyDecimal(movement.balance)}</td>
                        <td><div className="investment-row-actions">
                            <button className="icon-button" aria-label="Editar movimentação" onClick={() => {
                              setEditingMovement(movement);
                              setMovementDraft({ type: movement.type, amount: moneyInput(movement.amount), occurredAt: movement.occurredAt, origin: movement.origin ?? "", notes: movement.notes ?? "" });
                            }}><Icon name="edit" size={15} /></button>
                            <button className="icon-button danger" aria-label="Excluir movimentação" onClick={() => void deleteMovement(movement)}><Icon name="trash" size={15} /></button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!loading && movements.length > 0 && (
              <div className="table-footer">
                <span>Exibindo {(currentMovementPage - 1) * movementPageSize + 1}–{Math.min(currentMovementPage * movementPageSize, movements.length)} de {movements.length} movimentações</span>
                <div className="pagination">
                  <button disabled={currentMovementPage <= 1} onClick={() => setMovementPage((page) => Math.max(1, page - 1))}>Anterior</button>
                  <span>{currentMovementPage} / {movementPageCount}</span>
                  <button disabled={currentMovementPage >= movementPageCount} onClick={() => setMovementPage((page) => Math.min(movementPageCount, page + 1))}>Próxima</button>
                </div>
              </div>
            )}
          </section>
        </>
      ) : (
        <>
          <div className="investments-toolbar">
            <div className="cash-book-account-select">
              <Icon name="bank" size={16} /><span>Conta de investimento</span>
              <SelectField ariaLabel="Filtrar por conta" value={accountId} options={[{ value: "", label: investmentAccounts.length ? "Todas as contas" : "Nenhuma cadastrada" }, ...investmentAccounts.map((account) => ({ value: account.id, label: account.name }))]} onValueChange={setAccountId} />
            </div>
            <div className="investments-toolbar-actions">
              <button className="secondary-button" onClick={() => setShowAccountDialog(true)}><Icon name="plus" size={15} /> Nova conta de investimento</button>
              <button className="primary-button" disabled={!investmentAccounts.length} onClick={() => { setEditingApplication(null); setShowApplication(true); }}><Icon name="plus" size={15} /> Nova aplicação</button>
            </div>
          </div>
          <section className="cash-book-summary investments-summary">
            {cards.map((card) => (
              <article className={`cash-book-summary-card ${card.tone}`} key={card.label}>
                <div><span>{card.label}</span><i><Icon name={card.icon} size={15} /></i></div>
                <strong>{formatCurrencyDecimal(card.value)}</strong>
                <small>{card.label === "Patrimônio investido" ? `Posição em ${summary?.asOf ?? month}` : `Competência ${month}`}</small>
              </article>
            ))}
          </section>
          <section className="panel investments-applications">
            <header className="cash-book-table-heading">
              <div><h2>Aplicações</h2><p>Selecione uma aplicação para abrir seu saldo e histórico de movimentações.</p></div>
              <div className="investment-list-controls">
                <span className="investment-count">{listedApplications.length} {listedApplications.length === 1 ? "aplicação" : "aplicações"}</span>
                {inactiveApplicationCount > 0 && <button className="text-link" onClick={() => setShowInactive((value) => !value)}>{showInactive ? "Ocultar inativas" : `Mostrar inativas (${inactiveApplicationCount})`}</button>}
              </div>
            </header>
            {loading && !applications.length ? (
              <div className="cash-book-state">Carregando aplicações…</div>
            ) : !listedApplications.length ? (
              <div className="investments-empty">
                <span className="placeholder-icon"><Icon name="investments" size={22} /></span>
                <h3>{applications.length ? "Nenhuma aplicação ativa nesta conta" : "Nenhuma aplicação cadastrada"}</h3>
                <p>{inactiveApplicationCount ? "Existem aplicações inativas ocultas. Use “Mostrar inativas” para visualizá-las ou reativá-las." : investmentAccounts.length ? "Cadastre uma aplicação vinculada a uma conta de investimento para acompanhar aportes, resgates e rendimentos em um único histórico." : "Cadastre uma conta de investimento e depois crie a primeira aplicação."}</p>
                <button className="primary-button" onClick={() => {
                  if (!investmentAccounts.length) setShowAccountDialog(true);
                  else { setEditingApplication(null); setShowApplication(true); }
                }}><Icon name="plus" size={15} /> {investmentAccounts.length ? "Nova aplicação" : "Nova conta de investimento"}</button>
              </div>
            ) : (
              <div className="table-scroll investment-applications-table-scroll">
                <table className="transactions-table cash-book-table investment-applications-table">
                  <thead><tr><th>Aplicação</th><th>Conta / instituição</th><th>Tipo</th><th className="cash-book-balance-heading">Saldo atual</th><th>Situação</th><th>Ações</th></tr></thead>
                  <tbody>
                    {listedApplications.map((app) => (
                      <tr key={app.id}>
                        <td><button className="investment-open-link" onClick={() => setApplicationId(app.id)}><span className="investment-app-icon"><Icon name="investments" size={16} /></span><strong>{app.name}</strong><Icon name="chevron" size={14} /></button></td>
                        <td>{app.accountName}{app.institution ? ` · ${app.institution}` : ""}</td>
                        <td>{app.investmentType}</td>
                        <td className="cash-book-money balance">{formatCurrencyDecimal(app.balance ?? "0.00")}</td>
                        <td><span className={`investment-status${app.active ? " is-active" : ""}`}>{app.active ? "Ativa" : "Inativa"}</span></td>
                        <td><div className="investment-row-actions">
                          <button className="icon-button" aria-label={`Editar ${app.name}`} onClick={() => { setEditingApplication(app); setShowApplication(true); }}><Icon name="edit" size={15} /></button>
                          <button className="icon-button" title={app.active ? "Desativar aplicação (mantém o histórico)" : "Reativar aplicação"} aria-label={`${app.active ? "Desativar" : "Ativar"} ${app.name}`} onClick={async () => {
                            try {
                              await investmentsApi.updateApplication(app.id, { active: !app.active });
                              toast.success(app.active ? "Aplicação desativada." : "Aplicação ativada.");
                              setRefresh((value) => value + 1);
                            } catch (reason) {
                              setError(reason instanceof Error ? reason.message : "Não foi possível atualizar a aplicação.");
                            }
                          }}><Icon name={app.active ? "close" : "check"} size={15} /></button>
                          <button className="icon-button danger" title="Excluir aplicação" aria-label={`Excluir ${app.name}`} onClick={() => setDeleteApplicationTarget(app)}><Icon name="trash" size={15} /></button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {showApplication && (
        <InvestmentApplicationDialog
          application={editingApplication}
          accounts={investmentAccounts}
          saving={saving}
          onClose={() => {
            setShowApplication(false);
            setEditingApplication(null);
          }}
          onSubmit={saveApplication}
        />
      )}
      {deleteApplicationTarget && (
        <DeleteInvestmentApplicationDialog
          application={deleteApplicationTarget}
          busy={saving}
          onClose={() => setDeleteApplicationTarget(null)}
          onConfirm={() => void deleteApplication()}
        />
      )}
      {showAccountDialog && (
        <FinancialAccountDialog
          initialType="investment"
          fixedType="investment"
          onClose={() => setShowAccountDialog(false)}
          onSave={saveInvestmentAccount}
        />
      )}
      {movementDraft && (
        <InvestmentMovementDialog
          draft={movementDraft}
          editing={editingMovement}
          saving={saving}
          onClose={() => {
            setMovementDraft(null);
            setEditingMovement(null);
          }}
          onSubmit={saveMovement}
          onChange={setMovementDraft}
        />
      )}
    </main>
  );
}
