import { useEffect, useState } from 'react';
import { DeleteConfirmation } from './components/cash-flow/DeleteConfirmation';
import {
  LaunchDrawer,
  type TransactionInput,
} from './components/cash-flow/LaunchDrawer';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';
import { CashFlowPage } from './pages/cash-flow/CashFlowPage';
import { CashBookPage } from './pages/cash-book/CashBookPage';
import { ForecastsPage } from './pages/forecasts/ForecastsPage';
import { RepassesPage } from './pages/repasses/RepassesPage';
import { InvestmentsPage } from './pages/investments/InvestmentsPage';
import { InvestmentEvolutionPage } from './pages/investment-evolution/InvestmentEvolutionPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { PlaceholderPage } from './pages/placeholder/PlaceholderPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { demoTransactions } from './data/demoTransactions';
import type { PageKey, Transaction, UserProfile } from './types';
import './App.css';

type DrawerState = {
  mode: 'create' | 'edit' | 'view';
  transaction: Transaction | null;
} | null;
const pageRoutes: Record<PageKey, string> = {
  dashboard: '/',
  'cash-flow': '/cash-flow',
  'cash-book': '/cash-book',
  forecasts: '/forecasts',
  repasses: '/repasses',
  investments: '/investments',
  'investment-evolution': '/investment-evolution',
  closing: '/closing',
  reports: '/reports',
  settings: '/settings',
  profile: '/profile',
};

function pageFromPath(path: string): PageKey {
  return (
    (Object.entries(pageRoutes).find(([, route]) => route === path)?.[0] as
      PageKey | undefined) ?? 'dashboard'
  );
}

const defaultProfile: UserProfile = {
  name: 'Lucas Mendes',
  email: 'lucas@fllatech.com',
  photo: null,
};
const profileStorageKey = 'fllatech-money-profile';

function loadProfile(): UserProfile {
  try {
    const storedProfile = localStorage.getItem(profileStorageKey);
    return storedProfile
      ? ({ ...defaultProfile, ...JSON.parse(storedProfile) } as UserProfile)
      : defaultProfile;
  } catch {
    return defaultProfile;
  }
}

function App() {
  const [activePage, setActivePage] = useState<PageKey>(() =>
    pageFromPath(window.location.pathname),
  );
  const [transactions, setTransactions] = useState(demoTransactions);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const [month, setMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(loadProfile);

  useEffect(() => {
    try {
      localStorage.setItem(profileStorageKey, JSON.stringify(profile));
    } catch {
      // The page still works for this session if browser storage is unavailable.
    }
  }, [profile]);

  useEffect(() => {
    function syncPageWithLocation() {
      setActivePage(pageFromPath(window.location.pathname));
      setSidebarOpen(false);
    }
    window.addEventListener('popstate', syncPageWithLocation);
    return () => window.removeEventListener('popstate', syncPageWithLocation);
  }, []);

  function navigate(page: PageKey) {
    if (window.location.pathname !== pageRoutes[page])
      window.history.pushState({}, '', pageRoutes[page]);
    setActivePage(page);
    setSidebarOpen(false);
  }

  function openCreateDrawer() {
    setDrawer({ mode: 'create', transaction: null });
  }

  function openEditDrawer(transaction: Transaction) {
    setDrawer({ mode: 'edit', transaction });
  }

  function openViewDrawer(transaction: Transaction) {
    setDrawer({ mode: 'view', transaction });
  }

  function saveTransaction(input: TransactionInput) {
    if (drawer?.mode === 'edit' && drawer.transaction) {
      const { id } = drawer.transaction;
      setTransactions((current) =>
        current.map((item) => (item.id === id ? { ...input, id } : item)),
      );
    } else {
      setTransactions((current) => [
        { ...input, id: `tx-${crypto.randomUUID()}` },
        ...current,
      ]);
    }
    setDrawer(null);
  }

  function deleteTransaction() {
    if (pendingDelete)
      setTransactions((current) =>
        current.filter((item) => item.id !== pendingDelete.id),
      );
    setPendingDelete(null);
  }

  function confirmTransaction(transaction: Transaction) {
    setTransactions((current) =>
      current.map((item) =>
        item.id === transaction.id ? { ...item, status: 'Confirmado' } : item,
      ),
    );
  }

  return (
    <div className={`app-root theme-${theme}`}>
      <Sidebar
        activePage={activePage}
        isOpen={sidebarOpen}
        onNavigate={navigate}
        profile={profile}
      />
      <div className="app-main">
        <TopHeader
          activePage={activePage}
          month={month}
          theme={theme}
          onMonthChange={setMonth}
          onThemeChange={setTheme}
          onNewTransaction={openCreateDrawer}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
        />

        {activePage === 'dashboard' && (
          <DashboardPage
            transactions={transactions}
            onOpenCashFlow={() => navigate('cash-flow')}
            onOpenClosing={() => navigate('closing')}
          />
        )}
        {activePage === 'cash-flow' && (
          <CashFlowPage
            transactions={transactions}
            onEdit={openEditDrawer}
            onDelete={setPendingDelete}
            onView={openViewDrawer}
            onConfirm={confirmTransaction}
          />
        )}
        {activePage === 'cash-book' && <CashBookPage />}
        {activePage === 'forecasts' && <ForecastsPage month={month} />}
        {activePage === 'repasses' && <RepassesPage month={month} />}
        {activePage === 'investments' && <InvestmentsPage month={month} />}
        {activePage === 'investment-evolution' && <InvestmentEvolutionPage />}
        {activePage === 'profile' && (
          <ProfilePage profile={profile} onSave={setProfile} />
        )}
        {![
          'dashboard',
          'cash-flow',
          'cash-book',
          'forecasts',
          'repasses',
          'investments',
          'investment-evolution',
          'profile',
        ].includes(activePage) && <PlaceholderPage page={activePage} />}
      </div>

      {drawer && (
        <LaunchDrawer
          key={`${drawer.mode}-${drawer.transaction?.id ?? 'new'}`}
          mode={drawer.mode}
          transaction={drawer.transaction}
          onClose={() => setDrawer(null)}
          onSave={saveTransaction}
        />
      )}
      {pendingDelete && (
        <DeleteConfirmation
          transaction={pendingDelete}
          onCancel={() => setPendingDelete(null)}
          onConfirm={deleteTransaction}
        />
      )}
    </div>
  );
}

export default App;
