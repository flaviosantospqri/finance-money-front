import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cashBookApi } from "../../features/cash-book/cashBookApi";
import type { FinancialAccount } from "../../features/cash-book/cashBookApi";
import { formatCurrencyDecimal } from "../../lib/formatters";
import { Icon } from "../ui/Icon";
import { FinancialAccountDialog } from "./FinancialAccountDialog";

const accountTypeLabels: Record<FinancialAccount["type"], string> = {
  checking: "Conta corrente",
  payment: "Conta de pagamento",
  cash: "Dinheiro",
  investment: "Investimento",
};

type FinancialAccountsManagerDialogProps = {
  onClose: () => void;
  onAccountsChanged: () => Promise<void>;
};

export function FinancialAccountsManagerDialog({
  onClose,
  onAccountsChanged,
}: FinancialAccountsManagerDialogProps) {
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);
  const [pendingDeactivation, setPendingDeactivation] = useState<FinancialAccount | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    cashBookApi.getAllAccounts()
      .then((loadedAccounts) => {
        if (active) setAccounts(loadedAccounts);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Não foi possível carregar as contas.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  async function saveAccount(input: Parameters<typeof cashBookApi.createAccount>[0]) {
    if (!editingAccount) return;
    const updated = await cashBookApi.updateAccount(editingAccount.id, input);
    setAccounts((current) => current.map((account) => account.id === updated.id ? updated : account));
    setEditingAccount(null);
    await onAccountsChanged();
    toast.success("Conta atualizada.");
  }

  async function toggleAccountActive(account: FinancialAccount) {
    setSaving(true);
    try {
      const updated = await cashBookApi.updateAccount(account.id, { active: !account.active });
      setAccounts((current) => current.map((item) => item.id === updated.id ? updated : item));
      setPendingDeactivation(null);
      await onAccountsChanged();
      toast.success(updated.active ? "Conta reativada." : "Conta excluída da lista de contas ativas.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível atualizar a conta.");
      setPendingDeactivation(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-layer account-manager-layer" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="confirm-dialog account-manager-dialog" role="dialog" aria-modal="true" aria-labelledby="accounts-manager-title">
        <div className="account-manager-heading">
          <div>
            <span className="placeholder-icon"><Icon name="bank" size={20} /></span>
            <h2 id="accounts-manager-title">Gerenciar contas</h2>
            <p>Edite os dados, desative ou reative suas contas financeiras.</p>
          </div>
          <button className="icon-button" type="button" aria-label="Fechar gerenciamento de contas" onClick={onClose}><Icon name="close" size={17} /></button>
        </div>

        {error && <p className="cash-book-error" role="alert">{error}</p>}
        {loading ? (
          <div className="cash-book-state"><span className="loading-spinner" />Carregando contas…</div>
        ) : accounts.length === 0 ? (
          <div className="account-manager-empty">Nenhuma conta cadastrada.</div>
        ) : (
          <div className="account-manager-list">
            {accounts.map((account) => (
              <article className={`account-manager-item${account.active ? "" : " is-inactive"}`} key={account.id}>
                <span className="account-manager-icon"><Icon name="bank" size={17} /></span>
                <div className="account-manager-details">
                  <strong>{account.name}</strong>
                  <span>{accountTypeLabels[account.type]}{account.institution ? ` · ${account.institution}` : ""}</span>
                  <small>Saldo inicial {formatCurrencyDecimal(account.openingBalance)}</small>
                </div>
                <span className={`account-manager-status${account.active ? " is-active" : ""}`}>{account.active ? "Ativa" : "Inativa"}</span>
                <div className="account-manager-actions">
                  <button className="row-action" type="button" title="Editar conta" aria-label={`Editar ${account.name}`} onClick={() => setEditingAccount(account)}><Icon name="edit" size={16} /></button>
                  {account.active ? (
                    <button className="row-action delete-action" type="button" title="Excluir conta" aria-label={`Excluir ${account.name}`} onClick={() => setPendingDeactivation(account)}><Icon name="trash" size={16} /></button>
                  ) : (
                    <button className="row-action" type="button" title="Reativar conta" aria-label={`Reativar ${account.name}`} onClick={() => void toggleAccountActive(account)}><Icon name="check" size={16} /></button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Fechar</button>
        </div>
      </section>

      {editingAccount && <FinancialAccountDialog account={editingAccount} onClose={() => setEditingAccount(null)} onSave={saveAccount} />}

      {pendingDeactivation && (
        <div className="modal-layer account-manager-confirm-layer" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setPendingDeactivation(null);
        }}>
          <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="deactivate-account-title">
            <span className="delete-icon"><Icon name="trash" size={20} /></span>
            <h2 id="deactivate-account-title">Excluir conta?</h2>
            <p><strong>{pendingDeactivation.name}</strong> deixará de aparecer nos seletores. O histórico financeiro será preservado e a conta poderá ser reativada depois.</p>
            <div className="dialog-actions">
              <button className="secondary-button" type="button" disabled={saving} onClick={() => setPendingDeactivation(null)}>Cancelar</button>
              <button className="primary-button danger-button" type="button" disabled={saving} onClick={() => void toggleAccountActive(pendingDeactivation)}>{saving ? "Excluindo…" : "Excluir conta"}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
