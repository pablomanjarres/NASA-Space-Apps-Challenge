import React, { useState, useContext } from "react";
import { PageContext } from "./DashboardLayoutComponent";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={`group relative flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left transition-colors duration-200 touch-manipulation ${
        isActive
          ? "bg-stellar-400/[0.08] text-ink ring-1 ring-inset ring-stellar-400/20"
          : "text-ink-secondary hover:bg-surface-raised hover:text-ink"
      }`}
    >
      {/* Active indicator — the stellar accent */}
      <span
        aria-hidden="true"
        className={`absolute left-0 top-1/2 -translate-y-1/2 rounded-r-pill bg-stellar-400 transition-all duration-200 ${
          isActive
            ? "h-6 w-[3px] opacity-100 shadow-[0_0_12px_rgba(34,211,238,0.55)]"
            : "h-0 w-[3px] opacity-0"
        }`}
      />
      <span
        className={`grid h-8 w-8 flex-shrink-0 place-items-center text-[0.95rem] transition-colors duration-200 ${
          isActive ? "text-stellar-400" : "text-ink-tertiary group-hover:text-stellar-300"
        }`}
      >
        {icon}
      </span>
      <span
        className={`truncate font-display text-sm tracking-wide ${
          isActive ? "font-semibold" : "font-medium"
        }`}
      >
        {label}
      </span>
    </button>
  );
};

export default function SideBar() {
  const { activePage, setActivePage } = useContext(PageContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handlePageChange = (page: string) => {
    setActivePage(page);
    setIsMobileMenuOpen(false); // Close mobile menu after navigation
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="glass fixed left-4 top-4 z-[60] grid h-12 w-12 place-items-center rounded-control text-stellar-300 transition-colors duration-200 active:text-stellar-200 touch-manipulation md:hidden"
        aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
      >
        <i className={`fa-solid ${isMobileMenuOpen ? "fa-xmark" : "fa-bars"} text-lg`}></i>
      </button>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-[50] bg-void-950/70 backdrop-blur-sm transition-opacity duration-300 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Close menu overlay"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`glass fixed inset-y-0 left-0 z-[55] m-0 flex h-screen w-[85vw] max-w-[320px] flex-col overflow-hidden rounded-none transition-transform duration-300 ease-in-out md:relative md:m-3 md:h-[calc(100vh-24px)] md:w-72 md:rounded-panel ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        style={{ touchAction: "pan-y" }}
      >
        {/* Single ambient nebula glow — restrained depth */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-nebula-500/10 blur-3xl"
        />

        {/* Header */}
        <div className="relative z-10 flex-shrink-0 border-b border-hairline p-4 md:p-5">
          <div className="flex items-center gap-3">
            <a href="/" title="Return to landing page" className="flex-shrink-0">
              <span className="grid h-10 w-10 place-items-center rounded-control border border-hairline-strong bg-surface-raised text-stellar-300 transition-colors duration-200 hover:border-stellar-400/50 hover:text-stellar-200">
                <i className="fa-solid fa-arrow-left text-sm"></i>
              </span>
            </a>
            <div className="min-w-0">
              <h2 className="gradient-text truncate font-display text-lg font-bold leading-tight">
                Exoplanet Explorer
              </h2>
              <p className="truncate font-mono text-[0.65rem] uppercase tracking-[0.18em] text-ink-tertiary">
                NASA ML Dashboard
              </p>
            </div>
          </div>

          {/* Team / status badge */}
          <div className="mt-4 flex items-center gap-2 rounded-control border border-hairline bg-surface px-3 py-2">
            <i className="fa-solid fa-users text-xs text-stellar-400"></i>
            <span className="truncate font-mono text-[0.7rem] tracking-wide text-ink-secondary">
              GRIT-X · AWA
            </span>
            <span className="ml-auto flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-pill bg-stellar-400 animate-pulse"></span>
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-ink-tertiary">
                Online
              </span>
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav
          aria-label="Primary"
          className="relative z-10 flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-3 py-4 themed-scrollbar"
        >
          <p className="mb-2 flex items-center gap-2 px-3 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-ink-tertiary">
            <i className="fa-solid fa-satellite text-[0.7rem] text-stellar-400/70"></i>
            Explore
          </p>
          <NavItem
            icon={<i className="fa-solid fa-gauge-high"></i>}
            label="Mission Control"
            isActive={activePage === "dashboard"}
            onClick={() => handlePageChange("dashboard")}
          />
          <NavItem
            icon={<i className="fa-solid fa-earth-americas"></i>}
            label="Exoplanets"
            isActive={activePage === "exoplanets"}
            onClick={() => handlePageChange("exoplanets")}
          />
          <NavItem
            icon={<i className="fa-solid fa-chart-area"></i>}
            label="Visualizations"
            isActive={activePage === "visualizations"}
            onClick={() => handlePageChange("visualizations")}
          />

          {/* Hairline divider with star node */}
          <div className="my-3 flex items-center gap-3 px-3">
            <span className="h-px flex-1 bg-hairline"></span>
            <i className="fa-solid fa-star text-[0.6rem] text-ink-tertiary"></i>
            <span className="h-px flex-1 bg-hairline"></span>
          </div>
        </nav>

        {/* Footer */}
        <div className="relative z-10 flex-shrink-0 space-y-3 border-t border-hairline p-3 sm:p-4">
          <NavItem
            icon={<i className="fa-solid fa-book-open"></i>}
            label="Help & Resources"
            isActive={activePage === "help"}
            onClick={() => handlePageChange("help")}
          />

          {/* GRIT logo */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <img
              src="/grit-logo-2.svg"
              alt="GRIT Logo"
              className="h-7 w-7 opacity-60 transition-opacity duration-300 hover:opacity-100"
            />
            <span className="font-mono text-[0.7rem] tracking-wide text-ink-tertiary">
              GRIT-X AWA
            </span>
          </div>

          {/* NASA attribution */}
          <div className="flex items-center justify-center gap-2 border-t border-hairline pt-3">
            <i className="fa-solid fa-satellite-dish text-[0.7rem] text-stellar-400/60"></i>
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-ink-tertiary">
              Powered by NASA Data
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
