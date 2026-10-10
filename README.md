# ASTRA PME
### Project Monitoring Environment with Decision Support

ASTRA PME is a working prototype for predictive monitoring, data trust verification, risk trajectory analysis, and decision support for PAIMANA/OCMS infrastructure projects.

It runs locally from VS Code on real empirical monthly flash report datasets (April 2026 – July 2026), with real ML models, genuine feature engineering, temporal validation holdout, and zero mock data.

---

## 1. System Architecture

```text
PAIMANA / OCMS Monthly CSVs
[2026-04, 2026-05, 2026-06, 2026-07]
                 │
                 ▼
      [Canonical Data Loader]
  (Longitudinal alignment & MoM velocities)
                 │
  ┌──────────────┼───────────────────────────┐
  ▼              ▼                           ▼
[Field Audit]  [Contradiction Ledger]     [Feature Engineering]
(Quality scan) (Logical conflict rules)   (25+ Engineered signals)
  │              │                           │
  └──────────────┼───────────────────────────┘
                 │
                 ▼
      [ML Risk Engine & Models]
   Train: Apr+May | Val: Jun | Holdout: Jul
   - Cost Model (Balanced Logistic)
   - Schedule Model (HistGradientBoosting)
   - Implementation Model (XGBoost)
   - Overall Composite (XGBoost)
   - Anomaly Detector (IsolationForest)
                 │
  ┌──────────────┼───────────────────────────┬──────────────────────┐
  ▼              ▼                           ▼                      ▼
[Risk Trajectory] [Early Warning 3M/6M/12M] [SHAP/Tree Drivers] [Peer Benchmarks]
(Velocity/Accel)  (Dampened horizons)       (Attribution direction)(Cohort stats)
  │              │                           │                      │
  └──────────────┴─────────────┬─────────────┴──────────────────────┘
                               │
                               ▼
                   [FastAPI Backend Engine]
                               │
                               ▼
            [VS Code Themed React + ECharts UI]
                               │
                 [Deterministic Rules Assistant]
       (Architecture pre-configured for future Ollama/Qwen 2.5 3B)
```

---

## 2. Key Capabilities & Empirical Pipeline

1. **Direct Data Ingestion (4 Real Monthly Datasets):**
   - Ingests `2026-04.csv` (1,981 projects), `2026-05.csv` (1,889 projects), `2026-06.csv` (1,847 projects), and `2026-07.csv` (1,775 projects).
   - Tracks 1,603 projects occurring across all 4 consecutive months.
2. **Temporal Supervised Training & Holdout:**
   - **Training Set (3,686 samples):** April (t0) → May (t1) and May (t0) → June (t1) transitions.
   - **Validation Set (1,732 samples):** June (t0) → July (t1) transition.
   - **Holdout Test Set (1,775 samples):** July 2026 snapshot remains strictly unseen during model fitting.
3. **Data Trust Engine:**
   - **Field Audit:** Evaluates schema missingness, out-of-bounds metrics, parse flags, and generates a Data Confidence Score (0–100%) per project.
   - **Contradiction Ledger:** Detects logical anomalies (over-expenditure, progress-expenditure divergence, start-after-DOC ordering, non-monotonic progress/expenditure regression across months).
   - **Exit Ledger:** Transparent rules evaluating physical completion + financial consistency + zero critical contradictions for exit readiness (`EXIT CANDIDATE`, `REVIEW REQUIRED`, `ACTIVE`).
4. **Risk Trajectory Engine:**
   - Measures Risk Velocity ($\Delta \text{Risk}/\text{month}$) and Risk Acceleration ($\Delta \text{Velocity}/\text{month}$) across April–July.
   - Classifies trajectory into `STABLE`, `IMPROVING`, `DETERIORATING`, or `RAPIDLY DETERIORATING`.
5. **Multi-Horizon Early Warning:**
   - Projects 3-month, 6-month, and 12-month forward risk with empirical uncertainty intervals.
6. **Model-Derived Drivers & Benchmarking:**
   - Real feature attribution vectors showing top push factors and directions.
   - Peer group comparisons against sector, agency, and state cohorts.
7. **Deterministic Decision Support Assistant:**
   - Natural language query interface retrieving real project data, drivers, contradictions, benchmarks, and portfolio bottlenecks.
   - Pre-configured for future Ollama + Qwen 2.5 3B plug-in.

---

## 3. Directory Layout

```text
astra-pme/
├── backend/
│   ├── main.py                     # FastAPI application entrypoint & CORS setup
│   ├── api/
│   │   ├── __init__.py
│   │   └── router.py               # REST API endpoints (/overview, /projects, /watchlist, etc.)
│   ├── services/
│   │   ├── data_loader.py          # Longitudinal data normalization & cache
│   │   ├── audit_service.py        # Schema validation & project confidence scores
│   │   ├── contradiction_service.py # Logical conflict & cross-month regression rules
│   │   ├── exit_service.py         # Completion & exit candidate verification
│   │   ├── risk_service.py         # Multi-model risk probability & band assignment
│   │   ├── trajectory_service.py   # Longitudinal velocity & acceleration engine
│   │   ├── early_warning_service.py# Forward forecast projections & uncertainty
│   │   ├── driver_service.py       # Feature attribution & directional impact
│   │   ├── benchmark_service.py    # Sector, agency, and state cohort statistics
│   │   ├── watchlist_service.py    # Top-50 composite multi-attribute ranker
│   │   ├── assistant_service.py    # Deterministic rules-based reasoning assistant
│   │   └── model_card_service.py   # Model specifications & validation metrics
│   └── utils/
│       └── json_cleaner.py         # Float NaN sanitizer for JSON responses
├── ml/
│   ├── features.py                 # Feature engineering definitions
│   ├── targets.py                  # Temporal next-month deterioration target builder
│   ├── train.py                    # Supervised training & model selection
│   ├── evaluate.py                 # July holdout evaluation
│   ├── explain.py                  # Model feature attribution explainer
│   ├── anomaly.py                  # IsolationForest structural anomaly detector
│   └── artifacts/                  # Saved .pkl models & validation metadata JSONs
├── data/
│   ├── raw/                        # 2026-04.csv, 2026-05.csv, 2026-06.csv, 2026-07.csv
│   └── processed/                  # Canonical longitudinal dataset cache
├── frontend/
│   ├── src/
│   │   ├── layouts/AppLayout.tsx   # VS Code-style persistent sidebar & layout
│   │   ├── pages/                  # 12 complete operational views
│   │   ├── components/charts/      # Apache ECharts components
│   │   ├── components/common/      # Badges, metric cards, project links
│   │   └── services/api.ts         # Typed API client
│   ├── tailwind.config.js          # VS Code technical palette
│   └── package.json
└── README.md
```

---

## 4. How to Run Locally

### Prerequisites
- **Python 3.12**
- **Node.js 18+ / 20+**

### Step 1: Install Python Dependencies & Train Models
```bash
# From the project root directory
pip install fastapi uvicorn pydantic pandas numpy scipy statsmodels scikit-learn xgboost shap

# Run supervised model training across April, May, and June
python ml/train.py

# Evaluate holdout on July 2026
python ml/evaluate.py
```

### Step 2: Start the FastAPI Backend
```bash
# Run FastAPI on port 8000
python backend/main.py
# or: uvicorn backend.main:app --reload --port 8000
```
Backend API interactive documentation is available at: `http://localhost:8000/docs`.

### Step 3: Start the Frontend Application
```bash
# In a separate terminal, navigate to frontend/
cd frontend
npm install
npm run dev
```
Open your browser at `http://localhost:5173` to access the ASTRA PME environment.

---

## 5. Model Validation & Selection Summary

| Failure Mode Target | Selected Algorithm | Validation ROC-AUC | Validation PR-AUC | Validation F1 | Selection Rationale |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Cost Risk** | Balanced Logistic Regression | **0.7738** | 0.1344 | 0.1866 | Superior sensitivity on rare cost escalation events (~0.8% base rate). |
| **Schedule Risk** | HistGradientBoosting | **0.8610** | **0.6368** | 0.5857 | Optimal tree partitioning on milestone date slippages. |
| **Implementation Risk** | XGBoost | **0.8228** | **0.8053** | **0.7129** | Captures non-linear interactions between progress stalls and capital burn. |
| **Overall Composite** | XGBoost | **0.8064** | **0.8512** | **0.7487** | High precision (83.2%) and PR-AUC for portfolio triage. |
| **Data Anomaly** | IsolationForest | — | — | — | Unsupervised structural data anomaly detection (0–100 score). |

---

## 6. Methodological Guardrails & Limitations

1. **Temporal Ground Truth:** Ground truth labels are derived exclusively from observed consecutive month-over-month transitions (April → May → June → July). The system does NOT fabricate unverified 12-month future outcomes.
2. **Deterministic Rules Assistant:** In this version, the decision assistant utilizes deterministic Python rule retrievals and packaged evidence vectors. It operates 100% locally with zero cloud API dependencies.
3. **Future Extension:** The `AssistantService` is architected with an `EvidencePackager` pattern to allow dropping in Ollama + Qwen 2.5 3B with a Grounding Validator in subsequent releases.
AUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review testAUTOMATIC PR review test
