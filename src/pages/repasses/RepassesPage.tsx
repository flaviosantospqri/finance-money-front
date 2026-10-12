import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { Icon } from '../../components/ui/Icon';
import { MonthNavigator } from '../../components/ui/MonthNavigator';
import { SelectField } from '../../components/ui/SelectField';
import { DatePicker } from '../../components/ui/DatePicker';
import { forecastsApi, type Distribution, type FinancialRepasse, type FinancialRepasseInput } from '../../features/forecasts/forecastsApi';
import { formatCurrencyDecimal } from '../../lib/formatters';

type Props = { month: string; onMonthChange: (month: string) => void };
type RepasseForm = { name: string; valueType: 'percentage' | 'fixed'; value: string; effectiveFrom: string; effectiveTo: string };
const emptyForm = (month: string): RepasseForm => ({ name: '', valueType: 'percentage', value: '0', effectiveFrom: month, effectiveTo: '' });
const formatPeriod = (period: string) => new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(`${period}-15T12:00:00`));
const currentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
const percentUnits = (value: string) => {
  const [whole = '0', fraction = ''] = value.split('.');
  return BigInt(whole || '0') * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
};
const percentText = (value: bigint) => `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`;
function refreshFlexibleRow(rows: Distribution[], flexibleId: string | null) {
  if (!flexibleId) return rows;
  const flexible = rows.find((row) => row.id === flexibleId && row.valueType === 'percentage');
  if (!flexible) return rows;
  const pinnedTotal = rows.reduce((sum, row) => sum + (row.valueType === 'percentage' && row.id !== flexibleId ? percentUnits(row.value || '0') : 0n), 0n);
  const value = percentText(pinnedTotal >= 10000n ? 0n : 10000n - pinnedTotal);
  return rows.map((row) => row.id === flexibleId ? { ...row, value, percentage: value } : row);
}

export function RepassesPage({ month, onMonthChange }: Props) {
  const [rows, setRows] = useState<FinancialRepasse[]>([]);
  const [distribution, setDistribution] = useState<Distribution[]>([]);
  const [flexibleDestinationId, setFlexibleDestinationId] = useState<string | null>(null);
  const [form, setForm] = useState<RepasseForm>(() => emptyForm(month));
  const [editing, setEditing] = useState<FinancialRepasse | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FinancialRepasse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [distributionSaving, setDistributionSaving] = useState(false);
  const [distributionLoading, setDistributionLoading] = useState(true);
  const [error, setError] = useState('');

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

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const loadDistribution = useCallback(async () => {
    setDistributionLoading(true);
    setDistribution([]);
    setFlexibleDestinationId(null);
    try {
      setDistribution(await forecastsApi.distributions(month));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar a distribuição mensal.');
    } finally {
      setDistributionLoading(false);
    }
  }, [month]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDistribution(), 0);
    return () => window.clearTimeout(timer);
  }, [loadDistribution]);

  function startCreate() {
    setEditing(null);
    setForm(emptyForm(month < currentPeriod() ? currentPeriod() : month));
    setError('');
    setModalOpen(true);
  }

  function startEdit(row: FinancialRepasse) {
    const effectiveFrom = row.effectiveFrom < currentPeriod() ? currentPeriod() : row.effectiveFrom;
    setEditing(row);
    setForm({ name: row.name, valueType: row.valueType, value: row.value, effectiveFrom, effectiveTo: row.effectiveTo ?? '' });
    setError('');
    setModalOpen(true);
  }

  function updateForm<K extends keyof RepasseForm>(key: K, value: RepasseForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateDistributionPercentage(id: string, rawValue: string) {
    const numeric = Number(rawValue);
    if (!Number.isFinite(numeric) || numeric < 0) return;
    const value = percentText(percentUnits(Math.min(100, numeric).toFixed(2)));
    setDistribution((current) => refreshFlexibleRow(
      current.map((row) => row.id === id ? { ...row, value, percentage: value } : row),
      flexibleDestinationId,
    ));
  }

  function changeDistributionType(id: string, valueType: Distribution['valueType']) {
    const nextFlexibleId = flexibleDestinationId === id && valueType === 'fixed' ? null : flexibleDestinationId;
    setFlexibleDestinationId(nextFlexibleId);
    setDistribution((current) => refreshFlexibleRow(
      current.map((row) => row.id === id ? { ...row, valueType, value: valueType === 'percentage' ? '0' : row.value, percentage: '0' } : row),
      nextFlexibleId,
    ));
  }

  function toggleFlexibleDestination(id: string) {
    const nextFlexibleId = flexibleDestinationId === id ? null : id;
    setFlexibleDestinationId(nextFlexibleId);
    if (nextFlexibleId) setDistribution((current) => refreshFlexibleRow(current, nextFlexibleId));
  }

  const percentageTotal = distribution.reduce((sum, row) => sum + (row.valueType === 'percentage' ? percentUnits(row.value || '0') : 0n), 0n);
  const hasFixedAmounts = distribution.some((row) => row.valueType === 'fixed');
  const distributionIsValid = hasFixedAmounts ? percentageTotal <= 10000n : percentageTotal === 10000n;

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
      setModalOpen(false);
      toast.success(editing ? 'Regra de repasse atualizada.' : 'Regra de repasse criada. Destinação disponível em Previsões.');
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
      setModalOpen(false);
      toast.success('Vigência removida. Os meses anteriores foram preservados.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível remover o repasse.');
      setPendingDelete(null);
    } finally {
      setSaving(false);
    }
  }

  async function saveDistribution() {
    setDistributionSaving(true);
    try {
      const saved = await forecastsApi.saveDistributions(month, distribution.map(({ id, percentage, valueType, value }) => ({
        destinationId: id,
        percentage,
        valueType,
        value,
      })));
      setDistribution(saved);
      toast.success(`Distribuição de ${formatPeriod(month)} salva.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar a distribuição.');
    } finally {
      setDistributionSaving(false);
    }
  }

  async function copyDistribution() {
    const [year, monthIndex] = month.split('-').map(Number);
    const next = new Date(year, monthIndex, 1);
    const target = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    setDistributionSaving(true);
    try {
      const copied = await forecastsApi.copyDistributions(month, target);
      toast.success(`Distribuição copiada para ${formatPeriod(target)}.`);
      if (target === month) setDistribution(copied);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível copiar a distribuição.');
    } finally {
      setDistributionSaving(false);
    }
  }

  const isHistorical = (row: FinancialRepasse) => Boolean(row.effectiveTo && row.effectiveTo < currentPeriod());
  const displayValue = (row: FinancialRepasse) => row.valueType === 'percentage' ? `${row.value}%` : formatCurrencyDecimal(row.value);

  return (
    <main className="page-content repasses-page">
      <section className="panel repasses-intro">
        <div><h2>Distribuição</h2><p>Gerencie as regras de destinação e os percentuais por competência em um só lugar.</p></div>
        <button className="primary-button" onClick={startCreate}><Icon name="plus" size={16} /> Nova distribuição</button>
      </section>

      {error && !modalOpen && <div className="cash-book-error" role="alert">{error}</div>}
      <section className="panel repasses-distribution">
        <header className="cash-book-table-heading repasses-distribution-heading">
          <div><h2>Distribuição da competência</h2><p>Os ajustes abaixo valem somente para o mês selecionado e aparecem nos recebimentos previstos.</p></div>
          <MonthNavigator value={month} onChange={onMonthChange} ariaLabel="Competência da distribuição" />
        </header>
        {distributionLoading ? <div className="repasses-empty"><span className="loading-spinner" /> Carregando distribuição…</div> : distribution.length === 0 ? <div className="repasses-empty">Não há destinações para esta competência. Cadastre uma regra de repasse para começar.</div> : (
          <>
            <div className="distribution-grid repasses-distribution-grid">
              {distribution.map((row) => (
                <div key={row.id} className={`distribution-card${flexibleDestinationId === row.id ? ' is-flexible' : ''}`}>
                  <span>{row.name}</span>
                  <div>
                    <SelectField ariaLabel={`Tipo de repasse para ${row.name}`} value={row.valueType} disabled={distributionSaving} onValueChange={(value) => changeDistributionType(row.id, value as Distribution['valueType'])} options={[{ value: 'percentage', label: '%' }, { value: 'fixed', label: 'R$' }]} />
                    <input aria-label={`Valor do repasse para ${row.name}`} type="number" min="0" max={row.valueType === 'percentage' ? '100' : undefined} step="0.01" value={row.value} disabled={distributionSaving || (row.valueType === 'percentage' && flexibleDestinationId === row.id)} onChange={(event) => row.valueType === 'percentage' ? updateDistributionPercentage(row.id, event.target.value) : setDistribution((current) => current.map((item) => item.id === row.id ? { ...item, value: event.target.value, percentage: '0' } : item))} />
                    <span>{row.valueType === 'percentage' ? '%' : 'R$'}</span>
                  </div>
                  {row.valueType === 'percentage' && <button type="button" className={`distribution-pin-button${flexibleDestinationId === row.id ? ' is-unpinned' : ''}`} aria-label={flexibleDestinationId === row.id ? `Fixar valor de ${row.name}` : `Desafixar ${row.name}; será o único percentual ajustado`} aria-pressed={flexibleDestinationId !== row.id} onClick={() => toggleFlexibleDestination(row.id)} disabled={distributionSaving} title={flexibleDestinationId === row.id ? 'Fixar este percentual' : 'Desafixar: este será o único percentual ajustado'}><Icon name={flexibleDestinationId === row.id ? 'unlock' : 'lock'} size={13} />{flexibleDestinationId === row.id ? 'Fixar valor' : 'Desafixar valor'}</button>}
                  <small>Orçamento {formatCurrencyDecimal(row.budget)} · Consumido {formatCurrencyDecimal(row.consumed)}</small>
                </div>
              ))}
            </div>
            <footer className="repasses-distribution-footer">
              <div className="distribution-total-status"><strong className={distributionIsValid ? '' : 'is-invalid'}>Total percentual: {percentText(percentageTotal)}%</strong><small>{flexibleDestinationId ? `${distribution.find((row) => row.id === flexibleDestinationId)?.name} ajusta para fechar o total.` : 'Todos os valores estão fixos.'}</small></div>
              <div><button className="secondary-button" onClick={() => void copyDistribution()} disabled={distributionSaving || distributionLoading || !distributionIsValid}>Copiar para o próximo mês</button><button className="primary-button" onClick={() => void saveDistribution()} disabled={distributionSaving || distributionLoading || !distributionIsValid}>{distributionSaving ? 'Salvando…' : 'Salvar distribuição'}</button></div>
            </footer>
          </>
        )}
      </section>

      <section className="panel repasses-list">
        <header className="cash-book-table-heading repasses-rules-heading"><div><h2>Regras globais</h2><p>Uma nova vigência atualiza este mês em diante; competências anteriores ficam preservadas.</p></div></header>
        {loading ? <div className="repasses-empty">Carregando regras…</div> : rows.length === 0 ? <div className="repasses-empty">Nenhuma regra cadastrada. Crie um repasse para adicionar uma destinação personalizada.</div> : (
          <div className="table-scroll"><table className="transactions-table repasses-table"><thead><tr><th>Destinação</th><th>Valor</th><th>Início da vigência</th><th>Fim da vigência</th><th>Situação</th><th>Ações</th></tr></thead><tbody>
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
        <p className="repasses-history-note">A vigência global vale do mês inicial em diante. Para alterar um único mês, escolha a competência acima e salve a distribuição mensal.</p>
      </section>

      {modalOpen && (
        <div className="modal-layer repasse-modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setModalOpen(false); }}>
          <section className="repasse-editor-modal" role="dialog" aria-modal="true" aria-labelledby="repasse-editor-title">
            <header className="repasse-modal-heading">
              <div><h2 id="repasse-editor-title">{editing ? 'Editar distribuição' : 'Nova distribuição'}</h2><p>{editing ? 'A alteração começa na vigência escolhida.' : 'O percentual será reajustado com as demais destinações para fechar em 100%.'}</p></div>
              <button className="icon-button" aria-label="Fechar" onClick={() => setModalOpen(false)} disabled={saving}><Icon name="close" size={17} /></button>
            </header>
            {error && <div className="cash-book-error" role="alert">{error}</div>}
            <form className="repasse-form" onSubmit={(event) => void save(event)}>
              <label className="form-field"><span>Nome da destinação</span><input required maxLength={100} value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="Ex.: Casa/Lazer, Investimentos, Flávio" /></label>
              <div className="repasse-form-row">
                <label className="form-field"><span>Tipo de valor</span><SelectField ariaLabel="Tipo de valor" value={form.valueType} onValueChange={(value) => updateForm('valueType', value as RepasseForm['valueType'])} options={[{ value: 'percentage', label: 'Percentual' }, { value: 'fixed', label: 'Valor fixo' }]} /></label>
                <label className="form-field"><span>{form.valueType === 'percentage' ? 'Percentual' : 'Valor em reais'}</span><div className="repasse-value-input"><input required type="number" min="0" max={form.valueType === 'percentage' ? 100 : undefined} step="0.01" value={form.value} onChange={(event) => updateForm('value', event.target.value)} /><span>{form.valueType === 'percentage' ? '%' : 'R$'}</span></div></label>
              </div>
              <div className="repasse-form-row">
                <label className="form-field"><span>Início da vigência</span><DatePicker mode="month" ariaLabel="Início da vigência" value={form.effectiveFrom < currentPeriod() ? currentPeriod() : form.effectiveFrom} onChange={(value) => updateForm('effectiveFrom', value)} /></label>
                <div className="form-field"><span>Fim da vigência <small>(opcional)</small></span>{form.effectiveTo ? <div className="repasse-end-date"><DatePicker mode="month" ariaLabel="Fim da vigência" value={form.effectiveTo} onChange={(value) => updateForm('effectiveTo', value)} /><button type="button" className="text-link" onClick={() => updateForm('effectiveTo', '')}>Remover fim</button></div> : <button type="button" className="secondary-button repasse-set-end" onClick={() => updateForm('effectiveTo', form.effectiveFrom)}>Definir mês final</button>}</div>
              </div>
              <p className="repasse-form-note">Sem fim definido, a regra segue vigente até uma nova alteração. Meses anteriores permanecem preservados.</p>
              <div className="repasse-form-actions">
                <button type="button" className="secondary-button" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</button>
                <button className="primary-button" type="submit" disabled={saving}>{saving ? 'Salvando…' : editing ? 'Salvar alteração' : 'Salvar distribuição'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {pendingDelete && <div className="modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingDelete(null); }}><section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="repasse-delete-title"><h2 id="repasse-delete-title">Remover repasse?</h2><p><strong>{pendingDelete.name}</strong> · {displayValue(pendingDelete)}</p><p>A regra deixa de valer a partir desta vigência. Meses anteriores permanecem intactos.</p><div className="dialog-actions"><button className="secondary-button" onClick={() => setPendingDelete(null)}>Manter</button><button className="danger-button" disabled={saving} onClick={() => void remove()}>Remover vigência</button></div></section></div>}
    </main>
  );
}
