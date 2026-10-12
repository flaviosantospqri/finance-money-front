import { useState } from 'react';
import type { FormEvent } from 'react';
import { DatePicker } from '../ui/DatePicker';
import { Icon } from '../ui/Icon';
import { SelectField } from '../ui/SelectField';
import type {
  FinancialAccount,
  FinancialCategory,
} from '../../features/cash-book/cashBookApi';
import type { Forecast, ForecastInput } from '../../features/forecasts/forecastsApi';
import { currentDate, normalizeMoney } from './forecastUtils';

export function ForecastForm({
  item,
  scope,
  accounts,
  categories,
  busy,
  onClose,
  onSave,
}: {
  item: Forecast | null;
  scope: 'occurrence' | 'future';
  accounts: FinancialAccount[];
  categories: FinancialCategory[];
  busy: boolean;
  onClose: () => void;
  onSave: (
    input: ForecastInput,
    id?: string,
    scope?: 'occurrence' | 'future',
  ) => Promise<void>;
}) {
  const [kind, setKind] = useState<'income' | 'expense'>(
      item?.kind ?? 'expense',
    ),
    [description, setDescription] = useState(item?.description ?? ''),
    [amount, setAmount] = useState(item?.amount ?? ''),
    [dueDate, setDueDate] = useState(item?.dueDate ?? currentDate()),
    [categoryId, setCategoryId] = useState(item?.categoryId ?? ''),
    [accountId, setAccountId] = useState(item?.accountId ?? ''),
    [destinationId, setDestinationId] = useState(item?.destinationId ?? ''),
    [recurrence, setRecurrence] = useState<
      'once' | 'monthly' | 'weekly' | 'yearly'
    >('once'),
    [occurrenceCount, setOccurrenceCount] = useState(1),
    [notes, setNotes] = useState(item?.notes ?? ''),
    [editScope, setEditScope] = useState<'occurrence' | 'future'>(scope),
    [error, setError] = useState('');
  const choices = categories.filter((c) => c.nature === kind && c.active);
  const selectedCategory = choices.find((category) => category.id === categoryId);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeMoney(amount);
    if (
      !description.trim() ||
      !categoryId ||
      !/^\d{1,12}(\.\d{1,2})?$/.test(normalized) ||
      !/[1-9]/.test(normalized)
    ) {
      setError('Informe descrição, valor positivo e categoria válida.');
      return;
    }
    await onSave(
      {
        kind,
        description: description.trim(),
        amount: normalized,
        dueDate,
        categoryId,
        accountId: accountId || undefined,
        destinationId: kind === 'expense' ? selectedCategory?.destinationId : destinationId || undefined,
        recurrence,
        occurrenceCount: recurrence === 'once' ? 1 : occurrenceCount,
        notes: notes.trim() || undefined,
      },
      item?.id,
      editScope,
    );
  }
  return (
    <div
      className="drawer-layer"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        className="launch-drawer forecast-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="forecast-form-title"
      >
        <header className="drawer-header">
          <span className="drawer-plus">
            <Icon name="calendar" size={16} />
          </span>
          <div>
            <h2 id="forecast-form-title">
              {item ? 'Editar previsão' : 'Nova previsão'}
            </h2>
            <p>Planejamento financeiro</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <Icon name="close" />
          </button>
        </header>
        <form className="drawer-form" onSubmit={(e) => void submit(e)}>
          <fieldset disabled={busy}>
            <legend>Dados da previsão</legend>
            <label className="form-field">
              <span>Tipo</span>
              <SelectField ariaLabel="Tipo da previsão" value={kind} options={[{ value: 'income', label: 'Receita' }, { value: 'expense', label: 'Despesa' }]} onValueChange={(value) => {
                  const next = value as 'income' | 'expense';
                  setKind(next);
                  setCategoryId(
                    categories.find((c) => c.nature === next)?.id ?? '',
                  );
                }} />
            </label>
            <label className="form-field">
              <span>Descrição</span>
              <input
                required
                maxLength={160}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <label className="form-field">
              <span>Valor previsto (R$)</span>
              <input
                required
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="form-field">
              <span>Vencimento / recebimento esperado</span>
              <DatePicker
                ariaLabel="Data prevista"
                value={dueDate}
                onChange={setDueDate}
              />
            </label>
            <label className="form-field">
              <span>Categoria</span>
              <SelectField ariaLabel="Categoria" value={categoryId} placeholder="Selecione" options={choices.map((category) => ({ value: category.id, label: `${category.destinationName} · ${category.name}` }))} onValueChange={(value) => {
                setCategoryId(value);
                const selected = choices.find((category) => category.id === value);
                if (selected) setDestinationId(selected.destinationId);
              }} />
            </label>
            <label className="form-field">
              <span>Conta prevista (opcional)</span>
              <SelectField ariaLabel="Conta prevista" value={accountId} options={[{ value: '', label: 'Sem conta definida' }, ...accounts.map((account) => ({ value: account.id, label: account.name }))]} onValueChange={setAccountId} />
            </label>
            {kind === 'expense' && selectedCategory && (
              <p className="cash-book-feedback">Esta despesa será acompanhada no repasse <strong>{selectedCategory.destinationName}</strong>.</p>
            )}
            {!item && (
              <>
                <label className="form-field">
                  <span>Recorrência</span>
                  <SelectField ariaLabel="Recorrência" value={recurrence} onValueChange={(value) => setRecurrence(value as typeof recurrence)} options={[{ value: 'once', label: 'Única' }, { value: 'monthly', label: 'Mensal' }, { value: 'weekly', label: 'Semanal' }, { value: 'yearly', label: 'Anual' }]} />
                </label>
                {recurrence !== 'once' && (
                  <label className="form-field">
                    <span>Quantidade de ocorrências (até 120)</span>
                    <input
                      type="number"
                      min="2"
                      max="120"
                      value={occurrenceCount}
                      onChange={(e) =>
                        setOccurrenceCount(Number(e.target.value))
                      }
                    />
                  </label>
                )}
              </>
            )}
            {item && item.occurrenceCount > 1 && (
              <label className="form-field">
                <span>Aplicar edição</span>
                <SelectField ariaLabel="Aplicar edição" value={editScope} onValueChange={(value) => setEditScope(value as typeof editScope)} options={[{ value: 'occurrence', label: 'Somente esta ocorrência' }, { value: 'future', label: 'Esta e as próximas' }]} />
              </label>
            )}
            <label className="form-field">
              <span>Observações</span>
              <textarea
                maxLength={1000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            {error && <p className="cash-book-error">{error}</p>}
          </fieldset>
          <footer className="drawer-footer">
            <span />
            <div>
              <button
                className="secondary-button"
                type="button"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button className="primary-button" disabled={busy} type="submit">
                {busy ? 'Salvando…' : 'Salvar previsão'}
              </button>
            </div>
          </footer>
        </form>
      </aside>
    </div>
  );
}
