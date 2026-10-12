import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Icon } from '../../components/ui/Icon';
import { forecastsApi, type FinancialRepasse, type FinancialRepasseInput } from '../../features/forecasts/forecastsApi';
import { formatCurrencyDecimal } from '../../lib/formatters';

type Props = { month: string };
type RepasseForm = { name: string; valueType: 'percentage' | 'fixed'; value: string; effectiveFrom: string; effectiveTo: string };
const emptyForm = (month: string): RepasseForm => ({ name: '', valueType: 'percentage', value: '0', effectiveFrom: month, effectiveTo: '' });
const formatPeriod = (period: string) => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(`${period}-15T12:00:00`));
const currentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export function RepassesPage({ month }: Props) {
  const [rows, setRows] = useState<FinancialRepasse[]>([]);
  const [form, setForm] = useState<RepasseForm>(() => emptyForm(month));
  const [editing, setEditing] = useState<FinancialRepasse | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FinancialRepasse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await forecastsApi.repasses());
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar os repasses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function startCreate() {
    setEditing(null);
    setForm(emptyForm(month < currentPeriod() ? currentPeriod() : month));
    setError('');
    setSuccess('');
  }

  function startEdit(row: FinancialRepasse) {
    const effectiveFrom = row.effectiveFrom < currentPeriod() ? currentPeriod() : row.effectiveFrom;
    setEditing(row);
    setForm({ name: row.name, valueType: row.valueType, value: row.value, effectiveFrom, effectiveTo: row.effectiveTo ?? '' });
    setError('');
    setSuccess('');
  }

  function updateForm<K extends keyof RepasseForm>(key: K, value: RepasseForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload: FinancialRepasseInput = {
      name: form.name.trim(),
      valueType: form.valueType,
      value: form.value,
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.effectiveTo || null,
    };
    try {
      await (editing ? forecastsApi.updateRepasse(editing.id, payload) : forecastsApi.createRepasse(payload));
      setSuccess(editing ? 'Repasse atualizado a partir da vigência escolhida.' : 'Repasse cadastrado.');
      setEditing(null);
      setForm(emptyForm(month));
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o repasse.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!pendingDelete) return;
    setSaving(true);
    try {
      await forecastsApi.deleteRepasse(pendingDelete.id);
      setPendingDelete(null);
      if (editing?.id === pendingDelete.id) startCreate();
      setSuccess('A vigência do repasse foi removida. Os meses anteriores permanecem preservados.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível remover o repasse.');
      setPendingDelete(null);
    } finally {
      setSaving(false);
    }
  }

  const isHistorical = (row: FinancialRepasse) => Boolean(row.effectiveTo && row.effectiveTo < currentPeriod());
  const displayValue = (row: FinancialRepasse) => row.valueType === 'percentage' ? `${row.value}%` : formatCurrencyDecimal(row.value);

  return (
    <main className="page-content repasses-page">
      <section className="panel repasses-intro">
        <div><h2>Hub de configuração de repasse</h2><p>Regras globais valem da vigência em diante. Ajustes feitos em Previsões ficam restritos à competência selecionada.</p></div>
        <button className="primary-button" onClick={startCreate}><Icon name="plus" size={16} /> Novo repasse</button>
      </section>

      {error && <div className="cash-book-error" role="alert">{error}</div>}
      {success && <div className="repasses-success" role="status">{success}</div>}

      <div className="repasses-layout">
        <section className="panel repasses-list">
          <header className="panel-heading"><div><h2>Regras de repasse</h2><p>Percentual ou valor fixo com início e fim de vigência</p></div></header>
          {loading ? <div className="repasses-empty">Carregando regras…</div> : rows.length === 0 ? <div className="repasses-empty">Nenhum repasse cadastrado. Crie a primeira regra global.</div> : (
            <div className="table-scroll"><table className="transactions-table repasses-table"><thead><tr><th>Nome</th><th>Valor</th><th>Início da vigência</th><th>Fim da vigência</th><th>Situação</th><th>Ações</th></tr></thead><tbody>
              {rows.map((row) => {
                const historical = isHistorical(row);
                const activePeriod = currentPeriod();
                const current = row.effectiveFrom <= activePeriod && (!row.effectiveTo || row.effectiveTo >= activePeriod);
                return <tr key={row.id}>
                  <td><strong>{row.name}</strong></td>
                  <td>{displayValue(row)}</td>
                  <td>{formatPeriod(row.effectiveFrom)}</td>
                  <td>{row.effectiveTo ? formatPeriod(row.effectiveTo) : 'Até nova alteração'}</td>
                  <td><span className={`repasse-state ${historical ? 'historical' : current ? 'current' : 'future'}`}>{historical ? 'Histórico protegido' : current ? 'Vigente' : 'Futuro'}</span></td>
                  <td><div className="repasse-actions">
                    <button className="icon-button" aria-label={`Editar ${row.name}`} title={historical ? 'Ajuste o histórico na competência' : 'Editar vigência'} disabled={historical} onClick={() => startEdit(row)}><Icon name="edit" size={15} /></button>
                    <button className="icon-button danger-icon" aria-label={`Remover ${row.name}`} title={historical ? 'O histórico é alterado pela competência' : 'Remover vigência futura'} disabled={historical} onClick={() => setPendingDelete(row)}><Icon name="trash" size={15} /></button>
                  </div></td>
                </tr>;
              })}
            </tbody></table></div>
          )}
          <p className="repasses-history-note">Para corrigir um mês passado, altere a divisão diretamente naquele mês em Previsões. Assim, a vigência global não reescreve o histórico.</p>
        </section>

        <section className="panel repasses-form-panel">
          <header className="panel-heading"><div><h2>{editing ? 'Editar vigência' : 'Novo repasse'}</h2><p>{editing ? 'A alteração começa na vigência abaixo; períodos anteriores ficam preservados.' : 'A nova regra passa a valer a partir do mês informado.'}</p></div></header>
          <form className="repasse-form" onSubmit={(event) => void save(event)}>
            <label className="form-field"><span>Nome</span><input required maxLength={100} value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="Ex.: Casa/Lazer" /></label>
            <div className="repasse-form-row">
              <label className="form-field"><span>Tipo de valor</span><select value={form.valueType} onChange={(event) => updateForm('valueType', event.target.value as RepasseForm['valueType'])}><option value="percentage">Percentual</option><option value="fixed">Valor fixo</option></select></label>
              <label className="form-field"><span>{form.valueType === 'percentage' ? 'Percentual' : 'Valor em reais'}</span><div className="repasse-value-input"><input required type="number" min="0" max={form.valueType === 'percentage' ? 100 : undefined} step="0.01" value={form.value} onChange={(event) => updateForm('value', event.target.value)} /><span>{form.valueType === 'percentage' ? '%' : 'R$'}</span></div></label>
            </div>
            <div className="repasse-form-row">
              <label className="form-field"><span>Início da vigência</span><input required type="month" min={currentPeriod()} value={form.effectiveFrom < currentPeriod() ? currentPeriod() : form.effectiveFrom} onChange={(event) => updateForm('effectiveFrom', event.target.value)} /></label>
              <label className="form-field"><span>Fim da vigência <small>(opcional)</small></span><input type="month" min={form.effectiveFrom} value={form.effectiveTo} onChange={(event) => updateForm('effectiveTo', event.target.value)} /></label>
            </div>
            <p className="repasse-form-note">Sem fim definido, o repasse continua valendo até uma nova configuração global. Mudanças globais nunca alteram meses anteriores.</p>
            <div className="repasse-form-actions">
              {editing && <button type="button" className="secondary-button" onClick={startCreate}>Cancelar edição</button>}
              <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Salvando…' : editing ? 'Salvar nova vigência' : 'Salvar repasse'}</button>
            </div>
          </form>
        </section>
      </div>

      {pendingDelete && <div className="modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingDelete(null); }}><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="repasse-delete-title"><h2 id="repasse-delete-title">Remover repasse?</h2><p><strong>{pendingDelete.name}</strong> · {displayValue(pendingDelete)}</p><p>A regra deixa de valer a partir desta vigência. Meses anteriores permanecem intactos.</p><div className="dialog-actions"><button className="secondary-button" onClick={() => setPendingDelete(null)}>Manter</button><button className="danger-button" disabled={saving} onClick={() => void remove()}>Remover vigência</button></div></section></div>}
    </main>
  );
}
