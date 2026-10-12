import { useState } from "react";
import type { FormEvent } from "react";
import type {
  CashBookEntry,
  FinancialAccount,
  FinancialCategory,
} from "../../features/cash-book/cashBookApi";
import type { InvestmentApplication } from "../../features/investments/investmentsApi";
import { DatePicker } from "../ui/DatePicker";
import { SelectField } from "../ui/SelectField";
import { Icon } from "../ui/Icon";

export type CashBookFormData = {
  entryId?: string;
  transferId?: string;
  type: "income" | "expense" | "transfer";
  occurredAt: string;
  description: string;
  amount: string;
  accountId: string;
  categoryId: string;
  sourceAccountId: string;
  destinationAccountId: string;
  sourceApplicationId: string;
  destinationApplicationId: string;
  notes: string;
};

type CashBookDrawerProps = {
  mode: "create" | "edit" | "view";
  entry?: CashBookEntry | null;
  accounts: FinancialAccount[];
  applications: InvestmentApplication[];
  defaultAccountId: string;
  categories: FinancialCategory[];
  onClose: () => void;
  onSave: (input: CashBookFormData) => Promise<void>;
};

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toInputMoney(value: string) {
  return value.replace(".", ",");
}

function normalizeMoney(value: string) {
  const trimmed = value.trim();
  return trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
}

export function CashBookDrawer({
  mode,
  entry,
  accounts,
  applications,
  defaultAccountId,
  categories,
  onClose,
  onSave,
}: CashBookDrawerProps) {
  const isReadOnly = mode === "view";
  const initialType =
    entry?.type === "income"
      ? "income"
      : entry?.type === "expense"
        ? "expense"
        : entry
          ? "transfer"
          : "expense";
  const [type, setType] = useState<"income" | "expense" | "transfer">(
    initialType,
  );
  const [occurredAt, setOccurredAt] = useState(entry?.occurredAt ?? today());
  const [description, setDescription] = useState(entry?.description ?? "");
  const [amount, setAmount] = useState(entry ? toInputMoney(entry.amount) : "");
  const [accountId, setAccountId] = useState(
    entry?.accountId ?? defaultAccountId,
  );
  const [categoryId, setCategoryId] = useState(
    entry?.categoryId ??
      categories.find((category) => category.nature === initialType)?.id ??
      "",
  );
  const [sourceAccountId, setSourceAccountId] = useState(
    entry?.sourceAccountId ??
      (entry?.type === "transfer_debit" ? entry.accountId : defaultAccountId),
  );
  const [destinationAccountId, setDestinationAccountId] = useState(
    entry?.destinationAccountId ??
      (entry?.type === "transfer_credit"
        ? entry.accountId
        : (accounts.find((account) => account.id !== defaultAccountId)?.id ??
          "")),
  );
  const [sourceApplicationId, setSourceApplicationId] = useState(
    entry?.sourceApplicationId ?? "",
  );
  const [destinationApplicationId, setDestinationApplicationId] = useState(
    entry?.destinationApplicationId ?? "",
  );
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const matchingCategories = categories.filter(
    (category) => category.nature === type && category.active,
  );

  function selectType(nextType: "income" | "expense" | "transfer") {
    setType(nextType);
    if (
      nextType !== "transfer" &&
      !categories.some(
        (category) =>
          category.id === categoryId &&
          category.nature === nextType &&
          category.active,
      )
    ) {
      setCategoryId(
        categories.find(
          (category) => category.nature === nextType && category.active,
        )?.id ?? "",
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const normalizedAmount = normalizeMoney(amount);
    if (!description.trim()) {
      setError("A descrição é obrigatória.");
      return;
    }
    if (
      !/^\d{1,12}(\.\d{1,2})?$/.test(normalizedAmount) ||
      BigInt(normalizedAmount.replace(".", "")) <= 0n
    ) {
      setError("Informe um valor maior que zero, com até duas casas decimais.");
      return;
    }
    if (type === "transfer" && sourceAccountId === destinationAccountId) {
      setError("A conta de origem e destino devem ser diferentes.");
      return;
    }
    if (
      type === "transfer" &&
      accounts.some(
        (account) =>
          account.id === sourceAccountId && account.type === "investment",
      ) &&
      !sourceApplicationId
    ) {
      setError("Selecione a aplicação de origem.");
      return;
    }
    if (
      type === "transfer" &&
      accounts.some(
        (account) =>
          account.id === destinationAccountId && account.type === "investment",
      ) &&
      !destinationApplicationId
    ) {
      setError("Selecione a aplicação de destino.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        entryId: entry?.id,
        transferId: entry?.transferId ?? undefined,
        type,
        occurredAt,
        description: description.trim(),
        amount: normalizedAmount,
        accountId,
        categoryId,
        sourceAccountId,
        destinationAccountId,
        sourceApplicationId,
        destinationApplicationId,
        notes: notes.trim(),
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível salvar a movimentação.",
      );
    } finally {
      setSaving(false);
    }
  }

  const title =
    mode === "create"
      ? "Novo lançamento"
      : mode === "edit"
        ? "Editar lançamento"
        : "Detalhes da movimentação";

  return (
    <div
      className="drawer-layer"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className="launch-drawer cash-book-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cash-book-drawer-title"
      >
        <header className="drawer-header">
          <span className="drawer-plus">
            <Icon name={mode === "view" ? "eye" : "plus"} size={17} />
          </span>
          <div>
            <h2 id="cash-book-drawer-title">{title}</h2>
            <p>
              {isReadOnly
                ? "Confira os dados da movimentação"
                : "Registre uma movimentação efetivamente realizada"}
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Fechar"
            onClick={onClose}
          >
            <Icon name="close" size={18} />
          </button>
        </header>
        <form className="drawer-form" onSubmit={handleSubmit}>
          <fieldset disabled={isReadOnly}>
            <legend>Tipo de movimentação</legend>
            <div className="type-toggle cash-book-type-toggle">
              <button
                type="button"
                className={type === "income" ? "toggle-income selected" : ""}
                disabled={mode === "edit"}
                onClick={() => selectType("income")}
              >
                <Icon name="arrow-down" size={13} />
                Entrada
              </button>
              <button
                type="button"
                className={type === "expense" ? "toggle-expense selected" : ""}
                disabled={mode === "edit"}
                onClick={() => selectType("expense")}
              >
                <Icon name="arrow-up" size={13} />
                Saída
              </button>
              <button
                type="button"
                className={
                  type === "transfer" ? "toggle-transfer selected" : ""
                }
                disabled={mode === "edit"}
                onClick={() => selectType("transfer")}
              >
                <Icon name="bank" size={13} />
                Transferência
              </button>
            </div>
            <label className="form-field">
              <span>Data da movimentação</span>
              <DatePicker
                ariaLabel="Data da movimentação"
                value={occurredAt}
                onChange={setOccurredAt}
                disabled={isReadOnly}
              />
            </label>
            <label className="form-field">
              <span>Descrição</span>
              <input
                required
                maxLength={160}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Ex.: Recebimento de cliente"
              />
            </label>
            <label className="form-field">
              <span>Valor (R$)</span>
              <input
                required
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0,00"
              />
            </label>
            {type === "transfer" ? (
              <>
                <div className="form-field-row">
                  <label className="form-field">
                    <span>Conta de origem</span>
                    <SelectField
                      ariaLabel="Conta de origem"
                      value={sourceAccountId}
                      placeholder="Selecione"
                      options={accounts.map((account) => ({ value: account.id, label: account.name }))}
                      onValueChange={(value) => {
                        setSourceAccountId(value);
                        setSourceApplicationId("");
                      }}
                    />
                  </label>
                  <label className="form-field">
                    <span>Conta de destino</span>
                    <SelectField
                      ariaLabel="Conta de destino"
                      value={destinationAccountId}
                      placeholder="Selecione"
                      options={accounts.map((account) => ({ value: account.id, label: account.name, disabled: account.id === sourceAccountId }))}
                      onValueChange={(value) => {
                        setDestinationAccountId(value);
                        setDestinationApplicationId("");
                      }}
                    />
                  </label>
                </div>
                {accounts.find((account) => account.id === sourceAccountId)
                  ?.type === "investment" && (
                  <label className="form-field">
                    <span>Aplicação de origem</span>
                    <SelectField ariaLabel="Aplicação de origem" value={sourceApplicationId} placeholder="Selecione" options={applications.filter((application) => application.accountId === sourceAccountId && application.active).map((application) => ({ value: application.id, label: application.name }))} onValueChange={setSourceApplicationId} />
                  </label>
                )}
                {accounts.find((account) => account.id === destinationAccountId)
                  ?.type === "investment" && (
                  <label className="form-field">
                    <span>Aplicação de destino</span>
                    <SelectField ariaLabel="Aplicação de destino" value={destinationApplicationId} placeholder="Selecione" options={applications.filter((application) => application.accountId === destinationAccountId && application.active).map((application) => ({ value: application.id, label: application.name }))} onValueChange={setDestinationApplicationId} />
                  </label>
                )}
              </>
            ) : (
              <>
                <label className="form-field">
                  <span>Conta financeira</span>
                  <SelectField ariaLabel="Conta financeira" value={accountId} placeholder="Selecione" options={accounts.map((account) => ({ value: account.id, label: account.name }))} onValueChange={setAccountId} />
                </label>
                <label className="form-field">
                  <span>Categoria</span>
                  <SelectField ariaLabel="Categoria" value={categoryId} placeholder="Selecione" options={matchingCategories.map((category) => ({ value: category.id, label: category.name }))} onValueChange={setCategoryId} />
                </label>
              </>
            )}
            <label className="form-field">
              <span>
                Observações <small>(opcional)</small>
              </span>
              <textarea
                rows={3}
                maxLength={1000}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Adicione detalhes importantes sobre esta movimentação..."
              />
            </label>
          </fieldset>
          {error && (
            <p className="cash-book-error cash-book-drawer-error" role="alert">
              {error}
            </p>
          )}
          <footer className="drawer-footer">
            <span />
            <div>
              <button
                type="button"
                className="secondary-button"
                onClick={onClose}
              >
                {isReadOnly ? "Fechar" : "Cancelar"}
              </button>
              {!isReadOnly && (
                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  <Icon name="check" size={15} />
                  {saving ? "Salvando…" : "Salvar"}
                </button>
              )}
            </div>
          </footer>
        </form>
      </aside>
    </div>
  );
}
