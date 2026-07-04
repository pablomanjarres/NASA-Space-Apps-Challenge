/**
 * Key-free DEMO mode — helpers + canned fixtures.
 * ---------------------------------------------------------------------------
 * When DEMO mode is ON (the default for the built/deployed site), the app runs
 * WITHOUT the live Python / Cloud Run backend and WITHOUT any API keys:
 *
 *   1. CSV-upload → predict and manual-entry → predict return a realistic
 *      canned prediction fixture (built by `buildDemoUploadResponse`) instead
 *      of calling the backend. It is subtly labeled as sample/demo data
 *      (job id `demo-…`, a `message` string, and a `demo: true` flag).
 *   2. Public Supabase dataset browsing still runs; if a fetch throws, the data
 *      loader falls back to the small BUNDLED sample rows here so the
 *      Exoplanets table + Visualizations always render (never a blank screen).
 *   3. The AI chatbot returns the graceful `demoChatReply()` message instead of
 *      erroring on a missing OpenAI key.
 *
 * DEMO is ON unless `PUBLIC_DEMO` is explicitly set to a falsy string
 * ('false' | '0' | 'off' | 'no'). This keeps every REAL code path intact for
 * anyone who opts out with `PUBLIC_DEMO=false` (and a live backend / keys).
 *
 * NOTE: types are imported with `import type` only, so this module has no
 * runtime dependency on the services that import it (no circular import).
 */

import type { ModelInfo, PredictionResult, SpaceData, UploadResponse } from '../services/api';
import type { DatasetMetadata, DatasetType } from '../services/dataLoader';

// ---------------------------------------------------------------------------
// DEMO flag
// ---------------------------------------------------------------------------

/**
 * Whether the app is running in key-free DEMO mode.
 * Default: ON (so the deployed site works with no backend and no env vars set).
 * Set `PUBLIC_DEMO=false` (or `0` / `off` / `no`) to restore the real backend
 * code paths. `import.meta.env.PUBLIC_DEMO` is inlined at build time by Vite/
 * Astro for both the client bundle and server API routes.
 */
export function isDemoMode(): boolean {
  const raw = import.meta.env.PUBLIC_DEMO;
  if (raw === undefined || raw === null || raw === '') return true; // default ON
  const v = String(raw).trim().toLowerCase();
  return !(v === 'false' || v === '0' || v === 'off' || v === 'no');
}

// ---------------------------------------------------------------------------
// Small deterministic helpers (stable output for a given input → feels real)
// ---------------------------------------------------------------------------

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Seeded PRNG (mulberry32) → deterministic sequence in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round3 = (n: number): number => Math.round(n * 1000) / 1000;

function randomId(len = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// ---------------------------------------------------------------------------
// Prediction fixtures (disposition + probability + per-feature importances)
// ---------------------------------------------------------------------------

/** The three dispositions the demo classifier emits. */
export const DEMO_CLASSES = ['CONFIRMED', 'CANDIDATE', 'FALSE POSITIVE'] as const;

/**
 * Per-feature importances included with each demo prediction fixture. Values
 * sum to ~1.0 per dataset. (Honest sample weights — not from a live model.)
 */
export const DEMO_FEATURE_IMPORTANCES: Record<DatasetType, Record<string, number>> = {
  kepler: {
    koi_score: 0.19,
    koi_model_snr: 0.15,
    koi_prad: 0.13,
    koi_period: 0.11,
    koi_depth: 0.1,
    koi_duration: 0.08,
    koi_teq: 0.08,
    koi_insol: 0.06,
    koi_steff: 0.05,
    koi_srad: 0.05,
  },
  tess: {
    pl_trandep: 0.18,
    pl_rade: 0.15,
    pl_orbper: 0.13,
    pl_trandurh: 0.11,
    pl_eqt: 0.1,
    pl_insol: 0.09,
    st_teff: 0.08,
    st_rad: 0.06,
    st_tmag: 0.05,
    st_dist: 0.05,
  },
};

function inferDatasetType(headers: string[], fileName?: string): DatasetType {
  const h = headers.map((x) => x.toLowerCase());
  if (h.some((x) => x.startsWith('koi_') || x === 'kepid' || x === 'kepler_name' || x === 'kepoi_name')) {
    return 'kepler';
  }
  if (h.some((x) => x.startsWith('pl_') || x.startsWith('st_') || x === 'toi' || x === 'tid' || x === 'tfopwg_disp')) {
    return 'tess';
  }
  const fn = (fileName || '').toLowerCase();
  if (fn.includes('kepler')) return 'kepler';
  if (fn.includes('tess')) return 'tess';
  return 'kepler';
}

/** Build a single row's disposition + a plausible confidence distribution. */
function demoRowPrediction(rand: () => number): { predicted_class: string; confidence: Record<string, number> } {
  const pick = rand();
  const predicted = pick < 0.45 ? 'CONFIRMED' : pick < 0.8 ? 'CANDIDATE' : 'FALSE POSITIVE';

  const top = round3(0.62 + rand() * 0.35); // 0.62 – 0.97
  const remainder = 1 - top;
  const split = 0.3 + rand() * 0.4;
  const others = DEMO_CLASSES.filter((c) => c !== predicted);

  const confidence: Record<string, number> = {};
  confidence[predicted] = top;
  confidence[others[0]] = round3(remainder * split);
  // last one absorbs any rounding drift so the row sums to ~1.0
  confidence[others[1]] = round3(1 - top - confidence[others[0]]);
  return { predicted_class: predicted, confidence };
}

/** Generate `count` canned prediction rows for a dataset. */
export function makeDemoPredictions(
  count: number,
  datasetType: DatasetType,
  jobId: string,
  seed = `${datasetType}:${count}:${jobId}`,
): PredictionResult[] {
  const rand = mulberry32(hashString(seed));
  const createdAt = new Date().toISOString();
  return Array.from({ length: count }, (_, i) => {
    const { predicted_class, confidence } = demoRowPrediction(rand);
    return {
      job_id: jobId,
      row_index: i,
      dataset_type: datasetType,
      predicted_class,
      confidence,
      created_at: createdAt,
    };
  });
}

/**
 * Canned replacement for `apiService.uploadAndPredict`. Reads the uploaded CSV
 * (if any) to size + type the result so it feels like a real run, then returns
 * a fully-formed `UploadResponse` labeled as demo/sample data.
 */
export async function buildDemoUploadResponse(file?: File | null): Promise<UploadResponse> {
  let headers: string[] = [];
  let dataRows = 0;
  const fileName = file?.name;

  if (file) {
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length > 0) headers = lines[0].split(',').map((s) => s.trim());
      dataRows = Math.max(0, lines.length - 1);
    } catch {
      /* unreadable file → fall back to defaults below */
    }
  }

  const datasetType = inferDatasetType(headers, fileName);
  const total = Math.min(Math.max(dataRows || 12, 1), 60); // clamp 1..60, default 12
  const jobId = `demo-${randomId()}`;
  const predictions = makeDemoPredictions(total, datasetType, jobId, `${fileName || 'manual'}:${total}`);

  const response: UploadResponse = {
    success: true,
    message: 'Demo mode — sample predictions generated offline (no live model or API key).',
    job_id: jobId,
    dataset_type: datasetType,
    file_url: '',
    total_predictions: total,
    predictions,
  };
  // Honest extras attached to the fixture (not part of the strict interface).
  (response as UploadResponse & { feature_importances?: Record<string, number>; demo?: boolean }).feature_importances =
    DEMO_FEATURE_IMPORTANCES[datasetType];
  (response as UploadResponse & { demo?: boolean }).demo = true;
  return response;
}

/** Canned replacement for `apiService.getModelInfo`. */
export function demoModelInfo(): ModelInfo {
  return {
    framework: 'TensorFlow / scikit-learn (demo)',
    architecture: 'Gradient-Boosted Ensemble + Dense NN',
    input_shape: [1, 22],
    optimizer: 'Adam',
  };
}

// ---------------------------------------------------------------------------
// Bundled sample datasets (fallback for Supabase browsing failures)
// ---------------------------------------------------------------------------

/** A small, representative Kepler sample (real named worlds + a few others). */
export const DEMO_KEPLER_ROWS: Array<Record<string, any>> = [
  { kepid: 10593626, kepler_name: 'Kepler-22 b', kepoi_name: 'K00087.01', koi_disposition: 'CONFIRMED', koi_pdisposition: 'CANDIDATE', koi_score: 0.98, koi_period: 289.8623, koi_duration: 7.41, koi_depth: 492, koi_prad: 2.38, koi_teq: 262, koi_insol: 1.11, koi_model_snr: 34.2, koi_steff: 5518, koi_slogg: 4.44, koi_srad: 0.98, koi_sma: 0.849, ra: 290.6685, dec: 47.8848, koi_kepmag: 11.664 },
  { kepid: 8120608, kepler_name: 'Kepler-186 f', kepoi_name: 'K00571.05', koi_disposition: 'CONFIRMED', koi_pdisposition: 'CANDIDATE', koi_score: 0.94, koi_period: 129.9441, koi_duration: 3.45, koi_depth: 322, koi_prad: 1.17, koi_teq: 188, koi_insol: 0.29, koi_model_snr: 12.8, koi_steff: 3788, koi_slogg: 4.69, koi_srad: 0.47, koi_sma: 0.432, ra: 298.2705, dec: 43.9525, koi_kepmag: 15.291 },
  { kepid: 8311864, kepler_name: 'Kepler-452 b', kepoi_name: 'K07016.01', koi_disposition: 'CONFIRMED', koi_pdisposition: 'CANDIDATE', koi_score: 0.91, koi_period: 384.843, koi_duration: 10.65, koi_depth: 200, koi_prad: 1.63, koi_teq: 265, koi_insol: 1.1, koi_model_snr: 11.6, koi_steff: 5757, koi_slogg: 4.32, koi_srad: 1.11, koi_sma: 1.046, ra: 291.7538, dec: 44.2775, koi_kepmag: 13.426 },
  { kepid: 4138008, kepler_name: 'Kepler-442 b', kepoi_name: 'K04742.01', koi_disposition: 'CONFIRMED', koi_pdisposition: 'CANDIDATE', koi_score: 0.96, koi_period: 112.3053, koi_duration: 5.01, koi_depth: 380, koi_prad: 1.34, koi_teq: 233, koi_insol: 0.7, koi_model_snr: 18.9, koi_steff: 4402, koi_slogg: 4.63, koi_srad: 0.6, koi_sma: 0.409, ra: 285.6791, dec: 39.2802, koi_kepmag: 14.976 },
  { kepid: 9002278, kepler_name: 'Kepler-62 f', kepoi_name: 'K00701.04', koi_disposition: 'CONFIRMED', koi_pdisposition: 'CANDIDATE', koi_score: 0.93, koi_period: 267.291, koi_duration: 6.92, koi_depth: 420, koi_prad: 1.41, koi_teq: 208, koi_insol: 0.41, koi_model_snr: 15.4, koi_steff: 4925, koi_slogg: 4.68, koi_srad: 0.64, koi_sma: 0.718, ra: 283.2131, dec: 45.3499, koi_kepmag: 13.965 },
  { kepid: 8692861, kepler_name: 'Kepler-69 c', kepoi_name: 'K00172.02', koi_disposition: 'CONFIRMED', koi_pdisposition: 'CANDIDATE', koi_score: 0.88, koi_period: 242.4613, koi_duration: 8.34, koi_depth: 289, koi_prad: 1.71, koi_teq: 299, koi_insol: 1.91, koi_model_snr: 10.3, koi_steff: 5638, koi_slogg: 4.4, koi_srad: 0.93, koi_sma: 0.64, ra: 289.7092, dec: 44.8637, koi_kepmag: 13.7 },
  { kepid: 3542116, kepler_name: null, kepoi_name: 'K02418.02', koi_disposition: 'CANDIDATE', koi_pdisposition: 'CANDIDATE', koi_score: 0.62, koi_period: 86.829, koi_duration: 4.11, koi_depth: 156, koi_prad: 1.92, koi_teq: 341, koi_insol: 3.42, koi_model_snr: 8.1, koi_steff: 5411, koi_slogg: 4.5, koi_srad: 0.86, koi_sma: 0.371, ra: 292.081, dec: 38.6402, koi_kepmag: 14.51 },
  { kepid: 6021275, kepler_name: null, kepoi_name: 'K03145.01', koi_disposition: 'FALSE POSITIVE', koi_pdisposition: 'FALSE POSITIVE', koi_score: 0.03, koi_period: 3.5221, koi_duration: 2.18, koi_depth: 18450, koi_prad: 18.4, koi_teq: 1284, koi_insol: 512.6, koi_model_snr: 210.7, koi_steff: 6034, koi_slogg: 4.21, koi_srad: 1.42, koi_sma: 0.047, ra: 294.13, dec: 41.3355, koi_kepmag: 12.88 },
  { kepid: 3149956, kepler_name: 'Kepler-1649 c', kepoi_name: 'K02719.02', koi_disposition: 'CONFIRMED', koi_pdisposition: 'CANDIDATE', koi_score: 0.9, koi_period: 19.5354, koi_duration: 1.72, koi_depth: 540, koi_prad: 1.06, koi_teq: 234, koi_insol: 0.75, koi_model_snr: 9.4, koi_steff: 3240, koi_slogg: 4.9, koi_srad: 0.25, koi_sma: 0.083, ra: 296.83, dec: 41.7627, koi_kepmag: 17.2 },
  { kepid: 11446443, kepler_name: 'Kepler-1 b', kepoi_name: 'K00001.01', koi_disposition: 'CONFIRMED', koi_pdisposition: 'CANDIDATE', koi_score: 0.86, koi_period: 2.4706, koi_duration: 1.82, koi_depth: 14300, koi_prad: 13.4, koi_teq: 1398, koi_insol: 682.1, koi_model_snr: 1892.4, koi_steff: 5853, koi_slogg: 4.15, koi_srad: 1.24, koi_sma: 0.036, ra: 291.1755, dec: 49.3164, koi_kepmag: 11.34 },
];

/** A small, representative TESS (TOI) sample. */
export const DEMO_TESS_ROWS: Array<Record<string, any>> = [
  { toi: 700.01, tid: 150428135, tfopwg_disp: 'KP', rastr: '06:28:22.9', decstr: '-65:34:43', ra: 97.0954, dec: -65.5786, pl_orbper: 37.4243, pl_rade: 1.14, pl_eqt: 268, pl_insol: 0.87, pl_trandep: 610, pl_trandurh: 2.44, st_rad: 0.42, st_teff: 3480, st_logg: 4.78, st_dist: 31.13, st_tmag: 11.9 },
  { toi: 715.01, tid: 271971130, tfopwg_disp: 'PC', rastr: '07:14:12.1', decstr: '-45:03:22', ra: 108.5504, dec: -45.0561, pl_orbper: 19.288, pl_rade: 1.55, pl_eqt: 234, pl_insol: 0.67, pl_trandep: 1420, pl_trandurh: 1.98, st_rad: 0.37, st_teff: 3470, st_logg: 4.86, st_dist: 42.41, st_tmag: 13.7 },
  { toi: 1231.01, tid: 254113311, tfopwg_disp: 'CP', rastr: '09:16:37.4', decstr: '-64:12:05', ra: 139.1558, dec: -64.2013, pl_orbper: 24.246, pl_rade: 3.65, pl_eqt: 330, pl_insol: 3.45, pl_trandep: 2890, pl_trandurh: 3.51, st_rad: 0.42, st_teff: 3553, st_logg: 4.83, st_dist: 27.49, st_tmag: 10.3 },
  { toi: 270.02, tid: 259377017, tfopwg_disp: 'CP', rastr: '04:33:40.0', decstr: '-51:57:24', ra: 68.4167, dec: -51.9566, pl_orbper: 5.6604, pl_rade: 2.36, pl_eqt: 490, pl_insol: 18.6, pl_trandep: 1990, pl_trandurh: 1.82, st_rad: 0.38, st_teff: 3506, st_logg: 4.87, st_dist: 22.48, st_tmag: 10.1 },
  { toi: 1452.01, tid: 420112589, tfopwg_disp: 'PC', rastr: '19:20:52.6', decstr: '+73:12:11', ra: 290.219, dec: 73.2031, pl_orbper: 11.0623, pl_rade: 1.67, pl_eqt: 326, pl_insol: 1.8, pl_trandep: 1710, pl_trandurh: 1.63, st_rad: 0.28, st_teff: 3185, st_logg: 4.98, st_dist: 30.53, st_tmag: 11.9 },
  { toi: 849.01, tid: 33595516, tfopwg_disp: 'CP', rastr: '00:52:44.5', decstr: '-41:53:18', ra: 13.1854, dec: -41.8884, pl_orbper: 0.7655, pl_rade: 3.44, pl_eqt: 1800, pl_insol: 5210, pl_trandep: 480, pl_trandurh: 2.13, st_rad: 0.92, st_teff: 5372, st_logg: 4.42, st_dist: 76.86, st_tmag: 10.9 },
  { toi: 4306.01, tid: 44898913, tfopwg_disp: 'PC', rastr: '05:36:26.0', decstr: '-46:44:15', ra: 84.1085, dec: -46.7375, pl_orbper: 8.4574, pl_rade: 1.37, pl_eqt: 272, pl_insol: 1.02, pl_trandep: 2260, pl_trandurh: 1.29, st_rad: 0.16, st_teff: 2871, st_logg: 5.06, st_dist: 32.32, st_tmag: 14.8 },
  { toi: 561.02, tid: 377064495, tfopwg_disp: 'FP', rastr: '09:52:44.4', decstr: '+06:12:57', ra: 148.185, dec: 6.2159, pl_orbper: 0.4465, pl_rade: 1.45, pl_eqt: 1720, pl_insol: 4890, pl_trandep: 350, pl_trandurh: 1.02, st_rad: 0.85, st_teff: 5455, st_logg: 4.5, st_dist: 84.06, st_tmag: 9.5 },
];

export function demoDatasetRows(datasetType: DatasetType): Array<Record<string, any>> {
  return datasetType === 'tess' ? DEMO_TESS_ROWS : DEMO_KEPLER_ROWS;
}

/** Metadata describing the bundled single-chunk sample for a dataset. */
export function demoDatasetMetadata(datasetType: DatasetType): DatasetMetadata {
  const rows = demoDatasetRows(datasetType);
  return {
    total_rows: rows.length,
    chunk_size: rows.length,
    total_chunks: 1,
    columns: Object.keys(rows[0] || {}),
  };
}

/** Bundled sample as `SpaceData[]` (for `apiService.getDatasets` fallback). */
export function demoSpaceData(datasetType: DatasetType = 'kepler'): SpaceData[] {
  return demoDatasetRows(datasetType).map((row, i) => ({ id: `demo-${datasetType}-${i}`, ...row })) as SpaceData[];
}

// ---------------------------------------------------------------------------
// AI chatbot fixture
// ---------------------------------------------------------------------------

/** Graceful, honest canned reply used when there is no OpenAI key / DEMO is on. */
export function demoChatReply(): string {
  return (
    "🛰️ Demo mode is on, so I'm replying with a canned message instead of a live model.\n\n" +
    'In this offline demo the exoplanet predictions and dataset browsing use bundled sample data. ' +
    'The CONFIRMED / CANDIDATE / FALSE POSITIVE labels and the confidence bars you see come from a ' +
    'sample classifier — great for exploring the interface, but not a live inference run.\n\n' +
    'To enable live AI chat, deploy with an `OPENAI_API_KEY` and set `PUBLIC_DEMO=false`. ' +
    'Ask me again then and I can dig into specific planets, habitability, and detection methods. ✨'
  );
}

/** OpenAI-shaped payload returned by the chat API route in demo / no-key mode. */
export function demoChatResponsePayload(limit = 20) {
  return {
    demo: true,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: demoChatReply() },
        finish_reason: 'stop',
      },
    ],
    rateLimit: { remaining: limit, limit },
  };
}

// ---------------------------------------------------------------------------
// Recent-activity fixture (replaces the hardcoded localhost:8000 log fetch)
// ---------------------------------------------------------------------------

export interface DemoActivity {
  id: number;
  message: string;
  created_at: string;
}

/** A few plausible, recent system events for the dashboard's Recent Activity. */
export function demoRecentActivity(): DemoActivity[] {
  const now = Date.now();
  const min = 60 * 1000;
  const entries: Array<{ message: string; ago: number }> = [
    { message: 'New exoplanet candidate detected in TESS sector 42 batch', ago: 6 * min },
    { message: 'Kepler classification model retrained — accuracy 94.1%', ago: 48 * min },
    { message: 'Imported 1,204 KOI rows from NASA Exoplanet Archive', ago: 3 * 60 * min },
    { message: 'Habitability experiment queued for 8 candidate worlds', ago: 9 * 60 * min },
    { message: 'Sample dataset cache refreshed from Supabase Storage', ago: 22 * 60 * min },
    { message: 'Demo mode active — running without the live backend', ago: 26 * 60 * min },
    { message: 'TESS light-curve preprocessing pipeline completed', ago: 30 * 60 * min },
    { message: 'System health check passed — all services nominal', ago: 47 * 60 * min },
  ];
  return entries.map((e, i) => ({
    id: i + 1,
    message: e.message,
    created_at: new Date(now - e.ago).toISOString(),
  }));
}
