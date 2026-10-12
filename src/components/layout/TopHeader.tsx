import { Icon } from '../ui/Icon';
import { DatePicker } from '../ui/DatePicker';
import type { PageKey } from '../../types';

const pageTitles: Record<PageKey, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Visão consolidada da saúde financeira da empresa',
  },
  'cash-flow': {
    title: 'Fluxo de Caixa',
    subtitle: 'Acompanhe e organize as movimentações financeiras',
  },
  'cash-book': {
    title: 'Livro Caixa',
    subtitle: 'Consulte os saldos e as movimentações de cada conta',
  },
  forecasts: {
    title: 'Previsões',
    subtitle: 'Planeje receitas, despesas e compromissos futuros',
  },
  repasses: {
    title: 'Repasses',
    subtitle: 'Configure regras globais e vigências dos repasses',
  },
  investments: {
    title: 'Investimentos',
    subtitle: 'Acompanhe aplicações e evolução do patrimônio',
  },
  'investment-evolution': {
    title: 'Evolução dos Investimentos',
    subtitle: 'Acompanhe patrimônio, aportes, resgates e rendimentos',
  },
  closing: {
    title: 'Fechamento Financeiro',
    subtitle: 'Confira e conclua o fechamento do período',
  },
  reports: {
    title: 'Relatórios',
    subtitle: 'Analise os resultados financeiros da empresa',
  },
  settings: {
    title: 'Configurações',
    subtitle: 'Gerencie as preferências da sua conta',
  },
  profile: {
    title: 'Meu perfil',
    subtitle: 'Atualize suas informações pessoais e foto de perfil',
  },
};

type TopHeaderProps = {
  activePage: PageKey;
  month: string;
  theme: 'light' | 'dark';
  onMonthChange: (month: string) => void;
  onThemeChange: (theme: 'light' | 'dark') => void;
  onNewTransaction: () => void;
  onToggleSidebar: () => void;
};

export function TopHeader({
  activePage,
  month,
  theme,
  onMonthChange,
  onThemeChange,
  onNewTransaction,
  onToggleSidebar,
}: TopHeaderProps) {
  const heading = pageTitles[activePage];

  return (
    <header className="top-header">
      <button
        className="icon-button mobile-menu"
        aria-label="Abrir menu"
        onClick={onToggleSidebar}
      >
        <Icon name="menu" />
      </button>
      <div className="page-heading">
        <h1>{heading.title}</h1>
        <p>{heading.subtitle}</p>
      </div>
      <div className="header-actions">
        {!['profile', 'cash-book', 'investment-evolution', 'repasses'].includes(activePage) && (
          <DatePicker
            mode="month"
            ariaLabel="Selecionar mês do relatório"
            value={month}
            onChange={onMonthChange}
          />
        )}

        <div className="theme-switch" aria-label="Tema da aplicação">
          <button
            className={theme === 'light' ? 'theme-active' : ''}
            onClick={() => onThemeChange('light')}
            aria-pressed={theme === 'light'}
          >
            <Icon name="sun" size={14} /> Claro
          </button>
          <button
            className={theme === 'dark' ? 'theme-active' : ''}
            onClick={() => onThemeChange('dark')}
            aria-pressed={theme === 'dark'}
          >
            <Icon name="moon" size={14} /> Escuro
          </button>
        </div>

        {activePage === 'cash-flow' && (
          <button className="primary-button" onClick={onNewTransaction}>
            <Icon name="plus" size={17} />
            <span>Novo lançamento</span>
          </button>
        )}
      </div>
    </header>
  );
}
