import type { FormEvent } from "react";
import type { InvestmentMovement } from "../../features/investments/investmentsApi";
import { DatePicker } from "../ui/DatePicker";
import { Icon } from "../ui/Icon";
import { SelectField } from "../ui/SelectField";

export type InvestmentMovementDraft = {
  type: "contribution" | "withdrawal" | "refund" | "income" | "adjustment";
  amount: string;
  occurredAt: string;
  origin: string;
  notes: string;
};

type Props = {
  draft: InvestmentMovementDraft;
  editing: InvestmentMovement | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (draft: InvestmentMovementDraft) => void;
};

export function InvestmentMovementDialog({
  draft,
  editing,
  saving,
  onClose,
  onSubmit,
  onChange,
}: Props) {
  const isFlow =
    draft.type === "contribution" || draft.type === "withdrawal" || draft.type === "refund";
  const title = editing
    ? "Editar movimentação"
    : draft.type === "contribution"
      ? "Novo aporte"
      : draft.type === "withdrawal"
        ? "Novo resgate"
        : draft.type === "refund"
          ? "Nova devolução"
        : "Nova movimentação";

  return (
    <div
      className="drawer-layer"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className="launch-drawer cash-book-drawer investment-drawer"
        role="dialog"
        aria-modal="true"
      >
        <header className="drawer-header">
          <span className="drawer-plus">
            <Icon name="plus" size={17} />
          </span>
          <div>
            <h2>{title}</h2>
            <p>
              Este lançamento atualiza somente esta aplicação; não gera item no Livro Caixa.
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Fechar"
          >
            <Icon name="close" size={18} />
          </button>
        </header>
        <form className="drawer-form" onSubmit={onSubmit}>
          <fieldset disabled={saving}>
            <label className="form-field">
              <span>Tipo</span>
              <SelectField ariaLabel="Tipo de movimentação" value={draft.type} disabled={Boolean(editing)} onValueChange={(value) => onChange({ ...draft, type: value as InvestmentMovementDraft['type'] })} options={[{ value: 'contribution', label: 'Aporte' }, { value: 'withdrawal', label: 'Resgate' }, { value: 'refund', label: 'Devolução' }, { value: 'income', label: 'Rendimento' }, { value: 'adjustment', label: 'Ajuste justificado' }]} />
            </label>
            <label className="form-field">
              <span>Data da movimentação</span>
              <DatePicker
                ariaLabel="Data da movimentação"
                value={draft.occurredAt}
                onChange={(occurredAt) => onChange({ ...draft, occurredAt })}
              />
              <input type="hidden" name="occurredAt" value={draft.occurredAt} />
            </label>
            <label className="form-field">
              <span>Valor (R$)</span>
              <input
                name="amount"
                required
                inputMode="decimal"
                defaultValue={
                  editing ? editing.amount.replace(".", ",") : draft.amount
                }
                placeholder="0,00"
              />
            </label>
            <label className="form-field">
              <span>
                {isFlow ? "Descrição / origem" : "Origem / investidor"}
              </span>
              <input
                name="origin"
                maxLength={120}
                defaultValue={editing?.origin ?? draft.origin}
                placeholder={
                  isFlow
                    ? "Ex.: Transferência de aporte"
                    : "Ex.: Rendimento diário"
                }
              />
            </label>
            <label className="form-field">
              <span>Observações</span>
              <textarea
                name="notes"
                rows={3}
                defaultValue={editing?.notes ?? draft.notes}
              />
            </label>
            {draft.type === "adjustment" && (
              <p className="investment-form-hint">
                Use valor positivo para acréscimo e negativo para redução.
                Informe a justificativa nas observações ou origem.
              </p>
            )}
          </fieldset>
          <footer className="drawer-footer">
            <span />
            <div>
              <button
                type="button"
                className="secondary-button"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="primary-button"
                disabled={saving}
              >
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </footer>
        </form>
      </aside>
    </div>
  );
}
