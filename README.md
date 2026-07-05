<div align="center">

<img src=".github/banner.webp" width="100%">

# GRIT-X-AWA

<em>Classify exoplanet candidates from NASA Kepler and TESS data with a gradient-boosting ensemble, keyless demo included.</em>

<br>

![Astro 5](https://img.shields.io/badge/Astro-5-FF5D01?logo=astro&logoColor=white)
![React 18](https://img.shields.io/badge/React-18-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![three.js](https://img.shields.io/badge/three.js-r167-000000?logo=three.js&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?logo=scikitlearn&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)
![Cloud Run](https://img.shields.io/badge/Google%20Cloud%20Run-4285F4?logo=googlecloud&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)

![status: prototype](https://img.shields.io/badge/status-prototype-8b6dff)
[![Portfolio write-up](https://img.shields.io/badge/portfolio-write--up-c8542a)](https://pablomanjarres.com/portfolio/projects/grit-x-awa)
[![Landing page](https://img.shields.io/badge/landing-page-c8542a)](https://pablomanjarres.com/oss/grit-x-awa)

<br>

<img src="https://pablomanjarres.com/portfolio/previews/grit-x-awa.png" width="720">

</div>

GRIT-X-AWA is a web observatory for exoplanet classification. Upload a CSV from NASA's Kepler or TESS mission, or type a candidate in by hand, and a gradient-boosting ensemble returns a labeled disposition for every row with a confidence score across each class. A three.js starfield, a Mission Control dashboard, a paginated data browser, 3D orbital views, and an in-app chatbot make the whole pipeline explorable in the browser. It ships as a keyless public demo, so it runs with no backend and no API keys.

## Highlights

- **Two per-mission ensembles.** Kepler and TESS each get three gradient-boosting models, CatBoost, XGBoost, and LightGBM, combined by a fixed weighted soft vote: `argmax(0.40*Cat + 0.35*XGB + 0.25*LGBM)`. The weights and class order are pinned in each model's `meta.json`.
- **Two missions, nine classes.** Kepler reads 21 KOI features into 3 classes (`CANDIDATE`, `CONFIRMED`, `FALSE POSITIVE`). TESS reads 17 base features engineered into about 66 model inputs across 6 classes (`APC`, `CP`, `FA`, `FP`, `KP`, `PC`). The backend auto-detects which mission a CSV belongs to.
- **Keyless demo by default.** With `PUBLIC_DEMO` on (the default), CSV upload, manual entry, the Supabase data browser, and the chatbot fall back to deterministic canned fixtures and bundled sample rows, so the site never shows a blank screen or asks for a key. Set `PUBLIC_DEMO=false` to restore the real backend paths.
- **A three.js front end.** Astro 5 runs in SSR mode on the Vercel adapter with React 18 islands: a starfield landing (`SpaceScene`), the Mission Control dashboard, a react-three-fiber 3D orbital viewer (`ExoplanetVisualization3D`), and a full-page results modal that exports predictions to CSV and JSON.
- **A graceful chatbot.** The assistant is an Astro server endpoint (`/api/chat`) with per-IP rate limiting (20 messages per day) that degrades to a scripted reply when no model key is present.
- **A real prediction service.** FastAPI loads and caches the pickled models on startup and serves CSV upload, single predict, stats, and recent-prediction endpoints on Google Cloud Run. Supabase (Postgres plus Storage) persists uploads and prediction history when configured, and the service still runs in a local mode when the database is absent.

## How it works

```
              ┌───────────────────────────────────────────────┐
  browser ──▶ │  Astro 5 + React 18 islands  (three.js)        │
              │  landing · Mission Control · data browser ·    │
              │  3D orbital views · chatbot                    │
              └───────────────┬───────────────────────────────┘
                              │  CSV upload / manual entry
                 demo mode ON │  (default, keyless)
                     ┌────────┴─────────┐
                     ▼                  ▼
           canned fixtures       POST /api/v1/upload/csv
        (demoFixtures.ts)                │
                                         ▼
              ┌───────────────────────────────────────────────┐
              │  FastAPI service  (Google Cloud Run)           │
              │  auto-detect mission · impute · encode         │
              └───────────────┬───────────────────────────────┘
                              ▼
              ┌───────────────────────────────────────────────┐
              │  per-mission ensemble                          │
              │  0.40·CatBoost + 0.35·XGBoost + 0.25·LightGBM  │
              │  argmax -> disposition + per-class confidence  │
              └───────────────┬───────────────────────────────┘
                              ▼
              ┌───────────────────────────────────────────────┐
              │  Supabase  (Postgres + Storage)                │
              │  uploads · prediction history                  │
              └───────────────────────────────────────────────┘
```

Kepler and TESS each ship their own model bundle (`kepler/`, `tess/`): the three boosting pickles plus an imputer, label encoders, a target encoder, and a `meta.json` that fixes the feature order, vote weights, and class names. In demo mode the front end short-circuits the network hop and returns realistic fixtures, so the same UI works with or without a live backend.

## What's inside

| Path | What it is |
| --- | --- |
| `frontend/` | Astro 5 + React 18 client: starfield landing, Mission Control dashboard, data browser, 3D orbital views, chatbot |
| `backend/` | FastAPI service: CSV upload, single predict, stats, and recent-prediction endpoints |
| `backend/kepler/`, `backend/tess/` | Per-mission model bundles: CatBoost / XGBoost / LightGBM pickles, imputer, encoders, `meta.json` |
| `frontend/src/lib/demoFixtures.ts` | Keyless demo layer: canned predictions, bundled sample rows, scripted chatbot reply |
| `frontend/src/pages/api/chat.ts` | Astro SSR chat endpoint with per-IP daily rate limiting |
| `validate_csv.py` | Standalone validator for Kepler / TESS input columns |
| `zones.py` | Habitability-zone helpers used by planet and star classification |

## Tech stack

- **Frontend:** Astro 5 (SSR, Vercel adapter), React 18 islands, TypeScript 5, three.js r167 with react-three-fiber and @react-three/drei, Tailwind CSS v3, html2canvas.
- **Backend:** Python, FastAPI, Uvicorn, SQLAlchemy, pandas, numpy, scipy.
- **ML:** CatBoost, XGBoost, LightGBM, scikit-learn (imputation and encoding).
- **Data and infra:** Supabase (Postgres + Storage), Google Cloud Run (Docker), Vercel.

## Getting started

Run the keyless demo (no backend, no keys):

```bash
cd frontend
npm install
npm run dev        # http://localhost:4321  (demo mode is on by default)
```

Run the real prediction backend (optional):

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000   # http://127.0.0.1:8000/docs
```

Point the front end at the live backend:

```bash
# frontend/.env
PUBLIC_DEMO=false
# set the API base URL in src/services/api.ts (or VITE_API_URL)
```

Build for production:

```bash
cd frontend && npm run build    # SSR output for the Vercel adapter
```

## License

MIT. Copyright (c) 2025 GRIT-X-AWA. See [`LICENSE`](LICENSE).
