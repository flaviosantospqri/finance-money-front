import { useState } from 'react';
import { Icon } from '../ui/Icon';
import { SelectField } from '../ui/SelectField';
import {
  forecastsApi,
  type ForecastDetails,
} from '../../features/forecasts/forecastsApi';
import { formatCurrencyDecimal } from '../../lib/formatters';
import { statusLabel } from './forecastUtils';

export function ForecastDetail({
  item,
  matches,
  target,
  closeReason,
  busy,
  onTarget,
  onReason,
  onClose,
  onReconcile,
  onUnlink,
  onCloseForecast,
}: {
  item: ForecastDetails;
  matches: Awaited<ReturnType<typeof forecastsApi.matches>>;
  target: string;
  closeReason: string;
  busy: boolean;
  onTarget: (value: string) => void;
  onReason: (value: string) => void;
  onClose: () => void;
  onReconcile: () => void;
  onUnlink: (id: string) => void;
  onCloseForecast: () => void;
}) {
  const [candidateSearch, setCandidateSearch] = useState('');
  const normalizeSearch = (value: string) => value.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const query = normalizeSearch(candidateSearch.trim());
  const bestMatch = matches[0];
  const filteredMatches = matches.filter((row) => !query || normalizeSearch(`${row.description} ${row.categoryName ?? ''} ${row.forecastCategoryName} ${row.accountName} ${row.occurredAt} ${row.amount}`).includes(query));
  const visibleMatches = bestMatch && query && !filteredMatches.some((row) => row.id === bestMatch.id)
    ? [bestMatch, ...filteredMatches]
    : filteredMatches;
  const candidateLabel = (row: (typeof matches)[number]) => `${row.occurredAt} · ${row.description} · ${row.categoryName ?? 'Sem categoria'} · ${formatCurrencyDecimal(row.amount)} · ${row.accountName}`;
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
        aria-labelledby="forecast-detail-title"
      >
        <header className="drawer-header">
          <span className="drawer-plus">
            <Icon name="eye" size={16} />
          </span>
          <div>
            <h2 id="forecast-detail-title">Detalhes da previsão</h2>
            <p>{item.description}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Fechar">
            <Icon name="close" />
          </button>
        </header>
        <div className="forecast-detail-body">
          <dl>
            <dt>Previsto</dt>
            <dd>{formatCurrencyDecimal(item.amount)}</dd>
            <dt>Realizado</dt>
            <dd>{formatCurrencyDecimal(item.realized)}</dd>
            <dt>Pendente</dt>
            <dd>{formatCurrencyDecimal(item.pending)}</dd>
            <dt>Situação</dt>
            <dd>{statusLabel[item.status]}</dd>
            <dt>Vencimento</dt>
            <dd>
              {new Intl.DateTimeFormat('pt-BR').format(
                new Date(`${item.dueDate}T12:00:00`),
              )}
            </dd>
          </dl>
          <h3>Movimentações vinculadas</h3>
          {item.reconciliations.length === 0 ? (
            <p>Nenhuma movimentação conciliada.</p>
          ) : (
            item.reconciliations.map((link) => (
              <div className="forecast-link" key={link.id}>
                <span>
                  {link.description}
                  <small>
                    {link.occurredAt} ·{' '}
                    {formatCurrencyDecimal(
                      link.linkedAmount || link.entryAmount,
                    )}
                  </small>
                </span>
                <button
                  className="secondary-button"
                  onClick={() => onUnlink(link.id)}
                >
                  Desvincular
                </button>
              </div>
            ))
          )}
          <h3>Sugestões do Livro Caixa</h3>
          <p>
            Sugestões priorizadas por nome e categoria, depois por valor e data. A primeira opção é a melhor correspondência; a conciliação exige sua confirmação.
          </p>
          <label className="form-field">
            <span>Filtrar movimentações</span>
            <input aria-label="Filtrar movimentações do Livro Caixa" placeholder="Digite nome, categoria, conta ou data" value={candidateSearch} onChange={(event) => setCandidateSearch(event.target.value)} />
          </label>
          <SelectField ariaLabel="Movimentação para conciliar" value={target} placeholder="Selecione uma movimentação" options={visibleMatches.map((row, index) => ({ value: row.id, label: `${index === 0 && row.id === bestMatch?.id ? '★ Melhor correspondência · ' : ''}${candidateLabel(row)}` }))} onValueChange={onTarget} />
          <button
            className="secondary-button"
            disabled={!target || busy}
            onClick={onReconcile}
          >
            Vincular movimentação
          </button>
          <h3>Encerrar com diferença</h3>
          <textarea
            aria-label="Justificativa para encerrar"
            placeholder="Justificativa obrigatória"
            value={closeReason}
            onChange={(e) => onReason(e.target.value)}
          />
          <button
            className="secondary-button"
            disabled={!closeReason.trim() || busy}
            onClick={onCloseForecast}
          >
            Encerrar previsão
          </button>
        </div>
      </aside>
    </div>
  );
}
