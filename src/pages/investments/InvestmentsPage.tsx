import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { Icon } from "../../components/ui/Icon";
import { SelectField } from "../../components/ui/SelectField";
import { FinancialAccountDialog } from "../../components/cash-book/FinancialAccountDialog";
import { InvestmentApplicationDialog } from "../../components/investments/InvestmentApplicationDialog";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [showApplication, setShowApplication] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [editingApplication, setEditingApplication] =
    useState<InvestmentApplication | null>(null);
  const [movementDraft, setMovementDraft] =
    useState<InvestmentMovementDraft | null>(null);
  const [editingMovement, setEditingMovement] =
    useState<InvestmentMovement | null>(null);
  const [saving, setSaving] = useState(false);
  const [applicationDate, setApplicationDate] = useState(today);
  const investmentAccounts = useMemo(
    () => accounts.filter((account) => account.type === "investment"),
    [accounts],
  );
  const cashAccounts = useMemo(
    () => accounts.filter((account) => account.type !== "investment"),
    [accounts],
  );
  const visibleApplications = useMemo(
    () =>
      applications.filter(
        (app) => app.active && (!accountId || app.accountId === accountId),
      ),
    [applications, accountId],
  );
  const selectedApplication = applications.find(
    (app) => app.id === applicationId,
  );

  useEffect(() => {
    let active = true;
    Promise.all([investmentsApi.getApplications(), cashBookApi.getAccounts()])
      .then(([apps, loadedAccounts]) => {
        if (!active) return;
        setApplications(apps);
        setAccounts(loadedAccounts);
        setApplicationId((current) => current || apps[0]?.id || "");
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
    Promise.all([
      investmentsApi.getSummary(
        month,
        accountId || undefined,
        applicationId || undefined,
      ),
      applicationId
        ? investmentsApi.getMovements(applicationId, month)
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

  async function saveApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      name: String(form.get("name")).trim(),
      accountId: String(form.get("accountId")),
      investmentType: String(form.get("investmentType")).trim(),
      institution: String(form.get("institution") || "").trim() || undefined,
      openingBalance: normalizeMoney(String(form.get("openingBalance"))),
      referenceDate: applicationDate,
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
    toast.success("Conta de investimento cadastrada e disponível no Livro Caixa.");
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
      if (type === "contribution" || type === "withdrawal") {
        const sourceAccountId =
          type === "contribution"
            ? movementDraft.sourceAccountId
            : (selectedApplication?.accountId ?? "");
        const destinationAccountId =
          type === "contribution"
            ? (selectedApplication?.accountId ?? "")
            : movementDraft.sourceAccountId;
        await investmentsApi.transfer({
          occurredAt: date,
          description:
            origin ||
            `${type === "contribution" ? "Aporte" : "Resgate"} — ${selectedApplication?.name ?? "Investimento"}`,
          amount: normalized,
          sourceAccountId,
          destinationAccountId,
          sourceApplicationId:
            type === "withdrawal" ? applicationId : undefined,
          destinationApplicationId:
            type === "contribution" ? applicationId : undefined,
          notes,
        });
      } else {
        const input = {
          occurredAt: date,
          type,
          amount: normalized,
          origin,
          notes,
        };
        if (editingMovement)
          await investmentsApi.updateMovement(editingMovement.id, input);
        else await investmentsApi.createMovement(applicationId, input);
      }
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
      <div className="investments-toolbar">
        <div className="cash-book-account-select">
          <Icon name="bank" size={16} />
          <span>Conta de investimento</span>
          <SelectField
            ariaLabel="Filtrar por conta"
            value={accountId}
            options={[{ value: '', label: investmentAccounts.length ? 'Todas as contas' : 'Nenhuma cadastrada' }, ...investmentAccounts.map((account) => ({ value: account.id, label: account.name }))]}
            onValueChange={(value) => {
              setAccountId(value);
              setApplicationId("");
            }}
          />
        </div>
        <div className="cash-book-account-select">
          <Icon name="wallet" size={16} />
          <span>Aplicação</span>
          <SelectField ariaLabel="Filtrar aplicação" value={applicationId} options={[{ value: '', label: 'Todas as aplicações' }, ...visibleApplications.map((app) => ({ value: app.id, label: app.name }))]} onValueChange={setApplicationId} />
        </div>
        <div className="investments-toolbar-actions">
          <button className="secondary-button" onClick={() => setShowAccountDialog(true)}>
            <Icon name="plus" size={15} />
            Nova conta de investimento
          </button>
          <button
            className="secondary-button"
            disabled={!investmentAccounts.length}
            onClick={() => {
              setEditingApplication(null);
              setApplicationDate(today());
              setShowApplication(true);
            }}
          >
            <Icon name="plus" size={15} />
            Nova aplicação
          </button>
          <button
            className="primary-button"
            disabled={!selectedApplication || !selectedApplication.active}
            onClick={() => {
              setEditingMovement(null);
              setMovementDraft({
                type: "contribution",
                amount: "",
                occurredAt: today(),
                origin: "",
                notes: "",
                sourceAccountId: cashAccounts[0]?.id ?? "",
              });
            }}
          >
            <Icon name="plus" size={16} />
            Movimentação
          </button>
        </div>
      </div>
      {error && (
        <div className="cash-book-feedback error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Fechar">
            ×
          </button>
        </div>
      )}
      <section className="cash-book-summary investments-summary">
        {cards.map((card) => (
          <article
            className={`cash-book-summary-card ${card.tone}`}
            key={card.label}
          >
            <div>
              <span>{card.label}</span>
              <i>
                <Icon name={card.icon} size={15} />
              </i>
            </div>
            <strong>{formatCurrencyDecimal(card.value)}</strong>
            <small>
              {card.label === "Patrimônio investido"
                ? `Posição em ${summary?.asOf ?? month}`
                : `Competência ${month}`}
            </small>
          </article>
        ))}
      </section>
      <section className="panel investments-applications">
        <header className="cash-book-table-heading">
          <div>
            <h2>Aplicações</h2>
            <p>Contas de investimento e posição atual de cada aplicação</p>
          </div>
        </header>
        {loading && !applications.length ? (
          <div className="cash-book-state">Carregando aplicações…</div>
        ) : !applications.length ? (
          <div className="investments-empty">
            <span className="placeholder-icon">
              <Icon name="investments" size={22} />
            </span>
            <h3>Nenhuma aplicação cadastrada</h3>
            <p>
              {investmentAccounts.length
                ? "Cadastre uma aplicação vinculada a uma conta do tipo investimento para começar."
                : "O Livro Caixa mostra todas as contas ativas. Aqui aparecem somente contas do tipo investimento, e ainda não há nenhuma cadastrada."}
            </p>
            <button
              className="primary-button"
              onClick={() => {
                if (!investmentAccounts.length) setShowAccountDialog(true);
                else {
                  setApplicationDate(today());
                  setShowApplication(true);
                }
              }}
            >
              <Icon name="plus" size={15} />
              {investmentAccounts.length ? "Cadastrar aplicação" : "Cadastrar conta de investimento"}
            </button>
          </div>
        ) : (
          <div className="investments-app-list">
            {applications
              .filter((app) => !accountId || app.accountId === accountId)
              .map((app) => (
                <article
                  key={app.id}
                  className={`investment-app-card ${app.id === applicationId ? "selected" : ""}`}
                >
                  <button className="investment-app-select" onClick={() => setApplicationId(app.id)}>
                    <span className="investment-app-icon"><Icon name="investments" size={18} /></span>
                    <span className="investment-app-copy">
                      <strong>{app.name}</strong>
                      <small>{app.accountName} · {app.investmentType}{app.institution ? ` · ${app.institution}` : ""}</small>
                    </span>
                    <strong className="investment-app-balance">{formatCurrencyDecimal(app.balance ?? app.openingBalance)}</strong>
                  </button>
                  <span className="investment-app-actions">
                    <button
                      className="icon-button"
                      aria-label={`Editar ${app.name}`}
                      onClick={() => {
                        setEditingApplication(app);
                        setApplicationDate(app.referenceDate);
                        setShowApplication(true);
                      }}
                    >
                      <Icon name="edit" size={15} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`${app.active ? "Desativar" : "Ativar"} ${app.name}`}
                      onClick={async () => {
                        try {
                          await investmentsApi.updateApplication(app.id, {
                            active: !app.active,
                          });
                          toast.success(
                            app.active
                              ? "Aplicação desativada."
                              : "Aplicação ativada.",
                          );
                          setRefresh((value) => value + 1);
                        } catch (reason) {
                          setError(
                            reason instanceof Error
                              ? reason.message
                              : "Não foi possível atualizar a aplicação.",
                          );
                        }
                      }}
                    >
                      <Icon name={app.active ? "close" : "check"} size={15} />
                    </button>
                  </span>
                </article>
              ))}
          </div>
        )}
      </section>
      <section className="panel cash-book-table-panel investments-ledger">
        <header className="cash-book-table-heading">
          <div>
            <h2>
              {selectedApplication
                ? `Histórico — ${selectedApplication.name}`
                : "Movimentações"}
            </h2>
            <p>Aportes, resgates e rendimentos em ordem cronológica</p>
          </div>
        </header>
        {!applicationId ? (
          <div className="cash-book-state">
            Selecione uma aplicação para consultar o histórico.
          </div>
        ) : loading ? (
          <div className="cash-book-state">Carregando movimentações…</div>
        ) : !movements.length ? (
          <div className="investments-empty compact">
            <h3>Nenhuma movimentação nesta competência</h3>
            <p>
              Registre um aporte, resgate ou rendimento para esta aplicação.
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="transactions-table cash-book-table investments-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Conta / aplicação</th>
                  <th>Investidor / origem</th>
                  <th>Tipo</th>
                  <th className="cash-book-balance-heading">Valor</th>
                  <th className="cash-book-balance-heading">Rendimento</th>
                  <th className="cash-book-balance-heading">Saldo acumulado</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id}>
                    <td>
                      {new Intl.DateTimeFormat("pt-BR").format(
                        new Date(`${movement.occurredAt}T12:00:00`),
                      )}
                    </td>
                    <td>
                      <strong>{selectedApplication?.name}</strong>
                      <small>{selectedApplication?.accountName}</small>
                    </td>
                    <td>{movement.origin || "—"}</td>
                    <td>
                      <span className={`investment-type-chip ${movement.type}`}>
                        {typeLabels[movement.type]}
                      </span>
                    </td>
                    <td
                      className={`cash-book-money ${movement.type === "income" || movement.type === "contribution" ? "income" : ""}`}
                    >
                      {signedValue(movement)}
                    </td>
                    <td className="cash-book-money income">
                      {movement.type === "income"
                        ? formatCurrencyDecimal(movement.amount)
                        : "—"}
                    </td>
                    <td className="cash-book-money balance">
                      {formatCurrencyDecimal(movement.balance)}
                    </td>
                    <td>
                      <div className="investment-row-actions">
                        {!movement.transferId ? (
                          <>
                            <button
                              className="icon-button"
                              aria-label="Editar movimentação"
                              onClick={() => {
                                setEditingMovement(movement);
                                setMovementDraft({
                                  type: movement.type as
                                    "income" | "adjustment",
                                  amount: moneyInput(movement.amount),
                                  occurredAt: movement.occurredAt,
                                  origin: movement.origin ?? "",
                                  notes: movement.notes ?? "",
                                  sourceAccountId: "",
                                });
                              }}
                            >
                              <Icon name="edit" size={15} />
                            </button>
                            <button
                              className="icon-button danger"
                              aria-label="Excluir movimentação"
                              onClick={() => void deleteMovement(movement)}
                            >
                              <Icon name="trash" size={15} />
                            </button>
                          </>
                        ) : (
                          <small className="investment-source-note">
                            Livro Caixa
                          </small>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showApplication && (
        <InvestmentApplicationDialog
          application={editingApplication}
          accounts={investmentAccounts}
          referenceDate={applicationDate}
          saving={saving}
          onReferenceDateChange={setApplicationDate}
          onClose={() => {
            setShowApplication(false);
            setEditingApplication(null);
          }}
          onSubmit={saveApplication}
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
          cashAccounts={cashAccounts}
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
