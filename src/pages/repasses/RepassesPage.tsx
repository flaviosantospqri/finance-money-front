import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { Icon } from '../../components/ui/Icon';
import { MonthNavigator } from '../../components/ui/MonthNavigator';
import { SelectField } from '../../components/ui/SelectField';
import { DatePicker } from '../../components/ui/DatePicker';
import { forecastsApi, type Distribution, type FinancialRepasse, type FinancialRepasseInput } from '../../features/forecasts/forecastsApi';
import { formatCurrencyDecimal, formatMonthYear } from '../../lib/formatters';

type Props = { month: string; onMonthChange: (month: string) => void };
type RepasseForm = { name: string; valueType: 'percentage' | 'fixed'; value: string; effectiveFrom: string; effectiveTo: string };
const emptyForm = (month: string): RepasseForm => ({ name: '', valueType: 'percentage', value: '0', effectiveFrom: month, effectiveTo: '' });
const formatPeriod = (period: string) => formatMonthYear(period);
const currentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
const percentUnits = (value: string) => {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d*(?:\.\d*)?$/.test(normalized) || !/\d/.test(normalized)) return null;
  const [whole = '0', fraction = ''] = normalized.split('.');
  return BigInt(whole || '0') * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2));
};
const percentText = (value: bigint) => `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`;
const normalizedPercentage = (value: string) => {
  const units = percentUnits(value);
  return percentText(units === null ? 0n : units > 10000n ? 10000n : units);
};
function refreshFlexibleRow(rows: Distribution[], flexibleId: string | null) {
  if (!flexibleId) return rows;
  const flexible = rows.find((row) => row.id === flexibleId && row.valueType === 'percentage');
  if (!flexible) return rows;
  const pinnedTotal = rows.reduce((sum, row) => {
    if (row.valueType !== 'percentage' || row.id === flexibleId) return sum;
    return sum + (percentUnits(row.value) ?? 0n);
  }, 0n);
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
    setDistribution((current) => refreshFlexibleRow(
      current.map((row) => row.id === id ? { ...row, value: rawValue, percentage: rawValue } : row),
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

  const percentageTotal = distribution.reduce((sum, row) => {
    if (row.valueType !== 'percentage') return sum;
    return sum + (percentUnits(row.value) ?? 0n);
  }, 0n);
  const hasFixedAmounts = distribution.some((row) => row.valueType === 'fixed');
  const distributionIsValid = hasFixedAmounts ? percentageTotal <= 10000n : percentageTotal === 10000n;
  const distributionUsesGlobalRules = month >= currentPeriod();

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
      await Promise.all([load(), loadDistribution()]);
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
      await Promise.all([load(), loadDistribution()]);
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
      await load();
      toast.success(distributionUsesGlobalRules
        ? `Distribuição salva. As regras globais foram atualizadas a partir de ${formatPeriod(month)}.`
        : `Distribuição de ${formatPeriod(month)} salva como ajuste histórico.`);
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
      await load();
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
      <section className="panel repasses-list repasses-unified-list">
        <header className="cash-book-table-heading repasses-rules-heading">
          <div><h2>Distribuição mensal</h2><p>{distributionUsesGlobalRules ? 'Salvar atualiza as regras a partir deste mês; competências anteriores ficam preservadas.' : 'Este mês permite um ajuste histórico sem alterar as regras atuais.'}</p></div>
          <label className="repasses-month-control"><span>Competência</span><MonthNavigator value={month} onChange={onMonthChange} ariaLabel="Competência da distribuição" /></label>
        </header>
        {distributionLoading || loading ? <div className="repasses-empty"><span className="loading-spinner" /> Carregando distribuição…</div> : distribution.length === 0 ? <div className="repasses-empty">Não há destinações para esta competência. Cadastre uma regra para começar.</div> : (
          <div className="table-scroll">
            <table className="transactions-table repasses-table repasses-unified-table">
              <thead><tr>
                <th>Competência</th><th>Destinação</th><th>Percentual / valor</th><th>Orçamento</th><th>Consumido</th><th>Vigência global</th><th>Situação</th><th>Ações</th>
              </tr></thead>
              <tbody>{distribution.map((row) => {
                const rule = rows.find((item) => item.destinationId === row.id && item.effectiveFrom <= month && (!item.effectiveTo || item.effectiveTo >= month));
                const historicalRule = rule ? isHistorical(rule) : false;
                return <tr key={row.id}>
                  <td>{formatPeriod(month)}</td>
                  <td><strong>{row.name}</strong></td>
                  <td>
                    <div className={`repasses-inline-value${flexibleDestinationId === row.id ? ' is-flexible' : ''}`}>
                      <SelectField ariaLabel={`Tipo de repasse para ${row.name}`} value={row.valueType} disabled={distributionSaving} onValueChange={(value) => changeDistributionType(row.id, value as Distribution['valueType'])} options={[{ value: 'percentage', label: '%' }, { value: 'fixed', label: 'R$' }]} />
                      <input aria-label={`Valor do repasse para ${row.name}`} type={row.valueType === 'percentage' ? 'text' : 'number'} inputMode={row.valueType === 'percentage' ? 'decimal' : undefined} min="0" max={row.valueType === 'percentage' ? '100' : undefined} step="0.01" value={row.valueType === 'percentage' ? row.value.replace('.', ',') : row.value} disabled={distributionSaving || (row.valueType === 'percentage' && flexibleDestinationId === row.id)} onChange={(event) => row.valueType === 'percentage' ? updateDistributionPercentage(row.id, event.target.value) : setDistribution((current) => current.map((item) => item.id === row.id ? { ...item, value: event.target.value, percentage: '0' } : item))} onBlur={(event) => {
                        if (row.valueType !== 'percentage' || flexibleDestinationId === row.id) return;
                        const value = normalizedPercentage(event.target.value);
                        setDistribution((current) => refreshFlexibleRow(current.map((item) => item.id === row.id ? { ...item, value, percentage: value } : item), flexibleDestinationId));
                      }} />
                      <span>{row.valueType === 'percentage' ? '%' : 'R$'}</span>
                      {row.valueType === 'percentage' && <button type="button" className={`distribution-pin-button${flexibleDestinationId === row.id ? ' is-unpinned' : ''}`} aria-label={flexibleDestinationId === row.id ? `Fixar valor de ${row.name}` : `Desafixar ${row.name}; será o único percentual ajustado`} aria-pressed={flexibleDestinationId !== row.id} onClick={() => toggleFlexibleDestination(row.id)} disabled={distributionSaving} title={flexibleDestinationId === row.id ? 'Fixar este percentual' : 'Desafixar: este será o único percentual ajustado'}><Icon name={flexibleDestinationId === row.id ? 'unlock' : 'lock'} size={13} /></button>}
                    </div>
                  </td>
                  <td className="repasses-money-cell">{formatCurrencyDecimal(row.budget)}</td>
                  <td className="repasses-money-cell">{formatCurrencyDecimal(row.consumed)}</td>
                  <td>{rule ? `${formatPeriod(rule.effectiveFrom)} – ${rule.effectiveTo ? formatPeriod(rule.effectiveTo) : 'Em diante'}` : 'Sem regra global'}</td>
                  <td><span className={`repasse-state ${historicalRule ? 'historical' : rule ? 'current' : 'future'}`}>{historicalRule ? 'Histórico' : rule ? 'Vigente' : 'Sem regra'}</span></td>
                  <td><div className="repasse-actions">
                    <button className="icon-button" aria-label={`Editar regra de ${row.name}`} title={historicalRule ? 'Regra histórica protegida' : 'Editar vigência'} disabled={!rule || historicalRule} onClick={() => rule && startEdit(rule)}><Icon name="edit" size={15} /></button>
                    <button className="icon-button danger-icon" aria-label={`Remover regra de ${row.name}`} title={historicalRule ? 'Regra histórica protegida' : 'Remover vigência'} disabled={!rule || historicalRule} onClick={() => rule && setPendingDelete(rule)}><Icon name="trash" size={15} /></button>
                  </div></td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        )}
        {!distributionLoading && distribution.length > 0 && <footer className="repasses-unified-footer">
          <div className="distribution-total-status"><strong className={distributionIsValid ? '' : 'is-invalid'}>Total percentual: {percentText(percentageTotal)}%</strong><small>{flexibleDestinationId ? `${distribution.find((row) => row.id === flexibleDestinationId)?.name} ajusta para fechar o total.` : 'Todos os valores estão fixos.'}</small></div>
          <div><button className="secondary-button" onClick={() => void copyDistribution()} disabled={distributionSaving || distributionLoading || !distributionIsValid}>Copiar para o próximo mês</button><button className="primary-button" onClick={() => void saveDistribution()} disabled={distributionSaving || distributionLoading || !distributionIsValid}>{distributionSaving ? 'Salvando…' : 'Salvar distribuição'}</button></div>
        </footer>}
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
              <p className="repasse-form-note">Sem fim definido, a regra segue vigente até uma nova alteração. Ao salvar, ajustes mensais a partir desta vigência serão substituídos; os meses anteriores permanecem preservados.</p>
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
