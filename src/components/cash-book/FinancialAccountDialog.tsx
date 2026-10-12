import { useState } from "react";
import type { FormEvent } from "react";
import type { AccountType } from "../../features/cash-book/cashBookApi";
import { DatePicker } from "../ui/DatePicker";
import { Icon } from "../ui/Icon";

type FinancialAccountDialogProps = {
  onClose: () => void;
  onSave: (input: {
    name: string;
    type: AccountType;
    institution?: string;
    openingBalance: string;
    referenceDate: string;
  }) => Promise<void>;
};

function localToday() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function normalizeMoney(value: string) {
  const trimmed = value.trim();
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/\./g, "").replace(",", ".")
    : trimmed;
  return normalized || "0";
}

export function FinancialAccountDialog({
  onClose,
  onSave,
}: FinancialAccountDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("checking");
  const [institution, setInstitution] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0,00");
  const [referenceDate, setReferenceDate] = useState(localToday());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedBalance = normalizeMoney(openingBalance);
    if (!name.trim()) {
      setError("O nome da conta é obrigatório.");
      return;
    }
    if (!/^-?\d{1,12}(\.\d{1,2})?$/.test(normalizedBalance)) {
      setError("Informe um saldo inicial válido, com até duas casas decimais.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        name: name.trim(),
        type,
        institution: institution.trim() || undefined,
        openingBalance: normalizedBalance,
        referenceDate,
      });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível cadastrar a conta.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-layer"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className="confirm-dialog cash-book-setup-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-dialog-title"
        onSubmit={handleSubmit}
      >
        <span className="placeholder-icon">
          <Icon name="bank" size={21} />
        </span>
        <h2 id="account-dialog-title">Nova conta financeira</h2>
        <p>Cadastre uma conta para registrar e acompanhar o saldo inicial.</p>
        <label className="form-field">
          <span>Nome da conta</span>
          <input
            required
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Conta corrente principal"
          />
        </label>
        <label className="form-field">
          <span>Tipo da conta</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as AccountType)}
          >
            <option value="checking">Conta corrente</option>
            <option value="payment">Conta de pagamento</option>
            <option value="cash">Dinheiro</option>
            <option value="investment">Investimento</option>
          </select>
        </label>
        <label className="form-field">
          <span>
            Instituição financeira <small>(opcional)</small>
          </span>
          <input
            maxLength={120}
            value={institution}
            onChange={(event) => setInstitution(event.target.value)}
            placeholder="Ex.: Banco ou corretora"
          />
        </label>
        <label className="form-field">
          <span>Saldo inicial</span>
          <input
            required
            inputMode="decimal"
            value={openingBalance}
            onChange={(event) => setOpeningBalance(event.target.value)}
            placeholder="0,00"
          />
        </label>
        <label className="form-field">
          <span>Data de referência</span>
          <DatePicker
            ariaLabel="Data de referência do saldo inicial"
            value={referenceDate}
            onChange={setReferenceDate}
          />
        </label>
        {error && (
          <p className="cash-book-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary-button" disabled={saving}>
            <Icon name="check" size={15} />
            {saving ? "Salvando…" : "Criar conta"}
          </button>
        </div>
      </form>
    </div>
  );
}
