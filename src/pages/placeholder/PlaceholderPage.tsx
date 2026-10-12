import type { PageKey } from '../../types'
import { Icon } from '../../components/ui/Icon'

const copy: Partial<Record<PageKey, { title: string; description: string; icon: 'investments' | 'closing' | 'reports' | 'settings' }>> = {
  investments: { title: 'Investimentos', description: 'Em breve você poderá acompanhar as aplicações e os rendimentos da empresa por aqui.', icon: 'investments' },
  closing: { title: 'Fechamento Financeiro', description: 'Estamos preparando a conciliação e o fechamento mensal da sua empresa.', icon: 'closing' },
  reports: { title: 'Relatórios', description: 'Os relatórios financeiros estarão disponíveis neste espaço.', icon: 'reports' },
  settings: { title: 'Configurações', description: 'As preferências e configurações da sua conta serão organizadas aqui.', icon: 'settings' },
}

export function PlaceholderPage({ page }: { page: PageKey }) {
  const content = copy[page]
  if (!content) return null

  return <section className="module-placeholder"><span className="placeholder-icon"><Icon name={content.icon} size={24} /></span><p className="eyebrow">MÓDULO</p><h2>{content.title}</h2><p>{content.description}</p></section>
}
