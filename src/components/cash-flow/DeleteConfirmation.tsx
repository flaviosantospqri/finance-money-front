import { Icon } from '../ui/Icon'
import type { Transaction } from '../../types'

type DeleteConfirmationProps = {
  transaction: Transaction
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteConfirmation({ transaction, onCancel, onConfirm }: DeleteConfirmationProps) {
  return (
    <div className="modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }}>
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
        <span className="delete-icon"><Icon name="trash" size={20} /></span>
        <h2 id="delete-title">Excluir lançamento?</h2>
        <p>“{transaction.description}” será removido da lista. Esta ação não pode ser desfeita.</p>
        <div className="dialog-actions"><button className="secondary-button" onClick={onCancel}>Cancelar</button><button className="danger-button" onClick={onConfirm}>Excluir lançamento</button></div>
      </section>
    </div>
  )
}
