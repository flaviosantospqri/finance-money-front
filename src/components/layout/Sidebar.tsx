import { useState } from 'react';
import type { PageKey, UserProfile } from '../../types';
import { Icon, type IconName } from '../ui/Icon';
import { UserAvatar } from '../ui/UserAvatar';

type SidebarProps = {
  activePage: PageKey;
  isOpen: boolean;
  onNavigate: (page: PageKey) => void;
  profile: UserProfile;
};

const navigation: { key: PageKey; label: string; icon: IconName }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'cash-book', label: 'Livro Caixa', icon: 'book' },
  { key: 'forecasts', label: 'Previsões', icon: 'calendar' },
  { key: 'repasses', label: 'Distribuição', icon: 'cash' },
  { key: 'investments', label: 'Investimentos', icon: 'investments' },
  { key: 'closing', label: 'Fechamento Financeiro', icon: 'closing' },
  { key: 'reports', label: 'Relatórios', icon: 'reports' },
];

export function Sidebar({
  activePage,
  isOpen,
  onNavigate,
  profile,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {isOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Fechar menu"
          onClick={() => onNavigate(activePage)}
        />
      )}
      <aside
        className={`sidebar ${isOpen ? 'sidebar-open' : ''} ${isCollapsed ? 'sidebar-collapsed' : ''}`}
      >
        <a
          className="sidebar-brand"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            onNavigate('dashboard');
          }}
        >
          <span className="brand-mark">F</span>
          <span className="sidebar-brand-copy">
            <strong>
              Fllatech<span> •</span>
            </strong>
            <small>Finance SaaS</small>
          </span>
        </a>
        <button
          className="icon-button sidebar-collapse"
          type="button"
          aria-label={
            isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'
          }
          aria-expanded={!isCollapsed}
          onClick={() => setIsCollapsed((collapsed) => !collapsed)}
        >
          <Icon
            name={isCollapsed ? 'panel-expand' : 'panel-collapse'}
            size={18}
          />
        </button>

        <p className="nav-heading">MENU PRINCIPAL</p>
        <nav className="main-navigation" aria-label="Menu principal">
          {navigation.map((item) => {
            const isInvestmentsParent = item.key === 'investments';
            const isActive = activePage === item.key || (isInvestmentsParent && activePage === 'investment-evolution');
            return (
              <div className="nav-group" key={item.key}>
                <button
                  className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                  onClick={() => onNavigate(item.key)}
                  aria-current={activePage === item.key ? 'page' : undefined}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon name={item.icon} size={16} />
                  <span>{item.label}</span>
                  {isActive && <i className="nav-indicator" />}
                </button>
                {isInvestmentsParent && (
                  <div className="nav-submenu" aria-label="Submenu de investimentos">
                    <button
                      className={`nav-subitem ${activePage === 'investment-evolution' ? 'nav-subitem-active' : ''}`}
                      onClick={() => onNavigate('investment-evolution')}
                      aria-current={activePage === 'investment-evolution' ? 'page' : undefined}
                      title={isCollapsed ? 'Evolução' : undefined}
                    >
                      <span aria-hidden="true" />
                      <span>Evolução</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-user">
          <button
            className="sidebar-profile-button"
            onClick={() => onNavigate('profile')}
            aria-label="Ver perfil"
          >
            <UserAvatar name={profile.name} photo={profile.photo} />
            <span className="user-copy">
              <strong>{profile.name}</strong>
              <small>{profile.email}</small>
            </span>
          </button>
          <button className="icon-button logout-button" aria-label="Sair">
            <Icon name="logout" size={16} />
          </button>
        </div>
      </aside>
    </>
  );
}
