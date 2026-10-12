import { useState } from 'react';
import type { Forecast } from '../../features/forecasts/forecastsApi';
import { SelectField } from '../ui/SelectField';

export function DeleteForecastDialog({
  item,
  onCancel,
  onConfirm,
}: {
  item: Forecast;
  onCancel: () => void;
  onConfirm: (scope: 'occurrence' | 'future') => void;
}) {
  const [scope, setScope] = useState<'occurrence' | 'future'>('occurrence');
  return (
    <div
      className="modal-layer"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <section
        className="confirm-dialog forecast-delete-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="forecast-cancel-title"
      >
        <h2 id="forecast-cancel-title">Excluir previsão</h2>
        <p>{item.description}</p>
        {item.occurrenceCount > 1 ? (
          <label className="form-field">
              <span>Aplicar exclusão</span>
            <SelectField ariaLabel="Aplicar exclusão" value={scope} onValueChange={(value) => setScope(value as typeof scope)} options={[{ value: 'occurrence', label: 'Excluir somente esta ocorrência' }, { value: 'future', label: 'Excluir esta e as próximas' }]} />
          </label>
        ) : (
          <p>Esta linha será removida da planilha de previsões.</p>
        )}
        <div className="dialog-actions">
          <button className="secondary-button" onClick={onCancel}>
            Voltar
          </button>
          <button className="danger-button" onClick={() => onConfirm(scope)}>
            Excluir previsão
          </button>
        </div>
      </section>
    </div>
  );
}
