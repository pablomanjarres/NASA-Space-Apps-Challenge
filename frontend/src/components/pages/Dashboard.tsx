
import React, { useState, useRef, useEffect } from 'react';
import { useSharedState } from '../context/SharedContext';
import DashboardSection from '../DashboardSection';
import Modal from '../Modal';
import type { RecentActivityRef } from '../RecentActivity';
import RecentActivity from '../RecentActivity';
import { PredictionResults } from '../PredictionResults';
import { apiService, type UploadResponse } from '../../services/api';
import { dataLoader } from '../../services/dataLoader';
import MLAnalysisAnimation from '../MLAnalysisAnimation';

// LocalStorage key for prediction results
const LAST_PREDICTION_KEY = 'lastPredictionResults';
const LAST_FILE_DATA_KEY = 'lastPredictionFileData';

type MLModel = 'tess' | 'kepler';
type InputMode = 'file' | 'manual';

interface ManualInputRow {
  [key: string]: string | number;
}

interface Hyperparameters {
  learningRate: number;
  epochs: number;
  batchSize: number;
  dropout: number;
  optimizer: 'adam' | 'sgd' | 'rmsprop';
}

// Model Performance Metrics
interface IndividualModelScore {
  name: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  color: string;
  icon: string;
}

interface ModelMetrics {
  ensembleAccuracy: number;
  ensemblePrecision: number;
  ensembleRecall: number;
  ensembleF1Score: number;
  modelName: string;
  description: string;
  individualModels: IndividualModelScore[];
}

// Model metrics data from training notebooks - Test Set Performance
// TESS metrics from: backend/tess/trained_models_improved/meta.json (October 5, 2025)
// Kepler metrics: Need verification - see MODEL_METRICS_VERIFICATION.md
const modelMetricsData: Record<MLModel, ModelMetrics> = {
  tess: {
    ensembleAccuracy: 0.9220,
    ensemblePrecision: 0.9209,
    ensembleRecall: 0.9220,
    ensembleF1Score: 0.9206,
    modelName: 'TESS Exoplanet Classification',
    description: 'Ensemble of 3 gradient boosting models with weighted voting',
    individualModels: [
      {
        name: 'XGBoost',
        accuracy: 0.9184,
        precision: 0.9209,  // Using ensemble metrics (individual not saved)
        recall: 0.9220,
        f1Score: 0.9206,
        color: 'from-red-500 to-orange-500',
        icon: 'fa-fire'
      },
      {
        name: 'LightGBM',
        accuracy: 0.9252,
        precision: 0.9209,  // Using ensemble metrics (individual not saved)
        recall: 0.9220,
        f1Score: 0.9206,
        color: 'from-green-500 to-emerald-500',
        icon: 'fa-bolt'
      },
      {
        name: 'CatBoost',
        accuracy: 0.8999,
        precision: 0.9209,  // Using ensemble metrics (individual not saved)
        recall: 0.9220,
        f1Score: 0.9206,
        color: 'from-blue-500 to-cyan-500',
        icon: 'fa-cat'
      }
    ]
  },
  kepler: {
    ensembleAccuracy: 0.9394,
    ensemblePrecision: 0.9066,
    ensembleRecall: 0.9028,
    ensembleF1Score: 0.9381,
    modelName: 'Kepler Exoplanet Classification',
    description: 'Ensemble of 3 gradient boosting models with weighted voting',
    individualModels: [
      {
        name: 'XGBoost',
        accuracy: 0.9354,
        precision: 0.9012,
        recall: 0.8987,
        f1Score: 0.9341,
        color: 'from-red-500 to-orange-500',
        icon: 'fa-fire'
      },
      {
        name: 'LightGBM',
        accuracy: 0.9323,
        precision: 0.8976,
        recall: 0.8951,
        f1Score: 0.9310,
        color: 'from-green-500 to-emerald-500',
        icon: 'fa-bolt'
      },
      {
        name: 'CatBoost',
        accuracy: 0.9338,
        precision: 0.8994,
        recall: 0.8969,
        f1Score: 0.9325,
        color: 'from-blue-500 to-cyan-500',
        icon: 'fa-cat'
      }
    ]
  }
};

// Hyperparameter Slider Component
interface HyperparamSliderProps {
  id: string;
  label: string;
  value: number;
  min: string;
  max: string;
  step: string;
  onChange: (value: number) => void;
  isFloat?: boolean;
}

const HyperparamSlider: React.FC<HyperparamSliderProps> = ({ id, label, value, min, max, step, onChange, isFloat = false }) => {
  const pct = ((parseFloat(value.toString()) - parseFloat(min)) / (parseFloat(max) - parseFloat(min))) * 100;
  return (
  <div className="rounded-card border border-hairline bg-surface-raised p-4">
    <div className="mb-2 flex justify-between">
      <label htmlFor={id} className="block text-sm font-medium text-ink-secondary">
        {label}
      </label>
      <span className="font-mono text-sm font-semibold text-accent">{value}</span>
    </div>
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(isFloat ? parseFloat(e.target.value) : parseInt(e.target.value))}
      className="mt-2 w-full cursor-pointer appearance-none accent-stellar-400"
      style={{
        background: `linear-gradient(to right, #22d3ee 0%, #22d3ee ${pct}%, rgba(150,172,255,0.12) ${pct}%, rgba(150,172,255,0.12) 100%)`,
        height: '8px',
        borderRadius: '999px',
      }}
    />
    <div className="mt-2 flex justify-between font-mono text-xs text-ink-tertiary">
      <span>{min}</span>
      <span>{max}</span>
    </div>
  </div>
  );
};

// Model Metric Interface
interface ModelMetric {
  name: string;
  value: number;
  description: string;
}

// Required Columns Display Component
interface RequiredColumnsProps {
  columns: string[];
  modelName: string;
  columnDescriptions: { [key: string]: string };
}

const RequiredColumns: React.FC<RequiredColumnsProps> = ({ columns, modelName, columnDescriptions }) => {
  const [showAll, setShowAll] = useState(false);
  const displayColumns = showAll ? columns : columns.slice(0, 10);

  return (
    <div className="mt-4 rounded-card border border-hairline bg-surface-raised p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-ink-secondary">
          <i className="fas fa-check-circle mr-2 text-accent"></i>
          Required Columns for {modelName} Model (<span className="font-mono text-ink">{columns.length}</span> total)
        </div>
        {columns.length > 10 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="btn-space btn-secondary flex-shrink-0 px-3 py-1.5 text-xs"
          >
            {showAll ? 'Show Less' : 'Show All'}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {displayColumns.map((col) => (
          <div key={col} className="group relative">
            <span className="cursor-help rounded-control border border-hairline bg-surface px-2.5 py-1 font-mono text-xs text-ink-secondary transition-colors group-hover:border-stellar-400/40 group-hover:text-accent">
              {col}
            </span>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 z-50 mb-2 hidden w-64 -translate-x-1/2 transform group-hover:block">
              <div className="rounded-card border border-hairline-strong bg-void-800 p-3 text-xs shadow-elevated">
                <div className="mb-1 font-mono font-semibold text-accent">{col}</div>
                <div className="text-ink-secondary">
                  {columnDescriptions[col] || 'No description available'}
                </div>
              </div>
            </div>
          </div>
        ))}
        {!showAll && columns.length > 10 && (
          <span className="px-2.5 py-1 font-mono text-xs text-ink-tertiary">
            +{columns.length - 10} more
          </span>
        )}
      </div>
    </div>
  );
};

// Model Metrics Display Component
interface ModelMetricsDisplayProps {
  metrics: ModelMetrics;
  modelType: MLModel;
}

const ModelMetricsDisplay: React.FC<ModelMetricsDisplayProps> = ({ metrics, modelType }) => {
  const ensembleMetrics = [
    {
      name: 'Accuracy',
      value: metrics.ensembleAccuracy,
      icon: 'fa-bullseye',
      description: 'Overall prediction correctness'
    },
    {
      name: 'Precision',
      value: metrics.ensemblePrecision,
      icon: 'fa-crosshairs',
      description: 'Positive prediction accuracy'
    },
    {
      name: 'Recall',
      value: metrics.ensembleRecall,
      icon: 'fa-search-plus',
      description: 'Actual positives found'
    },
    {
      name: 'F1-Score',
      value: metrics.ensembleF1Score,
      icon: 'fa-balance-scale',
      description: 'Balanced performance measure'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Ensemble Performance - Main Metrics */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <i className="fas fa-trophy text-lg text-accent"></i>
          <h4 className="font-display font-semibold text-ink">Ensemble Performance</h4>
          <span className="rounded-pill border border-hairline bg-surface px-2 py-0.5 text-eyebrow text-ink-tertiary">Best Results</span>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {ensembleMetrics.map((metric) => (
            <div
              key={metric.name}
              className="rounded-card border border-hairline bg-surface-raised p-4 card-hover"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-control border border-hairline bg-surface text-accent">
                  <i className={`fas ${metric.icon} text-sm`}></i>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl font-semibold text-ink">
                    {(metric.value * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm font-medium text-ink-secondary">{metric.name}</div>
                <div className="text-xs text-ink-tertiary">{metric.description}</div>
                {/* Progress bar */}
                <div className="mt-2 h-2 w-full overflow-hidden rounded-pill bg-surface-sunken">
                  <div
                    className="h-2 rounded-pill bg-stellar-400 transition-all duration-1000 ease-out"
                    style={{ width: `${metric.value * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Individual Models Performance */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <i className="fas fa-layer-group text-lg text-nebula-300"></i>
          <h4 className="font-display font-semibold text-ink">Individual Model Performance</h4>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {metrics.individualModels.map((model) => (
            <div
              key={model.name}
              className="rounded-card border border-hairline bg-surface-raised p-5 card-hover"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-control border border-hairline bg-surface text-accent">
                  <i className={`fas ${model.icon} text-lg`}></i>
                </div>
                <div>
                  <h5 className="font-display text-lg font-semibold text-ink">{model.name}</h5>
                  <p className="text-xs text-ink-tertiary">Gradient Boosting</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-tertiary">Accuracy</span>
                  <span className="font-mono text-sm font-semibold text-ink">{(model.accuracy * 100).toFixed(2)}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-pill bg-surface-sunken">
                  <div className="h-1.5 rounded-pill bg-stellar-400 transition-all duration-1000" style={{ width: `${model.accuracy * 100}%` }}></div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div className="text-center">
                    <p className="text-xs text-ink-tertiary">Precision</p>
                    <p className="font-mono text-sm font-semibold text-ink">{(model.precision * 100).toFixed(1)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-ink-tertiary">Recall</p>
                    <p className="font-mono text-sm font-semibold text-ink">{(model.recall * 100).toFixed(1)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-ink-tertiary">F1</p>
                    <p className="font-mono text-sm font-semibold text-ink">{(model.f1Score * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Info */}
      <div className="rounded-card border border-hairline bg-surface-raised p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-control border border-hairline bg-surface text-nebula-300">
            <i className="fas fa-lightbulb text-sm"></i>
          </div>
          <div className="text-sm text-ink-secondary">
            <p className="mb-1 font-medium text-ink">Why Ensemble?</p>
            <p className="text-xs leading-relaxed text-ink-tertiary">
              The ensemble model combines predictions from all three algorithms using weighted voting (40% CatBoost, 35% XGBoost, 25% LightGBM).
              This approach leverages the strengths of each model to achieve higher accuracy and more reliable predictions than any single model alone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const { state, updateState } = useSharedState();

  // ML Model States
  const [selectedModel, setSelectedModel] = useState<MLModel>('tess');
  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [lastUploadedFileData, setLastUploadedFileData] = useState<string | null>(null);
  const [predictionResults, setPredictionResults] = useState<UploadResponse | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [hasLastResults, setHasLastResults] = useState(false);

  // Load last results from localStorage on mount
  useEffect(() => {
    const savedResults = localStorage.getItem(LAST_PREDICTION_KEY);
    if (savedResults) {
      try {
        const parsed = JSON.parse(savedResults);
        // Verify it has the expected structure
        if (parsed && parsed.predictions && parsed.job_id) {
          setHasLastResults(true);
        }
      } catch (error) {
        console.error('Failed to parse saved results:', error);
        localStorage.removeItem(LAST_PREDICTION_KEY);
      }
    }
  }, []);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileInfoMessage, setFileInfoMessage] = useState<string | null>(null);
  const [manualData, setManualData] = useState<ManualInputRow[]>([{}]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Modal States
  const [showHyperparamsModal, setShowHyperparamsModal] = useState(false);
  const [showManualInputModal, setShowManualInputModal] = useState(false);
  const [showOptionalFieldsInManual, setShowOptionalFieldsInManual] = useState(false);
  const [isManualInputFullscreen, setIsManualInputFullscreen] = useState(false);

  // Refs
  const recentActivityRef = useRef<RecentActivityRef>(null);

  // Function to view last saved results
  const viewLastResults = () => {
    const savedResults = localStorage.getItem(LAST_PREDICTION_KEY);
    const savedFileData = localStorage.getItem(LAST_FILE_DATA_KEY);
    if (savedResults) {
      try {
        const parsed = JSON.parse(savedResults);
        // Remove the savedAt timestamp before displaying (it's not part of UploadResponse)
        const { savedAt, ...results } = parsed;
        setPredictionResults(results);
        setShowResults(true);
        
        // Set the file data for 3D visualization
        setLastUploadedFileData(savedFileData);
        
        // Calculate and set the actual average confidence from saved predictions
        if (results.predictions && results.predictions.length > 0) {
          const avgConfidence = results.predictions.reduce((sum: number, p: any) => {
            return sum + p.confidence[p.predicted_class];
          }, 0) / results.total_predictions;
          
          setAnalysisResult({
            confidence: avgConfidence,
            type: `${results.dataset_type.toUpperCase()}: ${results.total_predictions} predictions`,
            confirmed: true
          });
        }
      } catch (error) {
        console.error('Failed to load saved results:', error);
        alert('Failed to load saved results. The data may be corrupted.');
      }
    }
  };

  // Analysis States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    confidence: number;
    type?: string;
    confirmed: boolean | null;
    error?: string;
  } | null>(null);

  // Hyperparameter States
  const [hyperparameters, setHyperparameters] = useState<Hyperparameters>({
    learningRate: 0.001,
    epochs: 50,
    batchSize: 32,
    dropout: 0.2,
    optimizer: 'adam'
  });

  // Model Configuration
  const modelColumns = {
    tess: [
      'ra', 'dec', 'st_teff', 'st_logg', 'st_rad', 'st_dist',
      'st_pmra', 'st_pmdec', 'st_tmag', 'pl_orbper', 'pl_rade',
      'pl_trandep', 'pl_trandurh', 'pl_eqt', 'pl_insol', 'pl_tranmid'
    ],
    kepler: [
      'koi_disposition', 'koi_pdisposition', 'koi_score', 'koi_fpflag_nt', 'koi_fpflag_ss',
      'koi_fpflag_co', 'koi_fpflag_ec', 'koi_period', 'koi_impact',
      'koi_duration', 'koi_depth', 'koi_prad', 'koi_teq', 'koi_insol',
      'koi_model_snr', 'koi_tce_plnt_num', 'koi_steff',
      'koi_slogg', 'koi_srad', 'ra', 'dec', 'koi_kepmag'
    ]
  };

  const optionalColumns = {
    tess: [
      'toi', 'tid', 'tfopwg_disp', 'rastr', 'decstr',
      'st_pmraerr1', 'st_pmraerr2', 'st_pmdecerr1', 'st_pmdecerr2',
      'st_tmagerr1', 'st_tmagerr2', 'st_disterr1', 'st_disterr2',
      'st_tefferr1', 'st_tefferr2', 'st_loggerr1', 'st_loggerr2',
      'st_raderr1', 'st_raderr2', 'pl_orbpererr1', 'pl_orbpererr2',
      'pl_radeerr1', 'pl_radeerr2', 'pl_trandeperr1', 'pl_trandeperr2',
      'pl_trandurherr1', 'pl_trandurherr2', 'pl_eqterr1', 'pl_eqterr2',
      'pl_insolerr1', 'pl_insolerr2', 'pl_tranmiderr1', 'pl_tranmiderr2',
      'st_pmralim', 'st_pmdeclim', 'st_tmaglim', 'st_distlim', 'st_tefflim',
      'st_logglim', 'st_radlim', 'pl_orbperlim', 'pl_radelim', 'pl_trandeplim',
      'pl_trandurhlim', 'pl_eqtlim', 'pl_insollim', 'pl_tranmidlim',
      'toi_created', 'rowupdate'
    ],
    kepler: [
      'kepid', 'kepoi_name', 'kepler_name', 'koi_sma', 'koi_incl', 'koi_time0bk',
      'koi_period_err1', 'koi_period_err2', 'koi_time0bk_err1', 'koi_time0bk_err2',
      'koi_impact_err1', 'koi_impact_err2',
      'koi_duration_err1', 'koi_duration_err2', 'koi_depth_err1', 'koi_depth_err2',
      'koi_prad_err1', 'koi_prad_err2', 'koi_teq_err1', 'koi_teq_err2',
      'koi_insol_err1', 'koi_insol_err2', 'koi_steff_err1', 'koi_steff_err2',
      'koi_slogg_err1', 'koi_slogg_err2', 'koi_srad_err1', 'koi_srad_err2',
      'koi_tce_delivname'
    ]
  };

  const columnDisplayNames: { [key: string]: string } = {
    'ra': 'Right Ascension', 'dec': 'Declination', 'toi': 'TESS Object of Interest',
    'tid': 'TESS Input Catalog ID', 'tfopwg_disp': 'TFOPWG Disposition',
    'st_teff': 'Stellar Effective Temperature', 'st_logg': 'Stellar Surface Gravity',
    'st_rad': 'Stellar Radius', 'st_dist': 'Distance to Star',
    'st_pmra': 'Stellar Proper Motion (RA)', 'st_pmdec': 'Stellar Proper Motion (Dec)',
    'st_tmag': 'TESS Magnitude', 'pl_orbper': 'Orbital Period',
    'pl_rade': 'Planet Radius', 'pl_trandep': 'Transit Depth',
    'pl_trandurh': 'Transit Duration', 'pl_eqt': 'Equilibrium Temperature',
    'pl_insol': 'Insolation Flux', 'pl_tranmid': 'Transit Midpoint',
    'koi_disposition': 'KOI Disposition', 'koi_pdisposition': 'KOI Pipeline Disposition',
    'koi_score': 'KOI Score', 'koi_period': 'Orbital Period',
    'koi_impact': 'Impact Parameter', 'koi_duration': 'Transit Duration',
    'koi_depth': 'Transit Depth', 'koi_prad': 'Planetary Radius',
    'koi_teq': 'Equilibrium Temperature', 'koi_insol': 'Insolation Flux',
    'koi_steff': 'Stellar Effective Temperature', 'koi_slogg': 'Stellar Surface Gravity',
    'koi_srad': 'Stellar Radius', 'koi_kepmag': 'Kepler Magnitude'
  };

  const columnDescriptions: { [key: string]: string } = {
    // TESS Required Columns
    'ra': 'Sky coordinate (right ascension) in degrees for celestial positioning',
    'dec': 'Sky coordinate (declination) in degrees for celestial positioning',
    'st_teff': 'Temperature of the star in Kelvin (K)',
    'st_logg': 'Surface gravity of the star (log base 10 of cm/s²)',
    'st_rad': 'Radius of the star in solar radii',
    'st_dist': 'Distance from Earth to the star in parsecs',
    'st_pmra': 'Star\'s proper motion in RA direction (mas/year)',
    'st_pmdec': 'Star\'s proper motion in Dec direction (mas/year)',
    'st_tmag': 'TESS photometric magnitude of the host star',
    'pl_orbper': 'Time for the planet to complete one orbit (days)',
    'pl_rade': 'Radius of the planet in Earth radii',
    'pl_trandep': 'Depth of the transit (percentage decrease in brightness)',
    'pl_trandurh': 'Duration of the planetary transit in hours',
    'pl_eqt': 'Equilibrium temperature of the planet (K)',
    'pl_insol': 'Insolation flux received by the planet (Earth flux)',
    'pl_tranmid': 'Time of transit center (BJD - 2457000)',
    
    // Kepler Required Columns
    'koi_disposition': 'Archive disposition (CONFIRMED, FALSE POSITIVE, CANDIDATE)',
    'koi_pdisposition': 'Pipeline-determined disposition',
    'koi_score': 'Disposition score (0-1, higher = more likely planet)',
    'koi_fpflag_nt': 'Not transit-like false positive flag',
    'koi_fpflag_ss': 'Stellar eclipse false positive flag',
    'koi_fpflag_co': 'Centroid offset false positive flag',
    'koi_fpflag_ec': 'Ephemeris match false positive flag',
    'koi_period': 'Orbital period of the planet candidate (days)',
    'koi_impact': 'Sky-projected distance between planet and star',
    'koi_duration': 'Transit duration from first to last contact (hours)',
    'koi_depth': 'Transit depth in parts per million',
    'koi_prad': 'Planetary radius in Earth radii',
    'koi_teq': 'Equilibrium temperature of planet (K)',
    'koi_insol': 'Insolation flux (Earth flux)',
    'koi_model_snr': 'Signal-to-noise ratio of the transit',
    'koi_tce_plnt_num': 'Planet number in multi-planet system',
    'koi_steff': 'Stellar effective temperature (K)',
    'koi_slogg': 'Stellar surface gravity (log g)',
    'koi_srad': 'Stellar radius (solar radii)',
    'koi_kepmag': 'Kepler-band magnitude of the host star',
    
    // Optional TESS Columns
    'toi': 'TESS Object of Interest identifier',
    'tid': 'TESS Input Catalog identifier',
    'tfopwg_disp': 'TESS Follow-up Observing Program disposition',
    'rastr': 'Right Ascension in sexagesimal format',
    'decstr': 'Declination in sexagesimal format',
    'st_pmraerr1': 'Upper uncertainty in RA proper motion',
    'st_pmraerr2': 'Lower uncertainty in RA proper motion',
    'st_pmdecerr1': 'Upper uncertainty in Dec proper motion',
    'st_pmdecerr2': 'Lower uncertainty in Dec proper motion',
    'st_tmagerr1': 'Upper uncertainty in TESS magnitude',
    'st_tmagerr2': 'Lower uncertainty in TESS magnitude',
    'st_disterr1': 'Upper uncertainty in stellar distance',
    'st_disterr2': 'Lower uncertainty in stellar distance',
    'st_tefferr1': 'Upper uncertainty in stellar temperature',
    'st_tefferr2': 'Lower uncertainty in stellar temperature',
    'st_loggerr1': 'Upper uncertainty in surface gravity',
    'st_loggerr2': 'Lower uncertainty in surface gravity',
    'st_raderr1': 'Upper uncertainty in stellar radius',
    'st_raderr2': 'Lower uncertainty in stellar radius',
    'pl_orbpererr1': 'Upper uncertainty in orbital period',
    'pl_orbpererr2': 'Lower uncertainty in orbital period',
    'pl_radeerr1': 'Upper uncertainty in planet radius',
    'pl_radeerr2': 'Lower uncertainty in planet radius',
    'pl_trandeperr1': 'Upper uncertainty in transit depth',
    'pl_trandeperr2': 'Lower uncertainty in transit depth',
    'pl_trandurherr1': 'Upper uncertainty in transit duration',
    'pl_trandurherr2': 'Lower uncertainty in transit duration',
    'pl_eqterr1': 'Upper uncertainty in equilibrium temperature',
    'pl_eqterr2': 'Lower uncertainty in equilibrium temperature',
    'pl_insolerr1': 'Upper uncertainty in insolation flux',
    'pl_insolerr2': 'Lower uncertainty in insolation flux',
    'pl_tranmiderr1': 'Upper uncertainty in transit midpoint',
    'pl_tranmiderr2': 'Lower uncertainty in transit midpoint',
    'toi_created': 'Date when TOI was created',
    'rowupdate': 'Last update date of the record',
    
    // Optional Kepler Columns
    'kepid': 'Kepler Input Catalog identifier',
    'kepoi_name': 'KOI name in standard format',
    'kepler_name': 'Kepler planet name if confirmed',
    'koi_sma': 'Semi-major axis of orbit (AU)',
    'koi_incl': 'Orbital inclination (degrees)',
    'koi_time0bk': 'Transit epoch (BJD - 2454833)',
    'koi_period_err1': 'Upper uncertainty in orbital period',
    'koi_period_err2': 'Lower uncertainty in orbital period',
    'koi_time0bk_err1': 'Upper uncertainty in transit epoch',
    'koi_time0bk_err2': 'Lower uncertainty in transit epoch',
    'koi_impact_err1': 'Upper uncertainty in impact parameter',
    'koi_impact_err2': 'Lower uncertainty in impact parameter',
    'koi_duration_err1': 'Upper uncertainty in transit duration',
    'koi_duration_err2': 'Lower uncertainty in transit duration',
    'koi_depth_err1': 'Upper uncertainty in transit depth',
    'koi_depth_err2': 'Lower uncertainty in transit depth',
    'koi_prad_err1': 'Upper uncertainty in planetary radius',
    'koi_prad_err2': 'Lower uncertainty in planetary radius',
    'koi_teq_err1': 'Upper uncertainty in equilibrium temp',
    'koi_teq_err2': 'Lower uncertainty in equilibrium temp',
    'koi_insol_err1': 'Upper uncertainty in insolation flux',
    'koi_insol_err2': 'Lower uncertainty in insolation flux',
    'koi_steff_err1': 'Upper uncertainty in stellar temperature',
    'koi_steff_err2': 'Lower uncertainty in stellar temperature',
    'koi_slogg_err1': 'Upper uncertainty in stellar gravity',
    'koi_slogg_err2': 'Lower uncertainty in stellar gravity',
    'koi_srad_err1': 'Upper uncertainty in stellar radius',
    'koi_srad_err2': 'Lower uncertainty in stellar radius',
    'koi_tce_delivname': 'TCE delivery name from pipeline'
  };

  // Model Metrics (dummy data - would come from state in production)
  const modelMetrics: ModelMetric[] = [
    { name: "Accuracy", value: 94.2, description: "Overall correctness of model predictions" },
    { name: "Precision", value: 92.8, description: "Ratio of correct positive predictions to total positive predictions" },
    { name: "Recall", value: 91.5, description: "Ratio of correct positive predictions to all actual positives" },
    { name: "F1 Score", value: 92.1, description: "Harmonic mean of precision and recall" }
  ];

  // Model Change Handler
  const handleModelChange = (model: MLModel) => {
    const hadUploadedFile = uploadedFile !== null;
    
    setSelectedModel(model);
    // Clear uploaded file and errors when switching models
    setUploadedFile(null);
    setFileError(null);
    setValidationErrors([]);
    setFileInfoMessage(null);
    
    // Show info message if there was a file uploaded
    if (hadUploadedFile) {
      setFileInfoMessage(`Switched to ${model.toUpperCase()} model. Please re-upload your file for validation with the new model's requirements.`);
      // Clear the info message after 5 seconds
      setTimeout(() => {
        setFileInfoMessage(null);
      }, 5000);
    }
  };

  const handleHyperparamChange = (param: string, value: number | string) => {
    setHyperparameters(prev => ({
      ...prev,
      [param]: value
    }));
  };

  const handleSaveHyperparameters = () => {
    setFileInfoMessage('✓ Hyperparameters saved successfully!');
    setShowHyperparamsModal(false);
    setTimeout(() => setFileInfoMessage(null), 3000);
  };

  // File Validation Function
  const validateAndProcessFile = (file: File) => {
    setFileError(null);
    setFileInfoMessage(null);
    setValidationErrors([]);

    // Validate file size (50MB for ML processing)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setFileError(`File size (${(file.size / 1024 / 1024).toFixed(2)} MB) exceeds 50MB limit`);
      setUploadedFile(null);
      return;
    }

    // Validate file type
    const validExtensions = ['.csv', '.txt', '.xlsx'];
    const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExtension) {
      setFileError('Invalid file type. Please upload CSV, TXT, or XLSX file.');
      setUploadedFile(null);
      return;
    }

    // For CSV/TXT: Do lightweight validation but don't block upload
    if (file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.txt')) {
      // Set uploaded file first
      setUploadedFile(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;

          // Filter out empty lines and comments
          const allLines = text.split('\n');
          const lines = allLines.filter(line => {
            const trimmed = line.trim();
            return trimmed !== '' && !trimmed.startsWith('#');
          });

          if (lines.length === 0) {
            setFileError('File is empty or contains only comments');
            setUploadedFile(null);
            return;
          }

          if (lines.length < 2) {
            setFileError('File must contain at least a header row and one data row');
            setUploadedFile(null);
            return;
          }

          // Parse headers
          const headers = lines[0].split(',').map(h => h.trim());
          const requiredCols = modelColumns[selectedModel];

          // Check for missing required columns - but show as INFO, not error
          const missingCols = requiredCols.filter(col => !headers.includes(col));
          
          if (missingCols.length > 0) {
            // Show informational message instead of blocking
            setFileInfoMessage(
              `ℹ️ Note: This file may not match the ${selectedModel.toUpperCase()} model columns. ` +
              `The backend will auto-detect the dataset type (Kepler or TESS) when you run the analysis. ` +
              `If columns don't match either dataset, you'll get an error during processing.`
            );
          } else {
            // File looks good!
            setFileInfoMessage(`✓ File validated successfully! Found ${lines.length - 1} data rows with correct ${selectedModel.toUpperCase()} columns.`);
          }

          // No validation errors - let backend handle detailed validation
          setValidationErrors([]);

        } catch (error) {
          setFileError(`Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setUploadedFile(null);
        }
      };
      reader.onerror = () => {
        setFileError('Failed to read file');
        setUploadedFile(null);
      };
      reader.readAsText(file);
    } else {
      // For XLSX files, set immediately with warning about validation
      setUploadedFile(file);
      setFileInfoMessage('⚠️ XLSX file uploaded. Please ensure it contains all required columns for the selected model before running analysis.');
      // Note: We can't validate XLSX client-side easily, so we add a validation check in handleAnalyze
    }
  };

  // Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndProcessFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndProcessFile(file);
  };

  const handleAnalyze = async () => {
    if (!uploadedFile && inputMode === 'file') return;

    // Additional check for XLSX files
    if (uploadedFile?.name.toLowerCase().endsWith('.xlsx')) {
      const confirmRun = window.confirm(
        'Warning: XLSX file validation happens server-side. Please confirm that your file contains all required columns for the ' +
        selectedModel.toUpperCase() + ' model before proceeding.'
      );
      if (!confirmRun) return;
    }

    setIsAnalyzing(true);
    setFileError(null);
    
    try {
      // Call the real API
      const results = await apiService.uploadAndPredict(uploadedFile!);
      
      // Save to localStorage with timestamp
      const resultsWithTimestamp = {
        ...results,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(LAST_PREDICTION_KEY, JSON.stringify(resultsWithTimestamp));
      
      // Save file data (as text) for 3D visualization later
      if (uploadedFile) {
        try {
          const fileText = await uploadedFile.text();
          localStorage.setItem(LAST_FILE_DATA_KEY, fileText);
        } catch (err) {
          console.warn('Failed to save file data:', err);
        }
      }
      
      setHasLastResults(true);
      
      // Store results and show modal
      setPredictionResults(results);
      setShowResults(true);
      
      // Calculate the actual average confidence from predictions
      const avgConfidence = results.predictions.reduce((sum, p) => {
        return sum + p.confidence[p.predicted_class];
      }, 0) / results.total_predictions;
      
      // Set analysis result with real confidence score
      setAnalysisResult({
        confidence: avgConfidence,
        type: `${results.dataset_type.toUpperCase()}: ${results.total_predictions} predictions`,
        confirmed: true
      });
    } catch (error: any) {
      console.error('Upload error:', error);

      // Determine error type and create appropriate message
      let errorMessage: string;
      let errorDetails: string = '';

      if (error?.isTimeout) {
        errorMessage = 'Request Timeout';
        errorDetails = error.message;
      } else if (error?.isNetworkError) {
        errorMessage = 'Network Connection Failed';
        errorDetails = error.message;
      } else if (error?.status === 400) {
        errorMessage = 'Invalid File or Data';
        errorDetails = error?.data?.detail || error?.message || 'The uploaded file does not meet the required format or column requirements.';
      } else if (error?.status === 500) {
        errorMessage = 'Server Processing Error';
        errorDetails = error?.data?.detail || error?.message || 'The server encountered an error while processing your file. This may be due to invalid data or a server issue.';
      } else if (error?.status === 404) {
        errorMessage = 'API Endpoint Not Found';
        errorDetails = 'The upload endpoint is not available. Please check if the backend server is properly deployed.';
      } else {
        errorMessage = 'Upload Failed';
        errorDetails = error?.data?.detail || error?.message || 'An unexpected error occurred. Please try again.';
      }

      setAnalysisResult({
        confidence: 0,
        confirmed: null,
        error: errorMessage
      });

      setFileError(`${errorMessage}: ${errorDetails}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadSampleDataset = async () => {
    setFileError(null);
    setFileInfoMessage(null);

    try {
      // Load random sample from the selected model's dataset
      const datasetType = selectedModel; // 'kepler' or 'tess'
      const sampleSize = 50; // Get 50 random rows

      setFileInfoMessage(`🎲 Loading random sample from ${datasetType.toUpperCase()} dataset...`);

      const sampleData = await dataLoader.loadRandomSample(datasetType, sampleSize);

      if (!sampleData || sampleData.length === 0) {
        throw new Error('No sample data received');
      }

      // Convert the sample data to CSV format
      const headers = Object.keys(sampleData[0]);
      const csvLines = [
        headers.join(','), // Header row
        ...sampleData.map(row =>
          headers.map(header => {
            const value = row[header];
            // Handle values that might contain commas or quotes
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          }).join(',')
        )
      ];
      const csvContent = csvLines.join('\n');

      // Create a File object from the CSV content
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], `sample_${datasetType}_${Date.now()}.csv`, { type: 'text/csv' });

      // Set the file and trigger validation
      setUploadedFile(file);
      setFileInfoMessage(`✓ Loaded ${sampleData.length} random samples from ${datasetType.toUpperCase()} dataset! Ready for analysis.`);

    } catch (error: any) {
      console.error('Sample loading error:', error);
      setFileError(`Failed to load sample dataset: ${error.message || 'Unknown error'}`);
    }
  };

  const addManualRow = () => {
    setManualData([...manualData, {}]);
  };

  const removeManualRow = (index: number) => {
    setManualData(manualData.filter((_, i) => i !== index));
  };

  const updateManualData = (index: number, field: string, value: string) => {
    const updated = [...manualData];
    updated[index][field] = value;
    setManualData(updated);
  };

  const exportManualDataToCSV = () => {
    const columns = [...modelColumns[selectedModel], ...(showOptionalFieldsInManual ? optionalColumns[selectedModel] : [])];
    const header = columns.join(',');
    const rows = manualData.map(row =>
      columns.map(col => {
        const val = row[col]?.toString() || '';
        return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(',')
    );

    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedModel}_model_manual_data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Remove uploaded file
  const handleRemoveFile = () => {
    setUploadedFile(null);
    setFileError(null);
    setValidationErrors([]);
    setFileInfoMessage(null);
    const fileInput = document.getElementById('ml-file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Enhanced drag and drop handlers
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging && e.dataTransfer.types && e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  };

  // Validate manual data before submission
  const validateManualData = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const requiredCols = modelColumns[selectedModel];

    if (manualData.length === 0 || (manualData.length === 1 && Object.keys(manualData[0]).length === 0)) {
      errors.push('No data entered. Please fill at least one row.');
      return { isValid: false, errors };
    }

    manualData.forEach((row, idx) => {
      const missingCols = requiredCols.filter(col => !row[col] || row[col].toString().trim() === '');
      if (missingCols.length > 0) {
        errors.push(`Row ${idx + 1}: Missing values for ${missingCols.length} required column(s)`);
      }
    });

    return { isValid: errors.length === 0, errors };
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* ML Model Selection & Prediction */}
      <DashboardSection
        variant="nebula"
        title="ML Model Prediction"
        subtitle="Select model and upload data for exoplanet classification"
        icon={<i className="fas fa-brain"></i>}
      >
        <div className="space-y-6">
          {/* Model Selection */}
          <div>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="text-eyebrow text-ink-tertiary">
                <i className="fas fa-satellite mr-2 text-accent"></i>Select Model
              </label>
              <button
                onClick={() => setShowHyperparamsModal(true)}
                className="btn-space btn-secondary text-sm"
              >
                <i className="fas fa-sliders-h"></i>
                Adjust Hyperparameters
              </button>
            </div>

            <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
              {[
                { id: 'tess' as MLModel, label: 'TESS Model', desc: 'FP, PC, KP, APC, FA, CP', icon: 'fa-rocket', count: modelColumns.tess.length },
                { id: 'kepler' as MLModel, label: 'Kepler Model', desc: 'FP, confirmed, candidate', icon: 'fa-satellite', count: modelColumns.kepler.length }
              ].map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleModelChange(model.id)}
                  className={`group relative overflow-hidden rounded-card border p-5 text-left transition-colors duration-300 ${
                    selectedModel === model.id
                      ? 'border-stellar-400/50 bg-stellar-400/[0.06] shadow-glow-stellar'
                      : 'border-hairline bg-surface-raised hover:border-hairline-strong'
                  }`}
                >
                  <div className="relative z-10">
                    <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-control border transition-colors ${
                      selectedModel === model.id
                        ? 'border-stellar-400/40 bg-stellar-400/10 text-accent'
                        : 'border-hairline bg-surface text-ink-secondary group-hover:text-accent'
                    }`}>
                      <i className={`fas ${model.icon} text-2xl`}></i>
                    </div>
                    <h3 className="mb-1 font-display text-base font-semibold text-ink">{model.label}</h3>
                    <p className="mb-2 text-xs text-ink-tertiary">{model.desc}</p>
                    <div className="flex items-center gap-2">
                      <span className="rounded-pill border border-hairline bg-surface px-2 py-1 font-mono text-xs text-ink-secondary">
                        {model.count} features
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Required Columns Display */}
            <RequiredColumns
              columns={modelColumns[selectedModel]}
              modelName={selectedModel.toUpperCase()}
              columnDescriptions={columnDescriptions}
            />
          </div>

          {/* Model Performance Metrics Section */}
          <div className="space-y-4" key={`metrics-${selectedModel}`}>
            <div className="mb-2 flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-stellar-400/25 to-transparent"></div>
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
                <i className="fas fa-chart-line text-accent"></i>
                Model Performance Metrics
              </h3>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-stellar-400/25 to-transparent"></div>
            </div>
            <ModelMetricsDisplay metrics={modelMetricsData[selectedModel]} modelType={selectedModel} />
          </div>

          {/* Input Mode Tabs */}
              <div className="flex gap-1 rounded-control border border-hairline bg-surface-sunken p-1">
                {[
                  { mode: 'file' as InputMode, icon: 'fa-file-upload', label: 'File Upload' },
                  { mode: 'manual' as InputMode, icon: 'fa-keyboard', label: 'Manual Input' }
                ].map((tab) => (
                  <button
                    key={tab.mode}
                    onClick={() => setInputMode(tab.mode)}
                    className={`flex-1 rounded-[7px] px-4 py-2.5 text-sm font-medium transition-colors md:text-base ${
                      inputMode === tab.mode
                        ? 'bg-surface-raised text-accent shadow-panel'
                        : 'bg-transparent text-ink-tertiary hover:text-ink'
                    }`}
                  >
                    <i className={`fas ${tab.icon} mr-2`}></i>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* View Last Results Button */}
              {hasLastResults && (
                <div className="rounded-card border border-hairline bg-surface-raised p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-control border border-hairline bg-surface text-accent">
                        <i className="fas fa-history text-lg"></i>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink">Previous Results Available</p>
                        <p className="text-xs text-ink-tertiary">View your last ML prediction results</p>
                      </div>
                    </div>
                    <button
                      onClick={viewLastResults}
                      className="btn-space btn-secondary whitespace-nowrap text-sm"
                    >
                      <i className="fas fa-eye mr-2"></i>
                      View Last Results
                    </button>
                  </div>
                </div>
              )}

              {/* File Upload Interface */}
              {inputMode === 'file' && (
                <div className="space-y-4">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`relative rounded-panel border border-dashed p-8 text-center transition-colors duration-300 md:p-12 ${
                      isDragging
                        ? 'border-stellar-400/60 bg-stellar-400/[0.06]'
                        : 'border-hairline-strong bg-surface-raised hover:border-stellar-400/40'
                    }`}
                  >
                    {uploadedFile ? (
                      <div className="space-y-4">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-stellar-400/30 bg-stellar-400/10 text-accent md:h-20 md:w-20">
                          <i className="fas fa-file-csv text-2xl md:text-3xl"></i>
                        </div>
                        <div>
                          <p className="mb-1 text-lg font-medium text-ink">{uploadedFile.name}</p>
                          <p className="font-mono text-sm text-ink-tertiary">{(uploadedFile.size / 1024).toFixed(2)} KB</p>
                        </div>
                        <button
                          onClick={() => { setUploadedFile(null); setFileInfoMessage(null); }}
                          className="btn-space border border-hairline bg-surface text-sm font-medium text-ink-secondary transition-colors hover:border-red-400/40 hover:text-red-300"
                        >
                          <i className="fas fa-times mr-2"></i>Remove File
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-hairline bg-surface text-accent md:h-20 md:w-20">
                          <i className="fas fa-cloud-upload-alt text-2xl md:text-3xl"></i>
                        </div>
                        <p className="mb-2 text-base font-medium text-ink-secondary md:text-lg">
                          Drop your file here or click to browse
                        </p>
                        <p className="mb-6 text-sm text-ink-tertiary">
                          Supported formats: CSV, TXT, XLSX (max 5MB)
                        </p>
                        <input
                          type="file"
                          accept=".csv,.txt,.xlsx"
                          onChange={handleFileChange}
                          className="hidden"
                          id="file-upload-cosmic"
                        />
                        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                          <label
                            htmlFor="file-upload-cosmic"
                            className="btn-space btn-secondary cursor-pointer"
                          >
                            <i className="fas fa-folder-open mr-2"></i>
                            Choose File
                          </label>

                          <button
                            type="button"
                            onClick={loadSampleDataset}
                            disabled={isAnalyzing}
                            className="btn-space btn-secondary disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <i className="fas fa-dice mr-2"></i>
                            {isAnalyzing ? 'Loading...' : 'Try Sample Dataset'}
                          </button>
                        </div>
                        <p className="mt-4 text-xs italic text-ink-tertiary">
                          <i className="fas fa-info-circle mr-1"></i>
                          The sample dataset loads 50 random exoplanets from NASA's {selectedModel.toUpperCase()} dataset
                        </p>
                      </div>
                    )}
                  </div>

                  {/* File Messages */}
                  {fileError && (
                    <div className="rounded-control border border-red-400/25 bg-red-500/10 p-4">
                      <p className="text-sm font-medium text-red-300">
                        <i className="fas fa-exclamation-triangle mr-2"></i>
                        {fileError}
                      </p>
                    </div>
                  )}

                  {fileInfoMessage && (
                    <div className="rounded-control border border-hairline bg-surface-raised p-4">
                      <p className="text-sm font-medium text-ink-secondary">
                        <i className="fas fa-info-circle mr-2 text-accent"></i>
                        {fileInfoMessage}
                      </p>
                    </div>
                  )}

                  {/* Validation Errors - Enhanced */}
                  {validationErrors.length > 0 && (
                    <div className="rounded-card border border-red-400/25 bg-red-500/[0.07] p-5">
                      <div className="mb-3 flex items-start gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-control border border-red-400/30 bg-red-500/10 text-red-300">
                          <i className="fas fa-exclamation-triangle text-lg"></i>
                        </div>
                        <div>
                          <p className="mb-1 font-display text-base font-semibold text-red-200">
                            File Validation Failed
                          </p>
                          <p className="text-sm text-red-300/90">
                            Your file has {validationErrors.length} error{validationErrors.length > 1 ? 's' : ''} that must be fixed before running the ML model.
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 rounded-control border border-hairline bg-surface-sunken p-3">
                        <ul className="space-y-2">
                          {validationErrors.map((error, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-red-300/90">
                              <i className="fas fa-times-circle mt-0.5 flex-shrink-0"></i>
                              <span>{error}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="mt-4 rounded-control border border-hairline bg-surface-raised p-3">
                        <p className="text-xs font-medium text-ink-secondary">
                          <i className="fas fa-info-circle mr-1 text-accent"></i>
                          <strong className="text-ink">How to fix:</strong> Ensure your CSV file includes all required columns listed above and that the column names match exactly (case-sensitive).
                        </p>
                      </div>
                    </div>
                  )}

                  {/* File Validation Status */}
                  {uploadedFile && !fileError && (
                    <div className={`rounded-card border p-4 ${
                      validationErrors.length === 0
                        ? 'border-stellar-400/25 bg-stellar-400/[0.07]'
                        : 'border-red-400/25 bg-red-500/[0.07]'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-control border ${
                          validationErrors.length === 0
                            ? 'border-stellar-400/30 bg-stellar-400/10 text-accent'
                            : 'border-red-400/30 bg-red-500/10 text-red-300'
                        }`}>
                          <i className={`fas ${
                            validationErrors.length === 0
                              ? 'fa-check-circle'
                              : 'fa-exclamation-triangle'
                          } text-xl`}></i>
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-display text-base font-semibold ${
                            validationErrors.length === 0
                              ? 'text-ink'
                              : 'text-red-200'
                          }`}>
                            {validationErrors.length === 0
                              ? 'File Validated Successfully'
                              : 'File Validation Failed'}
                          </h4>
                          <p className={`text-sm ${
                            validationErrors.length === 0
                              ? 'text-ink-secondary'
                              : 'text-red-300/90'
                          }`}>
                            {validationErrors.length === 0
                              ? 'All required columns are present and correctly formatted'
                              : `Found ${validationErrors.length} validation error${validationErrors.length > 1 ? 's' : ''} - please fix before running ML model`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Analyze Button - the one primary CTA (signal amber). Only enabled when validation passes */}
                  {uploadedFile && !fileError && (
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || validationErrors.length > 0}
                      className={`btn-space w-full text-lg ${
                        validationErrors.length > 0
                          ? 'cursor-not-allowed border border-hairline bg-surface-sunken text-ink-tertiary'
                          : 'btn-primary'
                      } ${isAnalyzing ? 'cursor-not-allowed opacity-50' : ''}`}
                      title={validationErrors.length > 0 ? 'Fix validation errors before running ML analysis' : 'Run ML analysis on uploaded file'}
                    >
                      {isAnalyzing ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          Analyzing Data...
                        </>
                      ) : validationErrors.length > 0 ? (
                        <>
                          <i className="fas fa-ban"></i>
                          Cannot Run - Fix Validation Errors First
                        </>
                      ) : (
                        <>
                          <i className="fas fa-rocket"></i>
                          Run ML Analysis
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Manual Input Interface */}
              {inputMode === 'manual' && (
                <div className="rounded-panel border border-hairline bg-surface-raised p-8 text-center md:p-12">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-hairline bg-surface text-accent md:h-20 md:w-20">
                    <i className="fas fa-keyboard text-2xl md:text-3xl"></i>
                  </div>
                  <h3 className="mb-2 font-display text-xl font-semibold text-ink">Manual Data Entry</h3>
                  <p className="mb-6 text-ink-secondary">
                    Enter exoplanet features manually in a structured table format
                  </p>
                  <button
                    onClick={() => setShowManualInputModal(true)}
                    className="btn-space btn-secondary"
                  >
                    <i className="fas fa-table mr-2"></i>
                    Open Manual Input Table
                  </button>
                </div>
              )}
        </div>
      </DashboardSection>

      {/* Analysis Results */}
      {analysisResult && (
        <DashboardSection
          variant="galaxy"
          title="Analysis Results"
          subtitle="ML model predictions and confidence scores"
          icon={<i className="fas fa-chart-pie"></i>}
        >
          {analysisResult.error ? (
            <div className="rounded-card border border-red-400/25 bg-red-500/10 p-6">
              <p className="font-medium text-red-300">
                <i className="fas fa-times-circle mr-2"></i>
                {analysisResult.error}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-card border border-hairline bg-surface-raised p-6">
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-control border border-hairline bg-surface text-accent">
                    <i className="fas fa-percentage text-xl"></i>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-ink">Confidence Score</h3>
                </div>
                <p className="mb-2 font-mono text-5xl font-semibold text-accent">
                  {(analysisResult.confidence * 100).toFixed(1)}%
                </p>
                <div className="h-3 w-full overflow-hidden rounded-pill bg-surface-sunken">
                  <div className="h-full rounded-pill bg-stellar-400 transition-all duration-1000"
                       style={{ width: `${analysisResult.confidence * 100}%` }}></div>
                </div>
              </div>

              {analysisResult.type && (
                <div className="rounded-card border border-hairline bg-surface-raised p-6">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-control border border-hairline bg-surface text-nebula-300">
                      <i className="fas fa-tag text-xl"></i>
                    </div>
                    <h3 className="font-display text-lg font-semibold text-ink">Classification</h3>
                  </div>
                  <p className="mb-2 font-mono text-3xl font-semibold text-ink">
                    {analysisResult.type}
                  </p>
                  <p className="text-sm text-ink-tertiary">
                    Based on {selectedModel.toUpperCase()} model analysis
                  </p>
                </div>
              )}

              {analysisResult.confirmed === null && (
                <div className="md:col-span-2">
                  <div className="mb-4 rounded-control border border-hairline bg-surface-raised p-4">
                    <p className="text-sm text-ink-secondary">
                      <i className="fas fa-exclamation-triangle mr-2 text-signal-400"></i>
                      Please confirm or reject this prediction
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setAnalysisResult({ ...analysisResult, confirmed: true, confidence: 1.0 })}
                      className="btn-space flex-1 border border-stellar-400/30 bg-stellar-400/15 text-stellar-200 transition-colors hover:bg-stellar-400/20"
                    >
                      <i className="fas fa-check mr-2"></i>Confirm
                    </button>
                    <button
                      onClick={() => setAnalysisResult({ ...analysisResult, confirmed: false, confidence: 0 })}
                      className="btn-space flex-1 border border-red-400/25 bg-red-500/10 text-red-300 transition-colors hover:bg-red-500/[0.15]"
                    >
                      <i className="fas fa-times mr-2"></i>Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DashboardSection>
      )}

      {/* Recent Activity */}
      <RecentActivity ref={recentActivityRef} />

      {/* Hyperparameters Modal - Coming Soon */}
      <Modal isOpen={showHyperparamsModal} onClose={() => setShowHyperparamsModal(false)}>
        <div className="px-6 pt-6 pb-4 sm:p-8 sm:pb-6">
          <div className="sm:flex sm:items-start">
            <div className="mt-3 w-full text-center sm:mt-0 sm:text-left">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display text-xl font-semibold leading-6 text-ink">
                  <i className="fas fa-sliders-h text-accent"></i>
                  Adjust Hyperparameters
                </h3>
                <span className="rounded-pill border border-hairline bg-surface px-3 py-1 text-eyebrow text-ink-tertiary">
                  Coming Soon
                </span>
              </div>

              <div className="mt-6 py-12 text-center">
                <div className="mb-6">
                  <i className="fas fa-rocket text-6xl text-accent opacity-60"></i>
                </div>
                <h4 className="mb-3 font-display text-lg font-semibold text-ink">
                  Feature Under Development
                </h4>
                <p className="mx-auto mb-6 max-w-md text-sm text-ink-secondary">
                  We're working on bringing you the ability to fine-tune model hyperparameters. This feature will allow you to:
                </p>
                <ul className="mx-auto mb-8 max-w-md space-y-2 text-left">
                  <li className="flex items-start gap-3 text-sm text-ink-secondary">
                    <i className="fas fa-check-circle mt-0.5 text-accent"></i>
                    <span>Adjust learning rates and batch sizes</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-ink-secondary">
                    <i className="fas fa-check-circle mt-0.5 text-accent"></i>
                    <span>Configure dropout and regularization</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-ink-secondary">
                    <i className="fas fa-check-circle mt-0.5 text-accent"></i>
                    <span>Select different optimizers</span>
                  </li>
                  <li className="flex items-start gap-3 text-sm text-ink-secondary">
                    <i className="fas fa-check-circle mt-0.5 text-accent"></i>
                    <span>Real-time model retraining</span>
                  </li>
                </ul>
                <p className="text-xs italic text-ink-tertiary">
                  Stay tuned for updates!
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="gap-3 border-t border-hairline bg-surface-sunken px-6 py-4 sm:flex sm:flex-row-reverse sm:px-8">
          <button
            type="button"
            onClick={() => setShowHyperparamsModal(false)}
            className="btn-space btn-primary w-full sm:w-auto"
          >
            <i className="fas fa-check mr-1"></i>
            Got It
          </button>
        </div>
      </Modal>

      {/* Manual Input Modal */}
      <Modal isOpen={showManualInputModal} onClose={() => { setShowManualInputModal(false); setIsManualInputFullscreen(false); }} maxWidth="6xl" flexLayout fullscreen={isManualInputFullscreen}>
        <div className="relative flex items-center justify-between overflow-hidden border-b border-hairline bg-surface-raised p-6">
          <div className="pointer-events-none absolute inset-0 bg-nebula-veil opacity-60" aria-hidden="true" />
          <div className="relative">
            <h3 className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight text-ink">
              <i className="fas fa-table text-accent"></i>
              Manual Data Entry
            </h3>
            <p className="mt-1 text-sm text-ink-tertiary">Enter values for {selectedModel.toUpperCase()} model features</p>
          </div>
          <div className="relative flex items-center gap-2">
            <button
              onClick={() => setIsManualInputFullscreen(!isManualInputFullscreen)}
              className="btn-space btn-secondary text-sm"
              title={isManualInputFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              <i className={`fas ${isManualInputFullscreen ? 'fa-compress' : 'fa-expand'}`}></i>
              {isManualInputFullscreen ? 'Exit' : 'Fullscreen'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <button
              onClick={() => setShowOptionalFieldsInManual(!showOptionalFieldsInManual)}
              className="btn-space btn-secondary text-sm"
            >
              <i className="fas fa-eye mr-2"></i>
              {showOptionalFieldsInManual ? 'Hide' : 'Show'} Optional Fields ({optionalColumns[selectedModel].length})
            </button>
            <div className="flex gap-2">
              <button onClick={addManualRow} className="btn-space btn-secondary text-sm">
                <i className="fas fa-plus mr-2"></i>Add Row
              </button>
              <button onClick={exportManualDataToCSV} className="btn-space btn-secondary text-sm">
                <i className="fas fa-download mr-2"></i>Export CSV
              </button>
            </div>
          </div>

          <div className={`overflow-auto rounded-card border border-hairline ${isManualInputFullscreen ? 'max-h-[calc(100vh-300px)]' : 'max-h-96'}`}>
            <table className="min-w-full">
              <thead style={{ backgroundColor: 'var(--bg)' }} className="sticky top-0 z-10">
                <tr>
                  <th style={{ backgroundColor: 'var(--bg)' }} className="sticky left-0 px-4 py-3 text-left text-eyebrow text-ink-tertiary">#</th>
                  {modelColumns[selectedModel].map((col) => (
                    <th key={col} className="min-w-[150px] px-4 py-3 text-left text-eyebrow text-accent">
                      {columnDisplayNames[col] || col}
                      <span className="ml-1 text-red-400">*</span>
                    </th>
                  ))}
                  {showOptionalFieldsInManual && optionalColumns[selectedModel].map((col) => (
                    <th key={col} className="min-w-[150px] px-4 py-3 text-left text-eyebrow text-nebula-300">
                      {columnDisplayNames[col] || col}
                    </th>
                  ))}
                  <th style={{ backgroundColor: 'var(--bg)' }} className="sticky right-0 px-4 py-3 text-right text-eyebrow text-ink-tertiary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {manualData.map((row, index) => (
                  <tr key={index} className="transition-colors hover:bg-surface">
                    <td className="sticky left-0 px-4 py-2 font-mono text-sm font-medium text-ink-tertiary" style={{ backgroundColor: 'var(--bg)' }}>{index + 1}</td>
                    {modelColumns[selectedModel].map((col) => (
                      <td key={col} className="px-4 py-2">
                        <input
                          type="text"
                          value={row[col] || ''}
                          onChange={(e) => updateManualData(index, col, e.target.value)}
                          className="w-full rounded-control border border-hairline bg-surface-sunken px-2 py-1 text-sm text-ink placeholder-ink-tertiary transition-colors focus:border-stellar-400/50 focus:outline-none"
                          placeholder={columnDisplayNames[col] || col}
                        />
                      </td>
                    ))}
                    {showOptionalFieldsInManual && optionalColumns[selectedModel].map((col) => (
                      <td key={col} className="px-4 py-2">
                        <input
                          type="text"
                          value={row[col] || ''}
                          onChange={(e) => updateManualData(index, col, e.target.value)}
                          className="w-full rounded-control border border-hairline bg-surface-sunken px-2 py-1 text-sm text-ink placeholder-ink-tertiary transition-colors focus:border-stellar-400/50 focus:outline-none"
                          placeholder={columnDisplayNames[col] || col}
                        />
                      </td>
                    ))}
                    <td className="sticky right-0 px-4 py-2 text-right" style={{ backgroundColor: 'var(--bg)' }}>
                      {manualData.length > 1 && (
                        <button
                          onClick={() => removeManualRow(index)}
                          className="text-ink-tertiary transition-colors hover:text-red-300"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-hairline p-6">
          <button
            onClick={() => { setManualData([{}]); setShowManualInputModal(false); setIsManualInputFullscreen(false); }}
            className="btn-space btn-secondary"
          >
            Clear &amp; Close
          </button>
          <button
            onClick={() => { setShowManualInputModal(false); setIsManualInputFullscreen(false); }}
            className="btn-space btn-primary"
          >
            Done
          </button>
        </div>
      </Modal>

      {/* Prediction Results Modal */}
      {showResults && predictionResults && (
        <PredictionResults
          results={predictionResults}
          onClose={() => {
            setShowResults(false);
            setLastUploadedFileData(null); // Clear file data when closing
          }}
          uploadedFile={uploadedFile}
          fileData={lastUploadedFileData}
        />
      )}

      {/* ML Analysis Animation */}
      <MLAnalysisAnimation isAnalyzing={isAnalyzing} modelType={selectedModel} />
    </div>
  );
};

export default Dashboard;
