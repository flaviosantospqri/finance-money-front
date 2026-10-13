import { useState } from 'react';
import type { ForecastGroup } from '../../features/forecasts/forecastsApi';

export function ForecastGroupDialog({
  group,
  busy,
  onClose,
  onSave,
  onDelete,
}: {
  group: ForecastGroup | null;
  busy: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [name, setName] = useState(group?.name ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div
      className="modal-layer"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="confirm-dialog forecast-group-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="forecast-group-title"
      >
        <h2 id="forecast-group-title">{group ? 'Editar aba' : 'Nova aba de contas a pagar'}</h2>
        <p>{group ? 'Altere o nome da aba para organizar suas despesas.' : 'Crie uma aba para separar despesas, como “Contas adicionais”.'}</p>
        <label className="form-field">
          <span>Nome da aba</span>
          <input
            autoFocus
            maxLength={80}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex.: Contas adicionais"
          />
        </label>
        {confirmDelete && (
          <p className="forecast-group-warning">
            As previsões desta aba voltarão para “Contas a pagar”. Essa ação não apaga as previsões.
          </p>
        )}
        <div className="dialog-actions forecast-group-actions">
          {group && onDelete && (
            <button
              className="danger-button"
              type="button"
              disabled={busy}
              onClick={() => {
                if (confirmDelete) void onDelete();
                else setConfirmDelete(true);
              }}
            >
              {confirmDelete ? 'Confirmar exclusão' : 'Excluir aba'}
            </button>
          )}
          <span />
          <button className="secondary-button" type="button" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            className="primary-button"
            type="button"
            disabled={busy || !name.trim()}
            onClick={() => void onSave(name.trim())}
          >
            {busy ? 'Salvando…' : group ? 'Salvar alterações' : 'Criar aba'}
          </button>
        </div>
      </section>
    </div>
  );
}
