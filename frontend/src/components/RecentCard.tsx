import React from 'react';

interface RecentCardProps {
  commit: string;
  date: string;
  status: 'success' | 'pending' | 'error';
}

const RecentCard: React.FC<RecentCardProps> = ({ commit, date, status }) => {
  const statusConfig = {
    success: {
      icon: 'fa-check-circle',
      color: 'text-stellar-300',
      chip: 'bg-stellar-400/10',
    },
    pending: {
      icon: 'fa-clock',
      color: 'text-signal-400',
      chip: 'bg-signal-500/10',
    },
    error: {
      icon: 'fa-exclamation-circle',
      color: 'text-red-300',
      chip: 'bg-red-500/10',
    }
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-start gap-3 rounded-card border border-hairline bg-surface-raised p-3 transition-colors duration-200 hover:border-hairline-strong">
      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-control ${config.chip}`}>
        <i className={`fas ${config.icon} ${config.color} text-sm`}></i>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">
          {commit}
        </p>
        <p className="mt-0.5 font-mono text-xs text-ink-tertiary">
          {date}
        </p>
      </div>
    </div>
  );
};

export default RecentCard;
