import React from 'react';
import type { ReactNode } from 'react';

interface DashboardSectionProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  /** Variant is retained for API compatibility; all map to the unified cosmic panel. */
  variant?: 'default' | 'cosmic' | 'nebula' | 'galaxy';
  className?: string;
}

const DashboardSection: React.FC<DashboardSectionProps> = ({
  children,
  title,
  subtitle,
  icon,
  className = '',
}) => {
  return (
    <div
      className={`group relative overflow-hidden rounded-panel glass card-hover ${className}`}
    >
      {/* Single ambient nebula veil — one soft, static glow (no orb soup) */}
      <div className="pointer-events-none absolute inset-0 bg-nebula-veil opacity-70" aria-hidden="true" />
      {/* Faint blueprint grid for the mission-control ground */}
      <div className="pointer-events-none absolute inset-0 bg-hud-grid opacity-[0.35]" aria-hidden="true" />

      {/* Content */}
      <div className="relative z-10">
        {(title || subtitle || icon) && (
          <div className="flex items-center gap-3 border-b border-hairline px-4 py-3 md:px-6 md:py-4">
            {icon && (
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-control border border-hairline bg-surface-raised text-base text-accent md:h-10 md:w-10 md:text-lg">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h2 className="truncate font-display text-base font-semibold tracking-tight text-ink md:text-lg">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="mt-0.5 line-clamp-2 text-xs text-ink-tertiary md:text-sm">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        )}
        <div className="p-4 md:p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default DashboardSection;
