import type { InvestmentApplication } from '../../features/investments/investmentsApi';

export function DeleteInvestmentApplicationDialog({
  application,
  busy,
  onClose,
  onConfirm,
}: {
  application: InvestmentApplication;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="modal-layer"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-investment-application-title"
        aria-describedby="delete-investment-application-description"
      >
        <span className="delete-icon">×</span>
        <h2 id="delete-investment-application-title">Excluir aplicação?</h2>
        <p id="delete-investment-application-description">
          <strong>{application.name}</strong> será removida das listas de aplicações ativas e inativas. O histórico financeiro será preservado para manter os registros relacionados íntegros.
        </p>
        <div className="dialog-actions">
          <button className="secondary-button" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="danger-button" onClick={onConfirm} disabled={busy}>
            {busy ? 'Excluindo…' : 'Excluir aplicação'}
          </button>
        </div>
      </section>
    </div>
  );
}
