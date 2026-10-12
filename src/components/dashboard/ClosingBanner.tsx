import { Icon } from '../ui/Icon'

export function ClosingBanner({ onClose }: { onClose: () => void }) {
  return (
    <section className="closing-banner">
      <span className="closing-sparkle"><Icon name="sparkle" size={18} /></span>
      <div className="closing-copy">
        <strong>Fechamento de Outubro em andamento</strong>
        <p>Você possui 2 lançamentos pendentes de conciliação para fechar o mês.</p>
      </div>
      <button onClick={onClose}>Ir para Fechamento <span aria-hidden="true">→</span></button>
    </section>
  )
}
