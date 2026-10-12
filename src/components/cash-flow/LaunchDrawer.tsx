import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Transaction, TransactionStatus, TransactionType } from '../../types'
import { defaultTransactionCategory, transactionCategoryGroups } from '../../data/transactionCategories'
import { Icon } from '../ui/Icon'
import { DatePicker } from '../ui/DatePicker'
import { SelectField } from '../ui/SelectField'

export type TransactionInput = Omit<Transaction, 'id'>
type DrawerMode = 'create' | 'edit' | 'view'

type LaunchDrawerProps = {
  mode: DrawerMode
  transaction?: Transaction | null
  onClose: () => void
  onSave: (transaction: TransactionInput) => void
}

const accounts = ['Itaú PJ Principal', 'Bradesco PJ', 'Cartão de Crédito Nubank']

function today() {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
}

export function LaunchDrawer({ mode, transaction, onClose, onSave }: LaunchDrawerProps) {
  const isReadOnly = mode === 'view'
  const [type, setType] = useState<TransactionType>(transaction?.type ?? 'Entrada')
  const [status, setStatus] = useState<TransactionStatus>(transaction?.status ?? 'Confirmado')
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [value, setValue] = useState(transaction ? String(transaction.value) : '')
  const [date, setDate] = useState(transaction?.date ?? today())
  const [dueDate, setDueDate] = useState(transaction?.dueDate ?? today())
  const [category, setCategory] = useState<string>(transaction?.category ?? defaultTransactionCategory)
  const [account, setAccount] = useState(transaction?.account ?? accounts[0])
  const [observations, setObservations] = useState(transaction?.observations ?? '')

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const numericValue = Number(value.replace(',', '.'))
    if (!description.trim() || !Number.isFinite(numericValue) || numericValue <= 0) return
    onSave({ date, dueDate, description: description.trim(), category, type, value: numericValue, account, status, observations: observations.trim() })
  }

  const title = mode === 'create' ? 'Novo Lançamento' : mode === 'edit' ? 'Editar Lançamento' : 'Detalhes do Lançamento'

  return (
    <div className="drawer-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <aside className="launch-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header className="drawer-header">
          <span className="drawer-plus"><Icon name={isReadOnly ? 'eye' : 'plus'} size={17} /></span>
          <div><h2 id="drawer-title">{title}</h2><p>{isReadOnly ? 'Confira as informações do lançamento' : 'Preencha as informações operacionais'}</p></div>
          <button className="icon-button" aria-label="Fechar" onClick={onClose}><Icon name="close" size={18} /></button>
        </header>

        <form className="drawer-form" onSubmit={handleSubmit}>
          <fieldset disabled={isReadOnly}>
            <legend>Tipo de Lançamento</legend>
            <div className="type-toggle">
              <button type="button" className={type === 'Entrada' ? 'toggle-income selected' : ''} onClick={() => setType('Entrada')}><Icon name="arrow-down" size={13} /> Entrada</button>
              <button type="button" className={type === 'Saída' ? 'toggle-expense selected' : ''} onClick={() => setType('Saída')}><Icon name="arrow-up" size={13} /> Saída</button>
            </div>

            <label className="form-field"><span>Descrição</span><input autoFocus={!isReadOnly} required maxLength={100} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex.: Pagamento de cliente" /></label>
            <label className="form-field"><span>Valor (R$)</span><div className="currency-input"><b>R$</b><input required type="number" min="0.01" step="0.01" value={value} onChange={(event) => setValue(event.target.value)} placeholder="0,00" /></div></label>

            <div className="form-field-row">
              <label className="form-field"><span>Competência</span><DatePicker ariaLabel="Competência" value={date} onChange={setDate} disabled={isReadOnly} /></label>
              <label className="form-field"><span>Vencimento</span><DatePicker ariaLabel="Vencimento" value={dueDate} onChange={setDueDate} disabled={isReadOnly} /></label>
            </div>

            <label className="form-field"><span>Categoria</span><SelectField ariaLabel="Categoria" value={category} onValueChange={setCategory} options={transactionCategoryGroups.flatMap((group) => group.categories.map((item) => ({ value: item, label: item })))} /></label>
            <label className="form-field"><span>Conta Financeira</span><SelectField ariaLabel="Conta Financeira" value={account} onValueChange={setAccount} options={accounts.map((item) => ({ value: item, label: item }))} /></label>
            <label className="form-field"><span>Status</span><SelectField ariaLabel="Status" value={status} onValueChange={(value) => setStatus(value as TransactionStatus)} options={[{ value: 'Confirmado', label: 'Confirmado / Recebido' }, { value: 'Pendente', label: 'Pendente' }]} /></label>
            <label className="form-field"><span>Observações</span><textarea rows={3} maxLength={300} value={observations} onChange={(event) => setObservations(event.target.value)} placeholder="Adicione detalhes importantes sobre este lançamento..." /></label>
          </fieldset>

          <footer className="drawer-footer">
            {mode === 'edit' ? <span className="drawer-record-id">ID {transaction?.id}</span> : <span />}
            <div><button type="button" className="secondary-button" onClick={onClose}>{isReadOnly ? 'Fechar' : 'Cancelar'}</button>{!isReadOnly && <button type="submit" className="primary-button"><Icon name="check" size={15} />Salvar</button>}</div>
          </footer>
        </form>
      </aside>
    </div>
  )
}
