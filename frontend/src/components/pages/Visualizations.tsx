import React, { useState, useEffect } from 'react';
import { useExoplanet } from '../../contexts/ExoplanetContext';
import ExoplanetVisualization3D from './analysis/ExoplanetVisualization3D';
import { classificationService } from '../../services/classificationService';

// Visualization Card Component
interface VisualizationCardProps {
  title: string;
  children: React.ReactNode;
}

const VisualizationCard: React.FC<VisualizationCardProps> = ({ title, children }) => (
  <div className="glass rounded-panel overflow-hidden">
    <div className="p-6 border-b border-hairline">
      <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      <p className="text-sm text-ink-tertiary mt-1">{children}</p>
    </div>
  </div>
);

// ---- Cosmic planet-type ramp (ordered small→large: stellar cyan → nebula violet)
const PLANET_TYPE_RAMP = {
  earth: '#67e8f9',   // stellar-300  — Earth-like
  superEarth: '#22d3ee', // stellar-400 — Super-Earth
  miniNeptune: '#a78bfa', // nebula-400 — Mini-Neptune
  neptune: '#8b5cf6', // nebula-500 — Neptune-like
  jupiter: '#5b4bd6', // nebula-700 — Jupiter-like
} as const;

const getPlanetHue = (radius: number): string => {
  if (radius < 1.25) return PLANET_TYPE_RAMP.earth;
  if (radius < 2.0) return PLANET_TYPE_RAMP.superEarth;
  if (radius < 4.0) return PLANET_TYPE_RAMP.miniNeptune;
  if (radius < 10.0) return PLANET_TYPE_RAMP.neptune;
  return PLANET_TYPE_RAMP.jupiter;
};

// A lit-sphere fill for any hue — highlight top-left, darkened limb. One inset
// shadow only (no colored glows), keeps the cosmic restraint.
const sphereStyle = (hex: string): React.CSSProperties => ({
  background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.60) 0%, ${hex} 46%, #04060d 128%)`,
  boxShadow: 'inset -5px -7px 15px rgba(4,6,13,0.55)',
});

// Planet Size Circle Component
interface PlanetCircleProps {
  size: string;
  color: string;
  name: string;
  radius?: number; // In Earth radii
}

const PlanetCircle: React.FC<PlanetCircleProps> = ({ size, color, name, radius }) => (
  <div className="flex flex-col items-center group">
    <div
      className={`${size} rounded-full border border-white/10 transition-transform duration-300 group-hover:scale-105`}
      style={sphereStyle(color)}
    ></div>
    <p className="text-xs mt-3 font-medium text-ink-secondary">{name}</p>
    {radius !== undefined && (
      <p className="font-mono text-xs mt-1 text-ink-tertiary tabular-nums">{radius.toFixed(2)} R⊕</p>
    )}
  </div>
);

// Dynamic Planet Size Comparison Component
interface DynamicPlanetComparisonProps {
  planets: Array<{ name: string; radius: number; id?: string | number }>;
}

const DynamicPlanetComparison: React.FC<DynamicPlanetComparisonProps> = ({ planets }) => {
  // Sort planets by radius for better visualization
  const sortedPlanets = [...planets].sort((a, b) => a.radius - b.radius);

  // Calculate sizes relative to the largest planet
  const maxRadius = Math.max(...sortedPlanets.map(p => p.radius));
  const baseSize = 160; // Maximum pixel size for the largest planet

  const getPlanetSize = (radius: number) => {
    const scaledSize = (radius / maxRadius) * baseSize;
    // Ensure minimum visible size
    const size = Math.max(scaledSize, 24);
    return `${size}px`;
  };

  return (
    <div className="flex flex-wrap items-end justify-center gap-8 min-h-[300px] py-8">
      {/* Always show Earth as reference */}
      <div className="flex flex-col items-center group">
        <div
          className="rounded-full border border-white/10 transition-transform duration-300 group-hover:scale-105"
          style={{ width: getPlanetSize(1.0), height: getPlanetSize(1.0), ...sphereStyle(PLANET_TYPE_RAMP.earth) }}
        ></div>
        <p className="text-xs mt-3 font-medium text-ink-secondary">Earth (Reference)</p>
        <p className="font-mono text-xs mt-1 text-ink-tertiary tabular-nums">1.00 R⊕</p>
      </div>

      {/* Analyzed planets */}
      {sortedPlanets.map((planet, idx) => (
        <div key={planet.id || idx} className="flex flex-col items-center group">
          <div
            className="rounded-full border border-white/10 transition-transform duration-300 group-hover:scale-105"
            style={{ width: getPlanetSize(planet.radius), height: getPlanetSize(planet.radius), ...sphereStyle(getPlanetHue(planet.radius)) }}
          ></div>
          <p className="text-xs mt-3 font-medium text-ink-secondary max-w-[120px] text-center truncate" title={planet.name}>
            {planet.name}
          </p>
          <p className="font-mono text-xs mt-1 text-ink-tertiary tabular-nums">{planet.radius.toFixed(2)} R⊕</p>
        </div>
      ))}
    </div>
  );
};

// Color Legend Component
const LEGEND_ITEMS: Array<{ hue: string; name: string; range: string; note: string }> = [
  { hue: PLANET_TYPE_RAMP.earth, name: 'Earth-like', range: '< 1.25 R⊕', note: 'Rocky planets' },
  { hue: PLANET_TYPE_RAMP.superEarth, name: 'Super-Earth', range: '1.25 – 2.0 R⊕', note: 'Large rocky' },
  { hue: PLANET_TYPE_RAMP.miniNeptune, name: 'Mini-Neptune', range: '2.0 – 4.0 R⊕', note: 'Gas envelope' },
  { hue: PLANET_TYPE_RAMP.neptune, name: 'Neptune-like', range: '4.0 – 10.0 R⊕', note: 'Ice giant' },
  { hue: PLANET_TYPE_RAMP.jupiter, name: 'Jupiter-like', range: '> 10.0 R⊕', note: 'Gas giant' },
];

const PlanetSizeLegend: React.FC = () => (
  <div className="mt-6 pt-6 border-t border-hairline">
    <h3 className="text-eyebrow uppercase text-ink-tertiary mb-4 text-center">
      Planet Type Classification
    </h3>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 max-w-4xl mx-auto">
      {LEGEND_ITEMS.map((item) => (
        <div key={item.name} className="flex flex-col items-center p-3 bg-surface border border-hairline rounded-card">
          <div className="w-6 h-6 rounded-full border border-white/10 mb-2" style={sphereStyle(item.hue)}></div>
          <p className="text-xs font-medium text-ink">{item.name}</p>
          <p className="font-mono text-xs text-ink-secondary tabular-nums">{item.range}</p>
          <p className="text-xs text-ink-tertiary mt-1 text-center">{item.note}</p>
        </div>
      ))}
    </div>
    <p className="text-xs text-ink-tertiary text-center mt-4">
      <i className="fas fa-info-circle mr-1 text-stellar-400"></i>
      R⊕ = Earth Radii (1 R⊕ = 6,371 km)
    </p>
  </div>
);

// Dynamic Orbital Period Chart Component
interface OrbitalPeriodChartProps {
  planets?: Array<any>;
  dataType?: 'kepler' | 'tess' | null;
}

const OrbitalPeriodChart: React.FC<OrbitalPeriodChartProps> = ({ planets, dataType }) => {
  // If we have planet data, calculate real distribution
  if (planets && planets.length > 0) {
    const periods = planets.map(p => {
      if (dataType === 'kepler') {
        return p.koi_period || p.pl_orbper || 0;
      } else {
        return p.pl_orbper || p.koi_period || 0;
      }
    }).filter(p => p > 0);

    // Define bins — ordered period buckets on a stellar→nebula sequential ramp
    const bins = [
      { min: 0, max: 10, label: '0-10d', color: 'from-stellar-500 to-stellar-300' },
      { min: 10, max: 50, label: '10-50d', color: 'from-stellar-600 to-stellar-400' },
      { min: 50, max: 100, label: '50-100d', color: 'from-nebula-500 to-nebula-300' },
      { min: 100, max: 365, label: '100-365d', color: 'from-nebula-600 to-nebula-400' },
      { min: 365, max: Infinity, label: '>365d', color: 'from-nebula-700 to-nebula-500' }
    ];

    // Count planets in each bin
    const binData = bins.map(bin => ({
      ...bin,
      count: periods.filter(p => p >= bin.min && p < bin.max).length
    }));

    const maxCount = Math.max(...binData.map(b => b.count), 1);

    return (
      <div className="h-80 bg-void-900/30 rounded-card p-6 border border-hairline">
        <div className="h-64 flex items-end justify-between space-x-2 mb-4">
          {binData.map((bar, idx) => {
            const heightPercentage = maxCount > 0 ? (bar.count / maxCount) * 100 : 0;

            return (
              <div key={idx} className="flex-1 flex flex-col justify-end items-center group h-full">
                <div className="w-full bg-surface-sunken border border-hairline rounded-t-md overflow-hidden relative" style={{ height: `${Math.max(heightPercentage, 5)}%` }}>
                  <div className={`absolute inset-0 bg-gradient-to-t ${bar.color}`}></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-mono text-white text-sm tabular-nums drop-shadow-[0_1px_2px_rgba(4,6,13,0.85)]">{bar.count}</span>
                  </div>
                </div>
                <div className="mt-2 font-mono text-xs text-ink-tertiary tabular-nums">{bar.label}</div>
              </div>
            );
          })}
        </div>
        <div className="text-center">
          <p className="text-xs text-ink-tertiary">
            <i className="fas fa-info-circle mr-1 text-stellar-400"></i>
            Showing distribution of <span className="font-mono text-ink-secondary tabular-nums">{periods.length}</span> exoplanet{periods.length !== 1 ? 's' : ''} with orbital period data
          </p>
        </div>
      </div>
    );
  }

  // Default mock data when no planets are provided
  return (
    <div className="h-80 bg-void-900/30 rounded-card p-6 border border-hairline">
      <div className="h-64 flex items-end justify-between space-x-2 mb-4">
        {[
          { heightPercent: 25, count: 342, label: '0-10d', color: 'from-stellar-500 to-stellar-300' },
          { heightPercent: 60, count: 1243, label: '10-50d', color: 'from-stellar-600 to-stellar-400' },
          { heightPercent: 45, count: 856, label: '50-100d', color: 'from-nebula-500 to-nebula-300' },
          { heightPercent: 30, count: 523, label: '100-365d', color: 'from-nebula-600 to-nebula-400' },
          { heightPercent: 15, count: 187, label: '>365d', color: 'from-nebula-700 to-nebula-500' }
        ].map((bar, idx) => (
          <div key={idx} className="flex-1 flex flex-col justify-end items-center group h-full">
            <div className="w-full bg-surface-sunken border border-hairline rounded-t-md overflow-hidden relative" style={{ height: `${bar.heightPercent}%` }}>
              <div className={`absolute inset-0 bg-gradient-to-t ${bar.color}`}></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-white text-sm tabular-nums drop-shadow-[0_1px_2px_rgba(4,6,13,0.85)]">{bar.count}</span>
              </div>
            </div>
            <div className="mt-2 font-mono text-xs text-ink-tertiary tabular-nums">{bar.label}</div>
          </div>
        ))}
      </div>
      <div className="text-center">
        <p className="text-xs text-ink-tertiary italic">
          <i className="fas fa-star mr-1 text-nebula-400"></i>
          Example data — select exoplanets from Predictions or Exoplanets page to see real data
        </p>
      </div>
    </div>
  );
};

// Dynamic Discovery Method Chart Component
interface DiscoveryMethodChartProps {
  planets?: Array<any>;
  dataType?: 'kepler' | 'tess' | null;
}

const DiscoveryMethodChart: React.FC<DiscoveryMethodChartProps> = ({ planets, dataType }) => {
  // If we have planet data, calculate real distribution
  if (planets && planets.length > 0 && dataType) {
    const methods: Record<string, number> = {
      'Transit': 0,
      'Radial Velocity': 0,
      'Imaging': 0,
      'Microlensing': 0,
      'Other': 0
    };

    // For TESS and Kepler missions, the primary method is Transit
    // We can infer or use disposition fields if available
    planets.forEach(planet => {
      // Most Kepler and TESS discoveries are via transit method
      if (dataType === 'kepler' || dataType === 'tess') {
        methods['Transit']++;
      } else {
        // For other datasets, you might have a discovery method field
        const method = planet.discoverymethod || planet.pl_discmethod || 'Transit';
        if (methods[method]) {
          methods[method]++;
        } else {
          methods['Other']++;
        }
      }
    });

    const total = planets.length;
    const methodData = [
      { method: 'Transit', count: methods['Transit'], color: 'bg-gradient-to-r from-stellar-500 to-stellar-400' },
      { method: 'Radial Velocity', count: methods['Radial Velocity'], color: 'bg-gradient-to-r from-nebula-500 to-nebula-400' },
      { method: 'Imaging', count: methods['Imaging'], color: 'bg-gradient-to-r from-stellar-600 to-stellar-500' },
      { method: 'Microlensing', count: methods['Microlensing'], color: 'bg-gradient-to-r from-nebula-600 to-nebula-500' },
      { method: 'Other', count: methods['Other'], color: 'bg-ink-tertiary' }
    ]
      .filter(item => item.count > 0)
      .map(item => ({
        ...item,
        percentage: total > 0 ? Math.round((item.count / total) * 100) : 0
      }));

    return (
      <div className="h-80 bg-void-900/30 rounded-card p-6 border border-hairline">
        <div className="space-y-4">
          {methodData.map((item, idx) => (
            <div key={idx} className="group">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-ink">{item.method}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-ink-tertiary tabular-nums">{item.count} planet{item.count !== 1 ? 's' : ''}</span>
                  <span className="font-mono text-sm font-semibold text-stellar-300 tabular-nums">{item.percentage}%</span>
                </div>
              </div>
              <div className="progress-track h-2.5">
                <div
                  className={`h-full rounded-pill ${item.color} origin-left`}
                  style={{ width: `${item.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <p className="text-xs text-ink-tertiary">
            <i className="fas fa-info-circle mr-1 text-stellar-400"></i>
            Showing discovery methods for <span className="font-mono text-ink-secondary tabular-nums">{total}</span> exoplanet{total !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    );
  }

  // Default mock data when no planets are provided
  return (
    <div className="h-80 bg-void-900/30 rounded-card p-6 border border-hairline">
      <div className="space-y-4">
        {[
          { method: 'Transit', percentage: 76, count: 3821, color: 'bg-gradient-to-r from-stellar-500 to-stellar-400' },
          { method: 'Radial Velocity', percentage: 15, count: 753, color: 'bg-gradient-to-r from-nebula-500 to-nebula-400' },
          { method: 'Imaging', percentage: 5, count: 251, color: 'bg-gradient-to-r from-stellar-600 to-stellar-500' },
          { method: 'Microlensing', percentage: 3, count: 151, color: 'bg-gradient-to-r from-nebula-600 to-nebula-500' },
          { method: 'Other', percentage: 1, count: 50, color: 'bg-ink-tertiary' }
        ].map((item, idx) => (
          <div key={idx} className="group">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-ink">{item.method}</span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-ink-tertiary tabular-nums">{item.count} planets</span>
                <span className="font-mono text-sm font-semibold text-stellar-300 tabular-nums">{item.percentage}%</span>
              </div>
            </div>
            <div className="progress-track h-2.5">
              <div
                className={`h-full rounded-pill ${item.color} origin-left`}
                style={{ width: `${item.percentage}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 text-center">
        <p className="text-xs text-ink-tertiary italic">
          <i className="fas fa-star mr-1 text-nebula-400"></i>
          Example data — select exoplanets to see real discovery method data
        </p>
      </div>
    </div>
  );
};

// Dynamic Star Type Chart Component
interface StarTypeChartProps {
  planets: Array<any>;
  dataType: 'kepler' | 'tess';
}

const StarTypeChart: React.FC<StarTypeChartProps> = ({ planets, dataType }) => {
  // Function to classify star type based on effective temperature - using improved logic
  const classifyStarType = (teff: number): string => {
    return classificationService.classifyStarType(teff);
  };

  // Count star types from the planets
  const starTypeCounts: Record<string, number> = {
    'O-type': 0,
    'B-type': 0,
    'A-type': 0,
    'F-type': 0,
    'G-type': 0,
    'K-type': 0,
    'M-type': 0,
    'Unknown': 0,
  };

  planets.forEach((planet) => {
    const teff = dataType === 'tess' ? planet.st_teff : planet.koi_steff;
    if (teff) {
      const type = classifyStarType(teff);
      starTypeCounts[type]++;
    } else {
      starTypeCounts['Unknown']++;
    }
  });

  const totalStars = planets.length;

  // Filter out types with 0 count and prepare segments
  const starTypeSegments = [
    { type: 'O-type', color: '#3b82f6', label: 'O-type (Blue)', description: 'Very hot blue stars (>30,000K)' },
    { type: 'B-type', color: '#60a5fa', label: 'B-type (Blue-white)', description: 'Hot blue-white stars (10,000-30,000K)' },
    { type: 'A-type', color: '#f3f4f6', label: 'A-type (White)', description: 'White stars (7,500-10,000K)' },
    { type: 'F-type', color: '#fef3c7', label: 'F-type (Yellow-white)', description: 'Yellow-white stars (6,000-7,500K)' },
    { type: 'G-type', color: '#fbbf24', label: 'G-type (Sun-like)', description: 'Sun-like yellow stars (5,200-6,000K)' },
    { type: 'K-type', color: '#f97316', label: 'K-type (Orange)', description: 'Orange stars (3,700-5,200K)' },
    { type: 'M-type', color: '#ef4444', label: 'M-type (Red dwarf)', description: 'Cool red dwarf stars (2,400-3,700K)' },
    { type: 'Unknown', color: '#6b7280', label: 'Unknown', description: 'Unknown spectral type' },
  ]
    .map((segment) => ({
      ...segment,
      count: starTypeCounts[segment.type],
      percent: totalStars > 0 ? (starTypeCounts[segment.type] / totalStars) * 100 : 0,
    }))
    .filter((segment) => segment.count > 0);

  // Calculate cumulative start positions for donut segments
  let cumulativePercent = 0;
  const segmentsWithPositions = starTypeSegments.map((segment) => {
    const start = cumulativePercent;
    cumulativePercent += segment.percent;
    return { ...segment, start };
  });

  if (totalStars === 0) {
    return (
      <div className="h-80 bg-void-900/30 rounded-card p-6 border border-hairline flex items-center justify-center">
        <div className="text-center text-ink-tertiary">
          <i className="fas fa-star text-6xl mb-4 opacity-30"></i>
          <p className="text-lg font-medium text-ink-secondary">No star data available</p>
          <p className="text-sm mt-2">Select exoplanets to analyze their host stars</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-80 bg-void-900/30 rounded-card p-6 border border-hairline flex items-center justify-center relative overflow-hidden">
      {/* Animated background stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-stellar-400/25 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative w-64 h-64 group">
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-stellar-400/10 via-nebula-500/10 to-stellar-400/10 blur-xl animate-pulse"></div>

        {/* Donut chart segments with animation */}
        <svg viewBox="0 0 100 100" className="transform -rotate-90 transition-transform duration-700 group-hover:rotate-[6deg] group-hover:scale-105">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="20"
            className="text-void-500 opacity-40"
          />
          
          {segmentsWithPositions.map((segment, idx) => {
            const radius = 40;
            const circumference = 2 * Math.PI * radius;
            const offset = (segment.start / 100) * circumference;
            const dashArray = `${(segment.percent / 100) * circumference} ${circumference}`;

            return (
              <g key={idx} className="animate-[fadeIn_0.5s_ease-out]" style={{ animationDelay: `${idx * 0.1}s` }}>
                <title>{`${segment.label}: ${segment.count} (${segment.percent.toFixed(1)}%)`}</title>
                {/* Segment with glow effect */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="20"
                  strokeDasharray={dashArray}
                  strokeDashoffset={-offset}
                  className="transition-all duration-500 hover:brightness-125 cursor-pointer"
                  style={{
                    opacity: 0.9,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.strokeWidth = '24';
                    e.currentTarget.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.strokeWidth = '20';
                    e.currentTarget.style.opacity = '0.9';
                  }}
                />
              </g>
            );
          })}
        </svg>

        {/* Center text with animation */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center animate-[fadeIn_0.8s_ease-out]">
            <div className="font-mono text-4xl font-semibold text-stellar-300 tabular-nums">
              {totalStars}
            </div>
            <div className="text-eyebrow text-ink-tertiary mt-1 uppercase">
              {totalStars === 1 ? 'Star' : 'Stars'}
            </div>
            <div className="mt-2">
              <i className="fas fa-star text-stellar-300 text-sm animate-spin" style={{ animationDuration: '3s' }}></i>
            </div>
          </div>
        </div>

        {/* Rotating orbit ring */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 pointer-events-none animate-spin" style={{ animationDuration: '20s' }}>
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeDasharray="2 4"
            className="text-stellar-400/25"
          />
        </svg>
      </div>

      {/* Legend with animations */}
      <div className="ml-8 space-y-2 max-h-64 overflow-y-auto pr-2 themed-scrollbar">
        {segmentsWithPositions.map((item, idx) => {
          const colorClass = item.color.startsWith('#') ? '' : item.color;
          return (
          <div
            key={idx}
            className="flex items-center gap-3 group cursor-pointer p-2 rounded-control hover:bg-surface-raised transition-colors duration-300 animate-[slideInRight_0.5s_ease-out]"
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div className="relative">
              {/* Soft glow behind the color indicator (spectral hue) */}
              <div
                className="absolute inset-0 rounded-full blur-sm transition-all duration-300 group-hover:blur-md group-hover:scale-150"
                style={{ backgroundColor: item.color, opacity: 0.3 }}
              ></div>
              <div
                className={`w-4 h-4 rounded-full border border-white/15 transition-transform duration-300 group-hover:scale-125 relative z-10 ${colorClass}`}
                {...(item.color.startsWith('#') && { style: { backgroundColor: item.color } })}
              ></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-ink group-hover:text-stellar-300 transition-colors">
                  {item.type}
                </span>
                <span className="font-mono text-xs text-ink-secondary bg-surface border border-hairline px-2 py-0.5 rounded-pill tabular-nums">
                  {item.count} · {item.percent.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs text-ink-tertiary mt-0.5 transition-colors">
                {item.description}
              </p>
            </div>
            <i className="fas fa-chevron-right text-stellar-400 text-xs opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1"></i>
          </div>
        );})}
      </div>
    </div>
  );
};

const Visualizations: React.FC = () => {
  const { selectedExoplanet, selectedExoplanets, dataType, clearSelectedExoplanet, clearAllExoplanets } = useExoplanet();
  const [showExamples, setShowExamples] = useState(false);

  // Determine if we're showing multiple planets or a single planet
  const isMultipleMode = selectedExoplanets && selectedExoplanets.length > 0;
  const hasSelection = selectedExoplanet || isMultipleMode;
  const [downloadingImage, setDownloadingImage] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('🎨 Visualizations Component State:', {
      selectedExoplanet,
      selectedExoplanets,
      selectedExoplanetsLength: selectedExoplanets?.length,
      dataType,
      isMultipleMode,
      hasSelection
    });
  }, [selectedExoplanet, selectedExoplanets, dataType, isMultipleMode, hasSelection]);

  // Scroll to top when exoplanets are loaded (from predictions)
  useEffect(() => {
    if (hasSelection) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [hasSelection]);

  // Download Planet Size Comparison as image
  const downloadPlanetSizeImage = async () => {
    try {
      setDownloadingImage(true);
      const html2canvas = (await import('html2canvas')).default;
      
      const element = document.querySelector('.planet-size-comparison-container');
      if (!element) {
        throw new Error('Comparison section not found');
      }

      const canvas = await html2canvas(element as HTMLElement, {
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png');
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const planetCount = isMultipleMode ? selectedExoplanets.length : (selectedExoplanet ? 1 : 'examples');
      link.download = `planet-size-comparison-${planetCount}-planets-${timestamp}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('Failed to download image. Please try again.');
    } finally {
      setDownloadingImage(false);
    }
  };

  // Sample data for examples
  const sampleTessData = {
    tic_id: 307210830,
    toi_id: 700.01,
    pl_name: "TOI-700 d",
    pl_rade: 1.19,
    pl_orbper: 37.426,
    pl_eqt: 269,
    pl_orbsmax: 0.163,
    st_rad: 0.415,
    st_teff: 3480,
    sy_dist: 31.13,
  };

  const sampleKeplerData = {
    kepid: 10187017,
    kepler_name: "Kepler-186 f",
    koi_disposition: "CONFIRMED",
    koi_period: 129.944,
    koi_prad: 1.17,
    koi_teq: 188,
    koi_insol: 0.29,
    koi_sma: 0.432,
    koi_depth: 36.2,
    koi_duration: 3.82,
    koi_steff: 3788,
    koi_srad: 0.472,
  };

  return (
    <div className="p-6 min-h-screen">
      <div className="flex justify-between items-center mb-8 gap-4 flex-wrap">
        <div>
          <p className="text-eyebrow uppercase text-stellar-400 mb-2">Observatory</p>
          <h1 className="font-display text-display-lg font-semibold gradient-text mb-2">
            Exoplanet Visualizations
          </h1>
          <p className="text-ink-secondary">Interactive charts and 3D visualizations of exoplanet data</p>
        </div>
        {!hasSelection && (
          <button
            type="button"
            onClick={() => setShowExamples(!showExamples)}
            className="btn-space btn-secondary"
          >
            <i className={`fas ${showExamples ? 'fa-eye-slash' : 'fa-star'}`}></i>
            <span>{showExamples ? 'Hide Examples' : 'Show Example Exoplanets'}</span>
          </button>
        )}
      </div>

      {/* Multiple Exoplanets 3D Visualization */}
      {isMultipleMode && dataType && (
        <div className="mb-8">
          <div className="glass rounded-panel bg-nebula-veil p-8 mb-6">
            <div className="flex justify-between items-center gap-4 flex-wrap">
              <div>
                <p className="text-eyebrow uppercase text-stellar-400 mb-2">Selected Systems</p>
                <h2 className="font-display text-2xl font-semibold text-ink flex items-center gap-3">
                  <i className="fas fa-layer-group text-nebula-400 text-xl"></i>
                  Your Selected Exoplanet Systems
                </h2>
                <p className="text-ink-secondary mt-2">
                  Comparing <span className="font-mono text-stellar-300 tabular-nums">{selectedExoplanets.length}</span> exoplanets in 3D
                </p>
              </div>
              <button
                type="button"
                onClick={clearAllExoplanets}
                className="btn-space btn-secondary"
              >
                <i className="fas fa-times-circle"></i>
                <span>Clear All</span>
              </button>
            </div>
          </div>

          <div className="glass rounded-panel p-6 cursor-move">
            <ExoplanetVisualization3D
              data={selectedExoplanets[0]}
              dataType={dataType}
              multipleData={selectedExoplanets}
            />
          </div>
        </div>
      )}

      {/* Single Exoplanet 3D Visualization */}
      {selectedExoplanet && !isMultipleMode && dataType && (
        <div className="mb-8">
          <div className="glass rounded-panel bg-nebula-veil p-8 mb-6">
            <div className="flex justify-between items-center gap-4 flex-wrap">
              <div>
                <p className="text-eyebrow uppercase text-stellar-400 mb-2">Selected System</p>
                <h2 className="font-display text-2xl font-semibold text-ink flex items-center gap-3">
                  <i className="fas fa-planet-ringed text-nebula-400 text-xl"></i>
                  Your Selected Exoplanet System
                </h2>
                <p className="text-ink-secondary mt-2 flex items-center gap-2">
                  <i className="fas fa-star text-stellar-400"></i>
                  <span className="font-mono text-ink">
                    {dataType === 'kepler'
                      ? selectedExoplanet.kepler_name || `KOI-${selectedExoplanet.kepid}`
                      : selectedExoplanet.pl_name || `TOI-${selectedExoplanet.toi_id}`
                    }
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={clearSelectedExoplanet}
                className="btn-space btn-secondary"
              >
                <i className="fas fa-times-circle"></i>
                <span>Clear Selection</span>
              </button>
            </div>
          </div>

          <div className="glass rounded-panel p-6 cursor-move">
            <ExoplanetVisualization3D data={selectedExoplanet} dataType={dataType} />
          </div>
        </div>
      )}

      {/* Example Exoplanets */}
      {showExamples && !hasSelection && (
        <div className="mb-8 space-y-6">
          <div className="glass rounded-panel p-8">
            <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
              <div>
                <p className="text-eyebrow uppercase text-ink-tertiary mb-2">TESS Mission Discovery</p>
                <h2 className="font-display text-xl font-semibold text-ink flex items-center gap-2.5">
                  <i className="fas fa-rocket text-stellar-400 text-base"></i>
                  TOI-700 d — Potentially Habitable
                </h2>
              </div>
              <span className="px-3.5 py-1.5 bg-stellar-400/12 text-stellar-300 border border-stellar-400/25 rounded-pill text-sm font-medium">
                <i className="fas fa-satellite mr-2"></i>TESS
              </span>
            </div>
            <div className="cursor-move">
              <ExoplanetVisualization3D data={sampleTessData} dataType="tess" />
            </div>
          </div>

          <div className="glass rounded-panel p-8">
            <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
              <div>
                <p className="text-eyebrow uppercase text-ink-tertiary mb-2">Kepler Mission Discovery</p>
                <h2 className="font-display text-xl font-semibold text-ink flex items-center gap-2.5">
                  <i className="fas fa-globe text-nebula-400 text-base"></i>
                  Kepler-186 f — First Earth-sized in Habitable Zone
                </h2>
              </div>
              <span className="px-3.5 py-1.5 bg-nebula-500/14 text-nebula-300 border border-nebula-400/25 rounded-pill text-sm font-medium">
                <i className="fas fa-telescope mr-2"></i>Kepler
              </span>
            </div>
            <div className="cursor-move">
              <ExoplanetVisualization3D data={sampleKeplerData} dataType="kepler" />
            </div>
          </div>
        </div>
      )}

      {/* Placeholder message when no exoplanet is selected */}
      {!hasSelection && !showExamples && (
        <div className="glass rounded-panel bg-nebula-veil p-16 text-center mb-8">
          <div className="text-nebula-400/70 mb-6">
            <i className="fas fa-rocket text-8xl"></i>
          </div>
          <h3 className="font-display text-2xl font-semibold gradient-text mb-4">
            No Exoplanet Selected
          </h3>
          <p className="text-ink-secondary mb-8 max-w-2xl mx-auto">
            Navigate to the <span className="text-stellar-300 font-medium">Exoplanets</span> page to select exoplanets and visualize them in 3D
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setShowExamples(true)}
              className="btn-space btn-primary"
            >
              <i className="fas fa-star"></i>
              <span>Show Example Exoplanets</span>
            </button>
          </div>
        </div>
      )}

      {/* Planet Size Comparison */}
      <div className="mb-8">
        <div className="glass rounded-panel overflow-hidden planet-size-comparison-container">
          <div className="p-6 border-b border-hairline">
            <div className="flex justify-between items-start gap-4 flex-wrap">
              <div>
                <h2 className="font-display text-xl font-semibold text-ink flex items-center gap-2.5">
                  <i className="fas fa-balance-scale text-stellar-400 text-base"></i>
                  Planet Size Comparison
                </h2>
                <p className="text-sm text-ink-tertiary mt-1">
                  {hasSelection
                    ? 'Compare your analyzed exoplanet sizes to Earth'
                    : 'Compare exoplanet sizes to planets in our solar system'}
                </p>
              </div>
              <button
                onClick={downloadPlanetSizeImage}
                disabled={downloadingImage}
                className="btn-space btn-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                title="Download as PNG image"
              >
                {downloadingImage ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>Downloading...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-download"></i>
                    <span>Download Image</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="p-10 bg-void-900/20">
            {hasSelection ? (
              // Dynamic comparison with analyzed planets
              <>
                <DynamicPlanetComparison 
                  planets={
                    isMultipleMode 
                      ? selectedExoplanets.map(planet => ({
                          name: dataType === 'kepler' 
                            ? (planet.kepler_name || planet.kepoi_name || `KOI-${planet.kepid}`)
                            : (planet.pl_name || `TOI-${planet.toi_id || planet.toi}`),
                          radius: dataType === 'kepler' 
                            ? (planet.koi_prad || 0)
                            : (planet.pl_rade || 0),
                          id: planet.id
                        })).filter(p => p.radius > 0) // Only show planets with valid radius data
                      : selectedExoplanet 
                        ? [{
                            name: dataType === 'kepler' 
                              ? (selectedExoplanet.kepler_name || selectedExoplanet.kepoi_name || `KOI-${selectedExoplanet.kepid}`)
                              : (selectedExoplanet.pl_name || `TOI-${selectedExoplanet.toi_id || selectedExoplanet.toi}`),
                            radius: dataType === 'kepler' 
                              ? (selectedExoplanet.koi_prad || 0)
                              : (selectedExoplanet.pl_rade || 0),
                            id: selectedExoplanet.id
                          }].filter(p => p.radius > 0)
                        : []
                  }
                />
                <PlanetSizeLegend />
              </>
            ) : (
              // Static examples when no planets selected
              <>
                <div className="flex items-end justify-center h-72 gap-8">
                  <PlanetCircle size="w-8 h-8" color={getPlanetHue(1.0)} name="Earth" radius={1.0} />
                  <PlanetCircle size="w-16 h-16" color={getPlanetHue(1.38)} name="HD 209458 b" radius={1.38} />
                  <PlanetCircle size="w-32 h-32" color={getPlanetHue(1.99)} name="WASP-17b" radius={1.99} />
                  <PlanetCircle size="w-6 h-6" color={getPlanetHue(0.92)} name="TRAPPIST-1e" radius={0.92} />
                </div>
                <PlanetSizeLegend />
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Orbital Period Chart */}
      <div className="glass rounded-panel overflow-hidden mb-8">
        <div className="p-6 border-b border-hairline">
          <h2 className="font-display text-xl font-semibold text-ink flex items-center gap-2.5">
            <i className="fas fa-chart-bar text-stellar-400 text-base"></i>
            Orbital Period Distribution
          </h2>
          <p className="text-sm text-ink-tertiary mt-1">
            {hasSelection
              ? `Distribution of orbital periods for your ${isMultipleMode ? selectedExoplanets.length : 'selected'} exoplanet${isMultipleMode && selectedExoplanets.length > 1 ? 's' : ''}`
              : 'Distribution of orbital periods for confirmed exoplanets'}
          </p>
        </div>
        <div className="p-8">
          <OrbitalPeriodChart 
            planets={isMultipleMode ? selectedExoplanets : (selectedExoplanet ? [selectedExoplanet] : undefined)}
            dataType={dataType}
          />
        </div>
      </div>
      
      {/* Discovery Method Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass rounded-panel overflow-hidden">
          <div className="p-6 border-b border-hairline">
            <h2 className="font-display text-xl font-semibold text-ink flex items-center gap-2.5">
              <i className="fas fa-microscope text-stellar-400 text-base"></i>
              Discovery Methods
            </h2>
            <p className="text-sm text-ink-tertiary mt-1">
              {hasSelection
                ? `Discovery methods for your ${isMultipleMode ? selectedExoplanets.length : 'selected'} exoplanet${isMultipleMode && selectedExoplanets.length > 1 ? 's' : ''}`
                : 'Breakdown of exoplanet discovery methods'}
            </p>
          </div>
          <div className="p-8">
            <DiscoveryMethodChart 
              planets={isMultipleMode ? selectedExoplanets : (selectedExoplanet ? [selectedExoplanet] : undefined)}
              dataType={dataType}
            />
          </div>
        </div>

        {/* Star Type Distribution */}
        <div className="glass rounded-panel overflow-hidden">
          <div className="p-6 border-b border-hairline">
            <h2 className="font-display text-xl font-semibold text-ink flex items-center gap-2.5">
              <i className="fas fa-sun text-stellar-400 text-base"></i>
              Host Star Types
            </h2>
            <p className="text-sm text-ink-tertiary mt-1">
              {hasSelection
                ? 'Star type classification of your selected exoplanets'
                : 'Distribution of star types hosting confirmed exoplanets'}
            </p>
          </div>
          <div className="p-8">
            {hasSelection && dataType ? (
              <StarTypeChart
                planets={
                  isMultipleMode
                    ? selectedExoplanets
                    : (selectedExoplanet ? [selectedExoplanet] : [])
                }
                dataType={dataType}
              />
            ) : (
              <div className="h-80 bg-void-900/30 rounded-card p-6 border border-hairline flex items-center justify-center">
                <div className="text-center text-ink-tertiary">
                  <i className="fas fa-star text-6xl mb-4 opacity-30"></i>
                  <p className="text-lg font-medium text-ink-secondary">No star data available</p>
                  <p className="text-sm mt-2">Select exoplanets from the Exoplanets page to analyze their host stars</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Visualizations;