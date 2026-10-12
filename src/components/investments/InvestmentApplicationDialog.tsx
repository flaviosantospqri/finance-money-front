import type { FormEvent } from "react";
import type {
  FinancialAccount,
  InvestmentApplication,
} from "../../features/investments/investmentsApi";
import { DatePicker } from "../ui/DatePicker";
import { Icon } from "../ui/Icon";

type Props = {
  application: InvestmentApplication | null;
  accounts: FinancialAccount[];
  referenceDate: string;
  saving: boolean;
  onReferenceDateChange: (date: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function InvestmentApplicationDialog({
  application,
  accounts,
  referenceDate,
  saving,
  onReferenceDateChange,
  onClose,
  onSubmit,
}: Props) {
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
            <Icon name="investments" size={17} />
          </span>
          <div>
            <h2>{application ? "Editar aplicação" : "Nova aplicação"}</h2>
            <p>Vincule a aplicação a uma conta de investimento</p>
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
              <span>Nome da aplicação</span>
              <input
                name="name"
                required
                maxLength={120}
                defaultValue={application?.name}
                placeholder="Ex.: CDB liquidez diária"
              />
            </label>
            <label className="form-field">
              <span>Conta de investimento</span>
              <select
                name="accountId"
                required
                defaultValue={application?.accountId ?? accounts[0]?.id ?? ""}
              >
                <option value="">Selecione</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>Tipo de investimento</span>
              <input
                name="investmentType"
                required
                maxLength={80}
                defaultValue={application?.investmentType}
                placeholder="Ex.: CDB, Tesouro Direto, FII"
              />
            </label>
            <label className="form-field">
              <span>Instituição financeira</span>
              <input
                name="institution"
                maxLength={120}
                defaultValue={application?.institution ?? ""}
                placeholder="Ex.: Banco ou corretora"
              />
            </label>
            <label className="form-field">
              <span>Saldo inicial</span>
              <input
                name="openingBalance"
                required
                inputMode="decimal"
                defaultValue={
                  application
                    ? application.openingBalance.replace(".", ",")
                    : "0,00"
                }
              />
            </label>
            <label className="form-field">
              <span>Data de referência</span>
              <DatePicker
                ariaLabel="Data de referência"
                value={referenceDate}
                onChange={onReferenceDateChange}
              />
              <input type="hidden" name="referenceDate" value={referenceDate} />
            </label>
            <label className="form-field">
              <span>Observações</span>
              <textarea
                name="notes"
                rows={3}
                defaultValue={application?.notes ?? ""}
              />
            </label>
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
                {saving ? "Salvando…" : "Salvar aplicação"}
              </button>
            </div>
          </footer>
        </form>
      </aside>
    </div>
  );
}
