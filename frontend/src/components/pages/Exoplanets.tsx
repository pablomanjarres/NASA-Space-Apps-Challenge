import React, { useState, useEffect, useContext } from 'react';
import type { SpaceData } from '../../services/api';
import { ThemeContext } from '../ThemeContext';
import { useExoplanet } from '../../contexts/ExoplanetContext';
import { PageContext } from '../DashboardLayoutComponent';
import { dataLoader } from '../../services/dataLoader';

interface ColumnConfig {
  key: keyof SpaceData;
  label: string;
  visible?: boolean;
  essential: boolean;
  requiredForModel?: boolean;
  type: 'text' | 'number' | 'badge';
  unit?: string;
  description?: string;
}

// Statistics Card Component
type StatTone = 'neutral' | 'stellar' | 'nebula' | 'muted';
interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: StatTone;
}

const STAT_TONES: Record<StatTone, { value: string; chip: string }> = {
  neutral: { value: 'text-ink', chip: 'text-stellar-300 bg-stellar-400/10 border-stellar-400/20' },
  stellar: { value: 'text-stellar-300', chip: 'text-stellar-300 bg-stellar-400/10 border-stellar-400/20' },
  nebula: { value: 'text-nebula-300', chip: 'text-nebula-300 bg-nebula-500/12 border-nebula-400/20' },
  muted: { value: 'text-ink-tertiary', chip: 'text-ink-tertiary bg-void-600/40 border-hairline' },
};

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, tone }) => {
  const t = STAT_TONES[tone];
  return (
    <div className="glass card-hover rounded-card p-5 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-eyebrow uppercase text-ink-tertiary mb-2">{label}</p>
        <p className={`font-mono text-3xl font-semibold tabular-nums ${t.value}`}>{value}</p>
      </div>
      <div className={`w-11 h-11 shrink-0 rounded-control border grid place-items-center ${t.chip}`}>
        {icon}
      </div>
    </div>
  );
};

// Pagination Controls Component
interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({ currentPage, totalPages, totalItems, onPreviousPage, onNextPage }) => (
  <div className="px-6 py-4 border-t border-hairline bg-void-900/30">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <button
          onClick={onPreviousPage}
          disabled={currentPage === 1}
          className="btn-space btn-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <i className="fas fa-chevron-left"></i>Previous
        </button>
        <span className="text-sm text-ink-secondary bg-surface-raised border border-hairline px-4 py-2 rounded-control">
          Page <span className="font-mono text-ink tabular-nums">{currentPage}</span> of <span className="font-mono text-ink tabular-nums">{totalPages}</span>
        </span>
        <button
          onClick={onNextPage}
          disabled={currentPage === totalPages}
          className="btn-space btn-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next<i className="fas fa-chevron-right"></i>
        </button>
      </div>
      <div className="text-sm text-ink-tertiary bg-surface border border-hairline px-4 py-2 rounded-control">
        <i className="fas fa-globe mr-2 text-stellar-400"></i>Total: <span className="font-mono text-ink-secondary tabular-nums">{totalItems}</span> exoplanets
      </div>
    </div>
  </div>
);

// Column Setting Item Component
interface ColumnSettingItemProps {
  column: ColumnConfig;
  onToggle: (key: keyof SpaceData) => void;
}

const ColumnSettingItem: React.FC<ColumnSettingItemProps> = ({ column, onToggle }) => (
  <div className="flex items-start space-x-3">
    <input
      type="checkbox"
      id={column.key}
      checked={column.visible}
      onChange={() => onToggle(column.key)}
      className="mt-1 h-4 w-4 accent-stellar-400 rounded"
    />
    <div className="flex-1">
      <label htmlFor={column.key} className="text-sm font-medium text-ink cursor-pointer flex items-center gap-2">
        {column.label}
        {column.essential && <span className="text-stellar-400" title="Essential column">*</span>}
        {column.requiredForModel && <span className="text-eyebrow px-1.5 py-0.5 bg-nebula-500/12 text-nebula-300 border border-nebula-400/20 rounded font-mono" title="Required for 3D visualization">3D</span>}
      </label>
      <p className="text-xs text-ink-tertiary mt-1">{column.description}</p>
    </div>
  </div>
);

export default function Exoplanets() {
  const { darkMode } = useContext(ThemeContext);
  const { setSelectedExoplanet, selectedExoplanets, setSelectedExoplanets } = useExoplanet();
  const { setActivePage } = useContext(PageContext);
  const [datasets, setDatasets] = useState<SpaceData[]>([]);
  const [filteredData, setFilteredData] = useState<SpaceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dispositionFilter, setDispositionFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState<{ key: keyof SpaceData; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [view3D, setView3D] = useState(false);
  const [selectedPlanets, setSelectedPlanets] = useState<Set<string | number>>(new Set());
  const [datasetType, setDatasetType] = useState<'kepler' | 'tess'>('kepler');
  
  // Selection limit to prevent performance issues
  const MAX_SELECTION_LIMIT = 100;

  // Kepler Column configuration (based on actual CSV columns)
  const keplerColumns: ColumnConfig[] = [
    { key: 'kepid', label: 'Kepler ID', visible: true, essential: true, requiredForModel: false, type: 'number', description: 'Unique Kepler identifier' },
    { key: 'kepler_name', label: 'Planet Name', visible: true, essential: true, requiredForModel: false, type: 'text', description: 'Official Kepler planet designation' },
    { key: 'koi_disposition', label: 'Archive Disposition', visible: true, essential: true, requiredForModel: false, type: 'badge', description: 'Exoplanet Archive Disposition' },
    { key: 'koi_pdisposition', label: 'Kepler Disposition', visible: false, essential: false, requiredForModel: false, type: 'badge', description: 'Disposition Using Kepler Data' },
    { key: 'koi_score', label: 'Disposition Score', visible: false, essential: false, requiredForModel: false, type: 'number', description: 'Disposition Score' },
    { key: 'koi_fpflag_nt', label: 'FP: Not Transit', visible: false, essential: false, requiredForModel: false, type: 'number', description: 'Not Transit-Like False Positive Flag' },
    { key: 'koi_fpflag_ss', label: 'FP: Stellar Eclipse', visible: false, essential: false, requiredForModel: false, type: 'number', description: 'Stellar Eclipse False Positive Flag' },
    { key: 'koi_fpflag_co', label: 'FP: Centroid Offset', visible: false, essential: false, requiredForModel: false, type: 'number', description: 'Centroid Offset False Positive Flag' },
    { key: 'koi_fpflag_ec', label: 'FP: Ephemeris', visible: false, essential: false, requiredForModel: false, type: 'number', description: 'Ephemeris Match False Positive Flag' },
    { key: 'koi_period', label: 'Orbital Period', visible: true, essential: false, requiredForModel: true, type: 'number', unit: 'days', description: 'Orbital Period (Required for 3D model)' },
    { key: 'koi_impact', label: 'Impact Parameter', visible: false, essential: false, requiredForModel: false, type: 'number', description: 'Impact Parameter' },
    { key: 'koi_duration', label: 'Transit Duration', visible: false, essential: false, requiredForModel: false, type: 'number', unit: 'hrs', description: 'Transit Duration' },
    { key: 'koi_depth', label: 'Transit Depth', visible: false, essential: false, requiredForModel: false, type: 'number', unit: 'ppm', description: 'Transit Depth' },
    { key: 'koi_prad', label: 'Planet Radius', visible: true, essential: false, requiredForModel: true, type: 'number', unit: 'R⊕', description: 'Planetary Radius (Required for 3D model)' },
    { key: 'koi_teq', label: 'Equilibrium Temp', visible: true, essential: false, requiredForModel: true, type: 'number', unit: 'K', description: 'Equilibrium Temperature (Required for 3D model)' },
    { key: 'koi_insol', label: 'Insolation Flux', visible: true, essential: false, requiredForModel: false, type: 'number', unit: 'S⊕', description: 'Insolation Flux' },
    { key: 'koi_model_snr', label: 'Transit SNR', visible: false, essential: false, requiredForModel: false, type: 'number', description: 'Transit Signal-to-Noise' },
    { key: 'koi_tce_plnt_num', label: 'TCE Planet #', visible: false, essential: false, requiredForModel: false, type: 'number', description: 'TCE Planet Number' },
    { key: 'koi_steff', label: 'Stellar Temp', visible: true, essential: false, requiredForModel: false, type: 'number', unit: 'K', description: 'Stellar Effective Temperature' },
    { key: 'koi_slogg', label: 'Surface Gravity', visible: false, essential: false, requiredForModel: false, type: 'number', unit: 'log10(cm/s²)', description: 'Stellar Surface Gravity' },
    { key: 'koi_srad', label: 'Stellar Radius', visible: true, essential: false, requiredForModel: false, type: 'number', unit: 'R☉', description: 'Stellar Radius' },
    { key: 'ra', label: 'Right Ascension', visible: false, essential: false, requiredForModel: false, type: 'number', unit: '°', description: 'Right Ascension' },
    { key: 'dec', label: 'Declination', visible: false, essential: false, requiredForModel: false, type: 'number', unit: '°', description: 'Declination' },
    { key: 'koi_kepmag', label: 'Kepler Magnitude', visible: false, essential: false, requiredForModel: false, type: 'number', unit: 'mag', description: 'Kepler-band Magnitude' },
  ];

  // TESS Column configuration (based on actual TESS TOI CSV structure)
  const tessColumns: ColumnConfig[] = [
    { key: 'toi', label: 'TOI', visible: true, essential: true, requiredForModel: false, type: 'number', description: 'TESS Object of Interest number' },
    { key: 'tid', label: 'TIC ID', visible: true, essential: true, requiredForModel: false, type: 'number', description: 'TESS Input Catalog ID' },
    { key: 'tfopwg_disp', label: 'Disposition', visible: true, essential: true, requiredForModel: false, type: 'badge', description: 'TFOPWG disposition (CP=Community Planet, KP=Known Planet, FP=False Positive)' },
    { key: 'rastr', label: 'RA (sexagesimal)', visible: true, essential: false, requiredForModel: false, type: 'text', description: 'Right ascension in sexagesimal format' },
    { key: 'decstr', label: 'Dec (sexagesimal)', visible: true, essential: false, requiredForModel: false, type: 'text', description: 'Declination in sexagesimal format' },
    { key: 'ra', label: 'Right Ascension', visible: true, essential: false, requiredForModel: false, type: 'number', unit: '°', description: 'Right ascension coordinate' },
    { key: 'dec', label: 'Declination', visible: true, essential: false, requiredForModel: false, type: 'number', unit: '°', description: 'Declination coordinate' },
    { key: 'pl_orbper', label: 'Orbital Period', visible: true, essential: false, requiredForModel: true, type: 'number', unit: 'days', description: 'Planet orbital period (Required for 3D model)' },
    { key: 'pl_rade', label: 'Planet Radius', visible: true, essential: false, requiredForModel: true, type: 'number', unit: 'R⊕', description: 'Planet radius in Earth radii (Required for 3D model)' },
    { key: 'pl_eqt', label: 'Equilibrium Temp', visible: true, essential: false, requiredForModel: true, type: 'number', unit: 'K', description: 'Planet equilibrium temperature (Required for 3D model)' },
    { key: 'pl_insol', label: 'Insolation Flux', visible: true, essential: false, requiredForModel: false, type: 'number', unit: 'S⊕', description: 'Stellar flux received by planet' },
    { key: 'pl_trandep', label: 'Transit Depth', visible: true, essential: false, requiredForModel: false, type: 'number', unit: 'ppm', description: 'Transit depth in parts per million' },
    { key: 'pl_trandurh', label: 'Transit Duration', visible: true, essential: false, requiredForModel: false, type: 'number', unit: 'hrs', description: 'Transit duration in hours' },
    { key: 'st_rad', label: 'Stellar Radius', visible: true, essential: false, requiredForModel: true, type: 'number', unit: 'R☉', description: 'Stellar radius in solar radii (Required for 3D model)' },
    { key: 'st_teff', label: 'Stellar Temp', visible: true, essential: false, requiredForModel: true, type: 'number', unit: 'K', description: 'Stellar effective temperature (Required for 3D model)' },
    { key: 'st_logg', label: 'Stellar log(g)', visible: false, essential: false, requiredForModel: false, type: 'number', unit: 'log10(cm/s²)', description: 'Stellar surface gravity' },
    { key: 'st_dist', label: 'Distance', visible: true, essential: false, requiredForModel: false, type: 'number', unit: 'pc', description: 'Distance to system in parsecs' },
    { key: 'st_tmag', label: 'TESS Magnitude', visible: false, essential: false, requiredForModel: false, type: 'number', description: 'TESS bandpass magnitude' },
    { key: 'toi_created', label: 'TOI Created', visible: false, essential: false, requiredForModel: false, type: 'text', description: 'Date TOI was created' },
    { key: 'rowupdate', label: 'Last Update', visible: false, essential: false, requiredForModel: false, type: 'text', description: 'Date of last row update' },
  ];

  // Column configuration
  const [columns, setColumns] = useState<ColumnConfig[]>(keplerColumns);

  useEffect(() => {
    fetchData();
    // Reset disposition filter when dataset type changes
    setDispositionFilter('ALL');
  }, [datasetType]);

  useEffect(() => {
    filterAndSortData();
  }, [datasets, searchTerm, dispositionFilter, sortConfig]);

  useEffect(() => {
    // Switch columns when dataset type changes
    setColumns(datasetType === 'kepler' ? keplerColumns : tessColumns);
  }, [datasetType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🚀 Loading ${datasetType.toUpperCase()} data with progressive strategy...`);

      // Use progressive loading for instant UI
      const initialData = await dataLoader.loadProgressively(datasetType, (progress) => {
        console.log(
          `📊 Progress: ${progress.loaded}/${progress.total} chunks (${progress.percentage}%) ${progress.fromCache ? '💾 cached' : '📥 downloading'}`
        );
      });

      // Add unique IDs to each entry if not present
      // IMPORTANT: Use composite ID (kepid+name or toi+name) to handle multiple planets in same system
      // e.g., Kepler-227 b and Kepler-227 c share same kepid but have different names
      const dataWithIds = initialData.map((item: any, index: number) => {
        let uniqueId: string | number;
        
        if (item.kepid && item.kepler_name) {
          // For Kepler: combine kepid with planet name to ensure uniqueness
          uniqueId = `${item.kepid}-${item.kepler_name.replace(/\s+/g, '')}`;
        } else if (item.toi) {
          // For TESS: toi is already unique per planet
          uniqueId = item.toi;
        } else if (item.tid) {
          uniqueId = item.tid;
        } else if (item.kepid) {
          // Fallback to just kepid if no name available
          uniqueId = item.kepid;
        } else {
          uniqueId = `temp-${index}`;
        }
        
        return {
          ...item,
          id: uniqueId
        };
      });

      setDatasets(dataWithIds as SpaceData[]);
      setLoading(false);

      console.log(`✅ UI ready with ${dataWithIds.length} ${datasetType.toUpperCase()} exoplanets`);
      console.log(`⏳ Remaining data loading in background...`);

      // Background loading happens automatically in loadProgressively()
      // Wait for it to complete and update the dataset
      setTimeout(async () => {
        const allData = await dataLoader.loadAllData(datasetType);
        const allDataWithIds = allData.map((item: any, index: number) => {
          let uniqueId: string | number;
          
          if (item.kepid && item.kepler_name) {
            // For Kepler: combine kepid with planet name to ensure uniqueness
            uniqueId = `${item.kepid}-${item.kepler_name.replace(/\s+/g, '')}`;
          } else if (item.toi) {
            // For TESS: toi is already unique per planet
            uniqueId = item.toi;
          } else if (item.tid) {
            uniqueId = item.tid;
          } else if (item.kepid) {
            // Fallback to just kepid if no name available
            uniqueId = item.kepid;
          } else {
            uniqueId = `temp-${index}`;
          }
          
          return {
            ...item,
            id: uniqueId
          };
        });
        setDatasets(allDataWithIds as SpaceData[]);
        console.log(`✅ Full dataset loaded: ${allDataWithIds.length} total exoplanets`);
        // Selected planets are preserved because IDs are now stable (composite kepid+name)
      }, 500);

    } catch (err) {
      console.error('Error loading dataset:', err);
      setError(`Failed to load ${datasetType.toUpperCase()} dataset. Check network connection.`);
      setDatasets([]);
      setLoading(false);
    }
  };

  const filterAndSortData = () => {
    let filtered = datasets.filter(item => {
      // For TESS data, filter out entries without essential data (TOI, TIC ID, or DISPOSITION)
      if (datasetType === 'tess') {
        const hasEssentialData = item.toi || item.tid || item.tfopwg_disp;
        if (!hasEssentialData) {
          return false;
        }
      }

      // Search functionality - adapt for both Kepler and TESS data
      let matchesSearch = false;
      if (!searchTerm) {
        matchesSearch = true;
      } else {
        const searchLower = searchTerm.toLowerCase();
        if (datasetType === 'kepler') {
          matchesSearch = Boolean((item.kepler_name && item.kepler_name.toLowerCase().includes(searchLower)) ||
                                 (item.kepid && item.kepid.toString().includes(searchTerm)));
        } else {
          // For TESS data, search by coordinates, stellar properties, or description
          matchesSearch = Boolean((item.ra && item.ra.toString().includes(searchTerm)) ||
                                 (item.dec && item.dec.toString().includes(searchTerm)) ||
                                 (item.st_teff && item.st_teff.toString().includes(searchTerm)) ||
                                 (item.description && item.description.toLowerCase().includes(searchLower)));
        }
      }

      // Filter by disposition - for both Kepler and TESS data
      let matchesDisposition = true;
      if (dispositionFilter !== 'ALL') {
        if (datasetType === 'kepler') {
          matchesDisposition = item.koi_disposition === dispositionFilter;
        } else {
          // For TESS data, use tfopwg_disp field
          matchesDisposition = item.tfopwg_disp === dispositionFilter;
        }
      }

      return matchesSearch && matchesDisposition;
    });

    if (sortConfig) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        // Special handling for orbital period to use logarithmic grouping
        // This keeps planets with similar orbital periods together
        const isOrbitalPeriod = sortConfig.key === 'koi_period' || sortConfig.key === 'pl_orbper';

        let comparison;
        if (isOrbitalPeriod && typeof aVal === 'number' && typeof bVal === 'number') {
          // Use logarithmic scale for better grouping of orbital periods
          // This prevents planets with 5 days from being next to 150 days
          const aLog = Math.log10(Math.max(aVal, 0.1));
          const bLog = Math.log10(Math.max(bVal, 0.1));
          comparison = aLog < bLog ? -1 : aLog > bLog ? 1 : 0;
        } else {
          // Standard comparison for other fields
          comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        }

        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    setFilteredData(filtered);
    setCurrentPage(1);
  };

  const handleSort = (key: keyof SpaceData) => {
    setSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const toggleColumnVisibility = (key: keyof SpaceData) => {
    setColumns(prev => prev.map(col => 
      col.key === key ? { ...col, visible: !col.visible } : col
    ));
  };

  const showEssentialOnly = () => {
    setColumns(prev => prev.map(col => ({ ...col, visible: col.essential })));
  };

  const showAllColumns = () => {
    setColumns(prev => prev.map(col => ({ ...col, visible: true })));
  };

  const showModelRequired = () => {
    setColumns(prev => prev.map(col => ({ ...col, visible: col.essential || col.requiredForModel })));
  };

  const handleView3D = (exoplanet: SpaceData) => {
    console.log('🎯 handleView3D called with:', {
      exoplanet,
      datasetType,
      hasSetSelectedExoplanet: !!setSelectedExoplanet,
      hasSetActivePage: !!setActivePage
    });
    setSelectedExoplanet(exoplanet, datasetType);
    console.log('✅ setSelectedExoplanet called');
    setActivePage('visualizations');
    console.log('✅ setActivePage called with: visualizations');
  };

  const handleToggleSelect = (planet: SpaceData) => {
    setSelectedPlanets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(planet.id)) {
        // Always allow deselection
        newSet.delete(planet.id);
      } else {
        // Check limit before adding
        if (newSet.size >= MAX_SELECTION_LIMIT) {
          alert(`⚠️ Selection limit reached! You can select up to ${MAX_SELECTION_LIMIT} planets for optimal performance.`);
          return prev;
        }
        newSet.add(planet.id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedPlanets.size === paginatedData.length) {
      // Deselect all
      setSelectedPlanets(new Set());
    } else {
      // Select all on current page, respecting the limit
      const planetsToAdd = paginatedData.map(p => p.id);
      const newSet = new Set(selectedPlanets);
      
      let added = 0;
      for (const id of planetsToAdd) {
        if (!newSet.has(id)) {
          if (newSet.size >= MAX_SELECTION_LIMIT) {
            alert(`⚠️ Selection limit reached! You can select up to ${MAX_SELECTION_LIMIT} planets. ${added} planets were added.`);
            break;
          }
          newSet.add(id);
          added++;
        }
      }
      
      setSelectedPlanets(newSet);
    }
  };

  const handleViewMultiple3D = () => {
    const selected = datasets.filter(planet => selectedPlanets.has(planet.id));
    console.log('🔍 Debug Selection:', {
      selectedPlanetsSet: Array.from(selectedPlanets),
      selectedPlanetsCount: selectedPlanets.size,
      filteredPlanets: selected.map(p => ({ id: p.id, name: p.kepler_name || p.toi })),
      filteredCount: selected.length,
      totalDatasets: datasets.length
    });
    console.log('📊 handleViewMultiple3D called with:', {
      selectedCount: selected.length,
      datasetType,
      hasSetSelectedExoplanets: !!setSelectedExoplanets,
      hasSetActivePage: !!setActivePage
    });
    setSelectedExoplanets(selected, datasetType);
    console.log('✅ setSelectedExoplanets called');
    setActivePage('visualizations');
    console.log('✅ setActivePage called with: visualizations');
  };

  const renderBadge = (disposition: string) => {
    // Status mapped into the cosmic palette: verified → stellar, candidate → nebula,
    // false positive → de-emphasized (muted). Amber stays reserved for CTAs.
    const stellar = 'bg-stellar-400/12 text-stellar-300 border-stellar-400/25';
    const nebula = 'bg-nebula-500/14 text-nebula-300 border-nebula-400/25';
    const muted = 'bg-void-600/50 text-ink-tertiary border-hairline';
    const badgeClasses = {
      // Kepler dispositions
      'CONFIRMED': stellar,
      'CANDIDATE': nebula,
      'FALSE POSITIVE': muted,
      // TESS dispositions
      'CP': nebula, // Community Planet
      'KP': stellar, // Known Planet
      'FP': muted   // False Positive
    };

    const badgeLabels = {
      'CP': 'Community Planet',
      'KP': 'Known Planet',
      'FP': 'False Positive'
    };

    const displayLabel = badgeLabels[disposition as keyof typeof badgeLabels] || disposition;

    return (
      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-pill border ${
        badgeClasses[disposition as keyof typeof badgeClasses] || muted
      }`}>
        {displayLabel}
      </span>
    );
  };

  const formatValue = (value: any, column: ColumnConfig) => {
    if (value == null) return 'N/A';
    
    if (column.type === 'badge') {
      return renderBadge(value);
    }
    
    if (column.type === 'number' && typeof value === 'number') {
      const formatted = value.toFixed(value < 1 ? 4 : 2);
      return column.unit ? `${formatted} ${column.unit}` : formatted;
    }
    
    return value;
  };

  const visibleColumns = columns.filter(col => col.visible);
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  return (
    <div className="p-6 min-h-screen">
      <div className="max-w-full mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <p className="text-eyebrow uppercase text-stellar-400 mb-2">Mission Archive</p>
            <h1 className="font-display text-display-lg font-semibold gradient-text mb-2">
              Exoplanets Explorer
            </h1>
            <p className="text-ink-secondary">Explore and analyze confirmed and candidate exoplanets from {datasetType === 'kepler' ? 'Kepler' : 'TESS'} mission</p>
            {error && error.includes('demo data') && (
              <div className="mt-2 text-sm text-stellar-300 bg-stellar-400/10 border border-stellar-400/20 px-3 py-1.5 rounded-control">
                Currently showing demo data — start the backend server to access real dataset
              </div>
            )}
            {/* Dataset Selector */}
            <div className="mt-4 flex items-center gap-3">
              <span className="text-eyebrow uppercase text-ink-tertiary">Dataset</span>
              <div className="inline-flex gap-1 p-1 rounded-control bg-surface-sunken border border-hairline">
                <button
                  onClick={() => setDatasetType('kepler')}
                  className={`btn-space text-sm px-4 py-1.5 rounded-[7px] ${
                    datasetType === 'kepler'
                      ? 'bg-stellar-400/15 text-stellar-200 border border-stellar-400/30'
                      : 'text-ink-secondary border border-transparent hover:text-ink hover:bg-surface-raised'
                  }`}
                >
                  <i className="fas fa-satellite"></i>
                  <span>Kepler</span>
                </button>
                <button
                  onClick={() => setDatasetType('tess')}
                  className={`btn-space text-sm px-4 py-1.5 rounded-[7px] ${
                    datasetType === 'tess'
                      ? 'bg-nebula-500/18 text-nebula-200 border border-nebula-400/30'
                      : 'text-ink-secondary border border-transparent hover:text-ink hover:bg-surface-raised'
                  }`}
                >
                  <i className="fas fa-rocket"></i>
                  <span>TESS</span>
                </button>
              </div>
            </div>
            {/* Multi-select hint with selection limit warnings */}
            {selectedPlanets.size >= MAX_SELECTION_LIMIT ? (
              // At limit - hard stop alert (signal amber)
              <div className="mt-3 flex items-center gap-2.5 text-sm bg-signal-500/10 px-4 py-2 rounded-control border border-signal-500/30">
                <svg className="w-5 h-5 shrink-0 text-signal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-signal-300">
                  Maximum limit reached — <span className="font-mono tabular-nums">{selectedPlanets.size}/{MAX_SELECTION_LIMIT}</span> planets. Deselect some to add more.
                </span>
              </div>
            ) : selectedPlanets.size >= 80 ? (
              // Approaching limit - warning (signal amber, exclusive with the above)
              <div className="mt-3 flex items-center gap-2.5 text-sm bg-signal-500/8 px-4 py-2 rounded-control border border-signal-500/20">
                <svg className="w-5 h-5 shrink-0 text-signal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-ink-secondary">
                  Approaching limit: <span className="font-mono tabular-nums text-signal-300">{selectedPlanets.size}/{MAX_SELECTION_LIMIT}</span> selected. Consider selecting fewer for optimal performance.
                </span>
              </div>
            ) : (
              // Normal tip message (stellar, informational)
              <div className="mt-3 flex items-center gap-2.5 text-sm bg-stellar-400/8 px-4 py-2 rounded-control border border-stellar-400/20">
                <svg className="w-5 h-5 shrink-0 text-stellar-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-ink-secondary">
                  Tip: select multiple exoplanets with the checkboxes to compare them all in 3D (up to <span className="font-mono tabular-nums text-ink">{MAX_SELECTION_LIMIT}</span> for best performance).
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {selectedPlanets.size > 0 && (
              <button
                onClick={handleViewMultiple3D}
                className="btn-space btn-primary"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                </svg>
                <span>View <span className="font-mono tabular-nums">{selectedPlanets.size}</span> {selectedPlanets.size === 1 ? 'Planet' : 'Planets'} in 3D</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            )}
            <button
              onClick={() => setShowColumnSettings(!showColumnSettings)}
              className="btn-space btn-secondary"
            >
              <i className="fas fa-columns"></i>
              <span>Column Settings</span>
            </button>
          </div>
        </div>
        {/* Column Settings Panel */}
        {showColumnSettings && (
          <div className="glass rounded-panel p-6 mb-6">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
              <h3 className="font-display text-lg font-semibold text-ink flex items-center gap-2">
                <i className="fas fa-sliders-h text-stellar-400"></i>Column Settings
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={showEssentialOnly}
                  className="px-3 py-1.5 text-sm rounded-control bg-surface border border-hairline text-ink-secondary hover:text-ink hover:border-hairline-strong transition-colors"
                >
                  Essential Only
                </button>
                <button
                  onClick={showModelRequired}
                  className="px-3 py-1.5 text-sm rounded-control bg-nebula-500/12 border border-nebula-400/25 text-nebula-200 hover:bg-nebula-500/20 transition-colors flex items-center gap-1.5"
                  title="Show columns required for 3D visualization"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                  </svg>
                  3D Model Columns
                </button>
                <button
                  onClick={showAllColumns}
                  className="px-3 py-1.5 text-sm rounded-control bg-surface border border-hairline text-ink-secondary hover:text-ink hover:border-hairline-strong transition-colors"
                >
                  Show All
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {columns.map(column => (
                <ColumnSettingItem key={column.key} column={column} onToggle={toggleColumnVisibility} />
              ))}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="glass rounded-panel p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-eyebrow uppercase text-ink-tertiary mb-2">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={datasetType === 'kepler' ? "Search by name or Kepler ID..." : "Search by coordinates, temperature, or description..."}
                className="w-full px-3 py-2 rounded-control bg-surface-sunken border border-hairline text-ink placeholder:text-ink-tertiary focus:outline-none focus:border-stellar-400 focus:ring-1 focus:ring-stellar-400/40 transition-colors"
              />
            </div>
            <div>
              <label className="block text-eyebrow uppercase text-ink-tertiary mb-2">
                Status Filter
              </label>
              <select
                value={dispositionFilter}
                onChange={(e) => setDispositionFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-control bg-surface-sunken border border-hairline text-ink focus:outline-none focus:border-stellar-400 focus:ring-1 focus:ring-stellar-400/40 transition-colors"
                title="Filter by status"
              >
                {datasetType === 'kepler' ? (
                  <>
                    <option value="ALL">All Status</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="CANDIDATE">Candidate</option>
                    <option value="FALSE POSITIVE">False Positive</option>
                  </>
                ) : (
                  <>
                    <option value="ALL">All Status</option>
                    <option value="CP">Community Planet (CP)</option>
                    <option value="KP">Known Planet (KP)</option>
                    <option value="FP">False Positive (FP)</option>
                    <option value="APC">Ambiguous Planet Candidate (APC)</option>
                    <option value="PC">Planet Candidate (PC)</option>
                    <option value="FA">False Alarm (FA)</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-eyebrow uppercase text-ink-tertiary mb-2">
                Sort By
              </label>
              <select
                value={sortConfig?.key || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    handleSort(e.target.value as keyof SpaceData);
                  } else {
                    setSortConfig(null);
                  }
                }}
                className="w-full px-3 py-2 rounded-control bg-surface-sunken border border-hairline text-ink focus:outline-none focus:border-stellar-400 focus:ring-1 focus:ring-stellar-400/40 transition-colors"
                title="Sort by column"
              >
                <option value="">No Sorting</option>
                {visibleColumns.map(col => (
                  <option key={col.key} value={col.key}>{col.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-eyebrow uppercase text-ink-tertiary mb-2">
                Sort Direction
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => sortConfig && setSortConfig({ ...sortConfig, direction: 'asc' })}
                  disabled={!sortConfig}
                  className={`flex-1 px-3 py-2 rounded-control font-medium transition-colors flex items-center justify-center gap-2 ${
                    sortConfig?.direction === 'asc'
                      ? 'bg-stellar-400/15 text-stellar-200 border border-stellar-400/30'
                      : 'bg-surface border border-hairline text-ink-secondary hover:text-ink hover:border-hairline-strong'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                  title="Sort ascending"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  Asc
                </button>
                <button
                  onClick={() => sortConfig && setSortConfig({ ...sortConfig, direction: 'desc' })}
                  disabled={!sortConfig}
                  className={`flex-1 px-3 py-2 rounded-control font-medium transition-colors flex items-center justify-center gap-2 ${
                    sortConfig?.direction === 'desc'
                      ? 'bg-stellar-400/15 text-stellar-200 border border-stellar-400/30'
                      : 'bg-surface border border-hairline text-ink-secondary hover:text-ink hover:border-hairline-strong'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                  title="Sort descending"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Desc
                </button>
              </div>
            </div>
          </div>
          {sortConfig && (
            <div className="mt-4 flex items-center gap-2 text-sm bg-stellar-400/8 px-4 py-2 rounded-control border border-stellar-400/20">
              <svg className="w-5 h-5 shrink-0 text-stellar-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              <span className="text-ink-secondary">
                Sorted by <strong className="text-ink font-medium">{visibleColumns.find(c => c.key === sortConfig.key)?.label}</strong> ({sortConfig.direction === 'asc' ? 'Ascending' : 'Descending'})
              </span>
              <button
                onClick={() => setSortConfig(null)}
                className="ml-auto text-stellar-300 hover:text-stellar-200 font-medium transition-colors"
              >
                Clear Sort
              </button>
            </div>
          )}
        </div>
        {/* Main Data Table */}
        <div className="glass rounded-panel overflow-hidden">
          <div className="p-6 border-b border-hairline">
            <div className="flex justify-between items-center gap-4 flex-wrap">
              <div>
                <h2 className="font-display text-xl font-semibold text-ink flex items-center gap-2.5">
                  <i className="fas fa-table text-stellar-400 text-base"></i>
                  {datasetType === 'kepler' ? 'Kepler' : 'TESS'} Exoplanets Dataset
                </h2>
                <p className="text-sm text-ink-tertiary mt-1">
                  Showing <span className="font-mono text-ink-secondary tabular-nums">{startIndex + 1}-{Math.min(startIndex + pageSize, filteredData.length)}</span> of <span className="font-mono text-ink-secondary tabular-nums">{filteredData.length}</span> entries
                  {datasets.length !== filteredData.length && <span> (filtered from <span className="font-mono tabular-nums">{datasets.length}</span> total)</span>}
                </p>
              </div>
              {error && (
                <div className="text-sm text-signal-300">
                  {error}
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-stellar-400/25 border-t-stellar-400 mx-auto mb-4"></div>
              <p className="text-ink-secondary">Loading exoplanet data...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-void-900/40 border-b border-hairline">
                    <tr>
                      <th className="px-6 py-3.5 text-left">
                        <input
                          type="checkbox"
                          checked={selectedPlanets.size === paginatedData.length && paginatedData.length > 0}
                          onChange={handleSelectAll}
                          className="h-4 w-4 accent-stellar-400 rounded cursor-pointer"
                          title="Select all on this page"
                          aria-label="Select all exoplanets on this page"
                        />
                      </th>
                      {visibleColumns.map(column => (
                        <th
                          key={column.key}
                          onClick={() => handleSort(column.key)}
                          className={`px-6 py-3.5 text-left text-eyebrow uppercase cursor-pointer transition-colors ${
                            sortConfig?.key === column.key
                              ? 'text-stellar-300 bg-stellar-400/8'
                              : 'text-ink-tertiary hover:text-ink-secondary'
                          }`}
                        >
                          <div className="flex items-center space-x-2 group">
                            <span>{column.label}</span>
                            {sortConfig?.key === column.key ? (
                              <svg className={`w-4 h-4 text-stellar-400 transition-transform ${sortConfig.direction === 'asc' ? 'transform rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-ink-tertiary opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                              </svg>
                            )}
                          </div>
                        </th>
                      ))}
                      <th className="px-6 py-3.5 text-left text-eyebrow text-ink-tertiary uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--border)]">
                    {paginatedData.map((item) => (
                      <tr key={item.id} className={`transition-colors duration-150 ${selectedPlanets.has(item.id) ? 'bg-stellar-400/8' : 'hover:bg-surface-raised'}`}>
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedPlanets.has(item.id)}
                            onChange={() => handleToggleSelect(item)}
                            disabled={!selectedPlanets.has(item.id) && selectedPlanets.size >= MAX_SELECTION_LIMIT}
                            className="h-4 w-4 accent-stellar-400 rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label={`Select exoplanet ${item.kepler_name || item.id}`}
                            title={!selectedPlanets.has(item.id) && selectedPlanets.size >= MAX_SELECTION_LIMIT ? `Selection limit reached (${MAX_SELECTION_LIMIT} max)` : 'Toggle selection'}
                          />
                        </td>
                        {visibleColumns.map(column => (
                          <td key={column.key} className="px-6 py-3.5 whitespace-nowrap">
                            <div className={`text-sm text-ink ${column.type === 'number' ? 'font-mono tabular-nums text-ink-secondary' : ''}`}>
                              {formatValue(item[column.key], column)}
                            </div>
                          </td>
                        ))}
                        <td className="px-6 py-3.5 whitespace-nowrap">
                          <button
                            onClick={() => handleView3D(item)}
                            className="btn-space btn-secondary text-sm px-3.5 py-1.5"
                            title="View in 3D"
                          >
                            <i className="fas fa-cube"></i>
                            <span>3D View</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredData.length}
                  onPreviousPage={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  onNextPage={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                />
              )}
            </>
          )}
        </div>
        
        {/* Statistics Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Exoplanets"
            value={datasets.length.toLocaleString()}
            icon={<i className="fas fa-globe text-lg"></i>}
            tone="neutral"
          />

          {datasetType === 'kepler' ? (
            <>
              <StatCard
                label="Confirmed"
                value={datasets.filter(d => d.koi_disposition === 'CONFIRMED').length.toLocaleString()}
                icon={<i className="fas fa-check-circle text-lg"></i>}
                tone="stellar"
              />

              <StatCard
                label="Candidates"
                value={datasets.filter(d => d.koi_disposition === 'CANDIDATE').length.toLocaleString()}
                icon={<i className="fas fa-question-circle text-lg"></i>}
                tone="nebula"
              />

              <StatCard
                label="False Positives"
                value={datasets.filter(d => d.koi_disposition === 'FALSE POSITIVE').length.toLocaleString()}
                icon={<i className="fas fa-times-circle text-lg"></i>}
                tone="muted"
              />
            </>
          ) : (
            <>
              <StatCard
                label="Known Planets (KP)"
                value={datasets.filter(d => d.tfopwg_disp === 'KP').length.toLocaleString()}
                icon={<i className="fas fa-check-double text-lg"></i>}
                tone="stellar"
              />

              <StatCard
                label="Community Planets (CP)"
                value={datasets.filter(d => d.tfopwg_disp === 'CP').length.toLocaleString()}
                icon={<i className="fas fa-users text-lg"></i>}
                tone="nebula"
              />

              <StatCard
                label="False Positives (FP)"
                value={datasets.filter(d => d.tfopwg_disp === 'FP').length.toLocaleString()}
                icon={<i className="fas fa-ban text-lg"></i>}
                tone="muted"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}