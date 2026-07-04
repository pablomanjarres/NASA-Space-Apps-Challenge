import React, { useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { isDemoMode, demoRecentActivity } from '../lib/demoFixtures';

interface Activity {
  id: number;
  message: string;
  created_at: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

export interface RecentActivityRef {
  addOptimisticActivity: (activity: Activity) => void;
  refreshActivities: (keepExisting: boolean) => void;
}

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  if (diffDays === 0) {
    return `Today at ${timeStr}`;
  } else if (diffDays === 1) {
    return `Yesterday at ${timeStr}`;
  } else if (diffDays < 7) {
    return `${diffDays} days ago at ${timeStr}`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) + ` at ${timeStr}`;
  }
};

const getActivityType = (message: string): 'success' | 'info' | 'warning' | 'error' => {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('error') || lowerMessage.includes('failed')) return 'error';
  if (lowerMessage.includes('warning') || lowerMessage.includes('experiment')) return 'warning';
  if (lowerMessage.includes('detected') || lowerMessage.includes('retrained') || lowerMessage.includes('imported')) return 'success';
  return 'info';
};

const getActivityIcon = (type: 'success' | 'info' | 'warning' | 'error'): string => {
  switch (type) {
    case 'success': return 'fa-check-circle';
    case 'warning': return 'fa-exclamation-circle';
    case 'error': return 'fa-times-circle';
    default: return 'fa-info-circle';
  }
};

const getActivityColor = (type: 'success' | 'info' | 'warning' | 'error'): string => {
  switch (type) {
    case 'success': return 'bg-stellar-400/[0.07] border-stellar-400/25';
    case 'warning': return 'bg-signal-500/[0.07] border-signal-500/25';
    case 'error': return 'bg-red-500/[0.07] border-red-400/25';
    default: return 'bg-nebula-500/[0.07] border-nebula-400/25';
  }
};

const getIconColor = (type: 'success' | 'info' | 'warning' | 'error'): string => {
  switch (type) {
    case 'success': return 'text-stellar-300';
    case 'warning': return 'text-signal-400';
    case 'error': return 'text-red-300';
    default: return 'text-nebula-300';
  }
};

const RecentActivity = forwardRef<RecentActivityRef>((props, ref) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);

  const fetchActivities = useCallback((keepExisting = false) => {
    if (!keepExisting) {
      setLoading(true);
    }

    // DEMO mode: use bundled sample activity instead of the local backend log
    // endpoint (which is unreachable / mixed-content on the deployed demo).
    if (isDemoMode()) {
      const activitiesWithType = demoRecentActivity().map((log) => ({
        ...log,
        type: getActivityType(log.message),
      }));
      setAllActivities(activitiesWithType);
      setActivities(activitiesWithType.slice(0, showAll ? 8 : 4));
      setLoading(false);
      return;
    }

    fetch('http://localhost:8000/api/v1/logs/all')
      .then(res => res.json())
      .then(data => {
        const activitiesWithType = data.map((log: any) => ({
          ...log,
          type: getActivityType(log.message)
        }));
        setAllActivities(activitiesWithType);
        setActivities(activitiesWithType.slice(0, showAll ? 8 : 4));
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching activities:', err);
        setLoading(false);
      });
  }, [showAll]);

  const toggleShowAll = () => {
    if (showAll) {
      setActivities(allActivities.slice(0, 4));
    } else {
      setActivities(allActivities.slice(0, 8));
    }
    setShowAll(!showAll);
  };

  useEffect(() => {
    // Add CSS for fade-in animation (client-side only)
    if (typeof document !== 'undefined') {
      const styleId = 'recent-activity-animations';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fadeIn {
            animation: fadeIn 0.4s ease-out forwards;
          }
        `;
        document.head.appendChild(style);
      }
    }

    fetchActivities();
    // Refresh every 30 seconds
    const interval = setInterval(() => fetchActivities(true), 30000);
    return () => clearInterval(interval);
  }, [fetchActivities]);

  // Expose methods for external use
  useImperativeHandle(ref, () => ({
    addOptimisticActivity: (activity: Activity) => {
      setActivities(prev => [activity, ...prev].slice(0, showAll ? 8 : 4));
    },
    refreshActivities: (keepExisting: boolean) => {
      fetchActivities(keepExisting);
    }
  }));

  return (
    <div className="relative overflow-hidden rounded-panel glass p-6">
      <div className="pointer-events-none absolute inset-0 bg-hud-grid opacity-[0.35]" aria-hidden="true" />
      <div className="relative z-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-control border border-hairline bg-surface-raised">
          <i className="fas fa-history text-lg text-accent"></i>
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-ink">Recent Activity</h2>
          <p className="text-sm text-ink-tertiary">Latest system events and updates</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-hairline border-t-stellar-400"></div>
        </div>
      ) : activities.length > 0 ? (
        <div className="space-y-3">
          {activities.map((activity, index) => (
            <div
              key={activity.id}
              className={`animate-fadeIn rounded-card border p-4 transition-colors duration-300 ${getActivityColor(activity.type)}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-control ${getIconColor(activity.type)}`}>
                  <i className={`fas ${getActivityIcon(activity.type)}`}></i>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-relaxed text-ink">{activity.message}</p>
                  <p className="mt-1 font-mono text-xs text-ink-tertiary">
                    {formatRelativeTime(activity.created_at)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 text-center">
          <i className="fas fa-inbox mb-3 text-4xl text-ink-tertiary/40"></i>
          <p className="text-sm text-ink-tertiary">No recent activity</p>
        </div>
      )}

      <button
        onClick={toggleShowAll}
        className="btn-space btn-secondary mt-6 w-full text-sm"
      >
        <i className={`fas ${showAll ? 'fa-chevron-up' : 'fa-list'}`}></i>
        {showAll ? 'Show Less' : 'View All Activity'}
      </button>
      </div>
    </div>
  );
});

RecentActivity.displayName = 'RecentActivity';

export default RecentActivity;
