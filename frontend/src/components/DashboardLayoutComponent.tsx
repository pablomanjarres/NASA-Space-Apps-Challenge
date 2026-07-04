import React, { useState, useMemo, useCallback, lazy, Suspense, useEffect, startTransition } from 'react';
import type { ReactNode } from 'react';
import SideBar from './sideBar';
import ThemeToggle from './ThemeToggle';
import FontSizeToggle from './FontSizeToggle';
import { SharedProvider } from './context/SharedContext';
import { ExoplanetProvider } from '../contexts/ExoplanetContext';
import { ThemeProvider } from './ThemeContext';

// Type for the page context
interface PageContextType {
  activePage: string;
  setActivePage: (page: string) => void;
}

// Lazy load page components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Exoplanets = lazy(() => import('./pages/Exoplanets'));
const Visualizations = lazy(() => import('./pages/Visualizations'));
const HelpResources = lazy(() => import('./pages/HelpResources'));

// Create context with proper type
export const PageContext = React.createContext<PageContextType>({
  activePage: 'dashboard',
  setActivePage: () => {}
});

const SECTION_LABELS: Record<string, string> = {
  dashboard: 'Mission Control',
  exoplanets: 'Exoplanets',
  visualizations: 'Visualizations',
  help: 'Help & Resources',
};

const DashboardLayoutComponent: React.FC = () => {
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [displayPage, setDisplayPage] = useState<string>('dashboard');
  // Live UTC readout — authentic telemetry, filled client-side (no hydration mismatch)
  const [utc, setUtc] = useState<string>('');

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, '0');
      setUtc(`${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Define a function to update the active page with transition
  const handleSetActivePage = useCallback((page: string) => {
    if (page !== activePage) {
      startTransition(() => {
        setIsTransitioning(true);
      });
      // Wait for fade out animation
      setTimeout(() => {
        startTransition(() => {
          setActivePage(page);
          setDisplayPage(page);
        });
        // Wait a tiny bit then fade in
        setTimeout(() => {
          startTransition(() => {
            setIsTransitioning(false);
          });
        }, 50);
      }, 200);
    }
  }, [activePage]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    activePage,
    setActivePage: handleSetActivePage,
  }), [activePage, handleSetActivePage]);

  // Render different content based on activePage state
  const renderContent = (): JSX.Element => {
    switch (displayPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'exoplanets':
        return <Exoplanets />;
      case 'visualizations':
        return <Visualizations />;
      case 'help':
        return <HelpResources />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <SharedProvider>
      <ExoplanetProvider>
        <ThemeProvider>
          <PageContext.Provider value={contextValue}>
            <div className="relative flex h-screen overflow-hidden bg-[var(--bg)] text-ink transition-colors duration-200">
              {/* Ambient atmosphere — unified palette, restrained (blueprint grid + two faint glows) */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 hud-grid opacity-60" />
                <div className="absolute -top-24 right-[8%] h-72 w-72 rounded-full bg-nebula-500/10 blur-[120px]" />
                <div className="absolute bottom-[-12%] left-[22%] h-80 w-80 rounded-full bg-stellar-500/[0.06] blur-[130px]" />
              </div>

              {/* Sidebar container */}
              <div className="relative z-10 h-full flex-shrink-0">
                <SideBar />
              </div>

              {/* Main content area */}
              <main className="relative z-10 flex-1 overflow-y-auto themed-scrollbar p-3 pt-20 sm:p-4 sm:pt-16 md:p-6 md:pt-4">
                {/* Mission-control topbar */}
                <header className="glass mb-4 flex items-center justify-end gap-3 rounded-card px-4 py-2.5 sm:justify-between">
                  <div className="hidden min-w-0 items-center gap-3 sm:flex">
                    <span className="relative flex h-2 w-2 flex-shrink-0">
                      <span className="absolute inline-flex h-full w-full rounded-pill bg-stellar-400 opacity-60 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-pill bg-stellar-400" />
                    </span>
                    <span className="truncate font-mono text-[0.7rem] uppercase tracking-[0.2em] text-ink-tertiary">
                      {SECTION_LABELS[activePage] ?? 'Mission Control'}
                      <span className="text-ink-secondary"> · Operational</span>
                    </span>
                    <span className="hidden font-mono text-[0.7rem] tracking-wide tabular-nums text-ink-tertiary lg:inline">
                      {utc}
                    </span>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <FontSizeToggle />
                    <ThemeToggle />
                  </div>
                </header>

                <Suspense fallback={
                  <div className="flex h-full items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-12 w-12 animate-spin rounded-full border-2 border-stellar-400/20 border-t-stellar-400" />
                      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-tertiary">Loading mission data…</p>
                    </div>
                  </div>
                }>
                  <div
                    className={`transition-all duration-300 ease-in-out ${
                      isTransitioning
                        ? 'opacity-0 translate-y-4 scale-[0.98]'
                        : 'opacity-100 translate-y-0 scale-100'
                    }`}
                  >
                    {renderContent()}
                  </div>
                </Suspense>
              </main>
            </div>
          </PageContext.Provider>
        </ThemeProvider>
      </ExoplanetProvider>
    </SharedProvider>
  );
}

export default DashboardLayoutComponent;