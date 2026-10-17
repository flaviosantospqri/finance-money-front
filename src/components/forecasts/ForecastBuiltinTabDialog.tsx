import { useState } from 'react';

export function ForecastBuiltinTabDialog({
  title,
  initialName,
  onClose,
  onSave,
}: {
  title: string;
  initialName: string;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);
  return (
    <div className="modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="confirm-dialog forecast-group-dialog" role="dialog" aria-modal="true" aria-labelledby="forecast-builtin-tab-title">
        <h2 id="forecast-builtin-tab-title">Editar aba</h2>
        <p>Altere o nome exibido para “{title}”.</p>
        <label className="form-field">
          <span>Nome da aba</span>
          <input autoFocus maxLength={40} value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <div className="dialog-actions forecast-group-actions">
          <span />
          <button className="secondary-button" type="button" onClick={onClose}>Cancelar</button>
          <button className="primary-button" type="button" disabled={!name.trim()} onClick={() => onSave(name.trim())}>Salvar alterações</button>
        </div>
      </section>
    </div>
  );
}
