# Sanctuary+ — AI-Powered Healthcare System

![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C7?logo=typescript&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-12.0-E0234E?logo=nestjs&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![HeroUI](https://img.shields.io/badge/HeroUI-v3-000000?logoColor=white)
![Nx](https://img.shields.io/badge/Nx-23.1-1K1K1K?logo=nx&logoColor=white)

## Project Overview

**Sanctuary+** is a hackathon project for the problem statement:

> *"An AI-powered healthcare platform for reducing hospital overcrowding and improving patient safety through smart digital queues, automated clinical documentation, medication reconciliation, ward-level device/vitals correlation, and ICU deterioration monitoring."*

[Project Chronos](https://github.com/anomalyco/chronos) (ICU Early Warning System) is integrated as a feature module within the platform via a NestJS "Chronos Bridge" that calls the existing FastAPI engine (port 8000).

### Architecture

```
                       ┌──────────────────────────────────────────┐
                       │        React 19 + TS Frontend (Vite)      │
                       │   Hero UI v2 dashboard, port 5173         │
                       └─────────────────────┬────────────────────┘
                                             │  REST
                                             ▼
 ┌──────────────────────────────────────────────────────────────────────────┐
 │                        NestJS API Gateway (port 3000)                      │
 │  • Queue Module          • Docs Module        • Meds Module               │
 │  • WardSync Module       • Chronos Bridge      • Auth + RBAC               │
 │  • FHIR Integration      • Redis Pub/Sub        • PostgreSQL               │
 └───────────────┬──────────────────────────────────────────┬───────────────┘
                 │                                           │
                 ▼                                           ▼
        ┌───────────────────┐                  ┌────────────────────────────┐
        │  PostgreSQL / Redis│                  │  Existing Chronos (FastAPI) │
        │  (patients, meds,  │                  │  ICU Early Warning, 8000    │
        │   docs, devices)  │                  └────────────────────────────┘
        └───────────────────┘
```

## Features & ML vs Rule-Based Approach

| Feature | Approach | Description |
|---------|----------|-------------|
| **Chronos (ICU Early Warning)** | **ML** | Existing 4-engine ensemble (LGBM/XGBoost/GRU-D/TCN) — differentiator |
| **Smart Digital Queues** | **Rules** | ESI triage, bed assignment, acuity + wait-time weighting |
| **Clinical Documentation** | **ML + Rules** | TipTap editor + Whisper (future) voice; ClinicalBERT NER; structured data → FHIR |
| **Medication Reconciliation** | **Rules** | RxNorm exact/fuzzy matching, DrugBank DDI, allergy cross-check |
| **WardSync** | **Rules** | General-ward device state + NEWS2 trend correlation with evidence-backed review flags |

## Frontend Structure

The dashboard is a single-page app with a **navigation shell** in `src/App.tsx` (a `Drawer`-based sidebar that switches between feature pages) and one file per feature under `src/pages/`. Every page is a **default export** (`export default function XPage()`), keeping `App.tsx` thin.

UI is built with **Hero UI v3** (`@heroui/react@^3.2.4`), which is built on React Aria Components + **Tailwind CSS v4**. There is a hard requirement to install the `@react-aria/*` peers (`@react-aria/i18n`, `@react-aria/ssr`, `@react-aria/utils`, `react-aria`, `react-aria-components`) — these are **not** auto-installed when using `--legacy-peer-deps`, so they are explicit deps in `apps/frontend/package.json`.

Components used: `Card`, `Badge`, `Button`, `Tabs` (`Tabs.List` / `Tabs.Tab` / `Tabs.Panel`), `Input`, `Alert`, `ProgressBar`, `Avatar`, `Drawer` (`Drawer.Trigger` / `Drawer.Content` / `Drawer.Header` / `Drawer.Body`), and `Toast` (`Toast.Provider`). Icons come from **`lucide-react`**.

**Styling/entry setup (critical for the app to render):**
- `apps/frontend/index.html` — Vite entry; loads `/src/main.tsx` into `#root` (without it the page is blank).
- `apps/frontend/vite.config.ts` — `@vitejs/plugin-react` + `@tailwindcss/vite`.
- `apps/frontend/src/styles/global.css` — starts with `@import "tailwindcss";` then `@import "@heroui/styles";` (this injects all Hero UI styles). Custom CSS follows.
- No `tailwind.config.{js,cjs}` / `postcss.config` is needed (Tailwind v4 is CSS-first).
- There is **no** `HeroUIProvider` wrapper in v3 — `main.tsx` just imports `./styles/global.css` and renders `<App />`.

**Tooling compatibility (important):** Vite is pinned to **v6** and `@vitejs/plugin-react` to **v4**. `@vitejs/plugin-react@6` only works with Vite 8 (Rolldown-based), and Vite 8's dev server crashes with `Missing field 'moduleType'` from the React-refresh wrapper. So do **not** upgrade Vite to 7/8 or `@vitejs/plugin-react` to 5/6 — keep the v6 + plugin-react@4 pairing.

## Quick Start

### Prerequisites

- Node.js 20+
- npm
- Git

### Installation

```bash
# Clone
git clone <your-fork-url>
cd sanctuary-plus

# Install workspace dependencies.
# The workspace has a pre-existing NestJS 11/12 peer-dep conflict, so
# --legacy-peer-deps is required for clean installs:
npm install --legacy-peer-deps
```

### Run the frontend (React + Vite + Hero UI, port 5173)

```bash
# From the frontend app:
cd apps/frontend && npm run dev

# Or via Nx (root):
npx nx serve frontend
```

### Run the backend API gateway (NestJS, port 3000)

```bash
cd apps/backend && npm run start:dev
# or: npx nx serve backend
```

### Run Chronos ICU Early Warning (existing FastAPI engine, port 8000)

```bash
cd chronos && uvicorn backend.api:app --host 0.0.0.0 --port 8000 --reload
```

## Authentication and access flow

The repository now issues JWT access tokens through the NestJS backend while
preserving the existing frontend demo login portal. The frontend keeps the
current hardcoded demo roster and patient registration experience, then
exchanges the selected identity for a backend token. Medication requests send
that token as an `Authorization: Bearer <token>` header.

### Demo accounts

| Role | Username | Password |
|------|----------|----------|
| Staff | `staff@hospital.demo` | `staff123` |
| Admin/demo staff | `admin@hospital.demo` | `admin123` |

Patient access continues to use the existing patient phone/registration flow.
The current prototype signs a patient token for the selected local patient
record; production identity verification and persisted user accounts are a
later authentication phase.

### Authentication endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/auth/staff/login` | Issue a staff JWT from demo credentials |
| `POST` | `/api/auth/patient/login` | Issue a patient JWT for the selected patient session |

Medication routes require a valid bearer token and enforce patient ownership
or staff access in the backend. The JWT guard returns `401 Unauthorized` for
missing/invalid tokens. Medication role checks return `403 Forbidden` when a
patient attempts a staff-only action.

Set a strong secret in `.env` before running outside local development:

```dotenv
JWT_SECRET=replace-this-with-a-long-random-secret
DATABASE_URL=postgresql://sanctuary:sanctuary_dev@localhost:5433/sanctuary
CHRONOS_BASE_URL=http://127.0.0.1:8000
PORT=3000
NODE_ENV=development
```

The fallback JWT secret is intended only for local demonstration.

## Medication reconciliation workflows

Medication reconciliation has separate patient and hospital-staff workflows.

### Patient workflow

Patients can:

- View their own home and hospital medication information.
- Add home medications, including information remembered from memory.
- Report allergies or reactions for staff review.
- See medication status and verification state.

Patients cannot:

- Add hospital medication orders.
- Compare or resolve prescriptions.
- Verify, reject, reconcile, hold, modify, replace, or discontinue medication records.
- View staff-only interactions, audit events, or internal clinical decisions.

Patient-created home medications use `source=HOME` and start with
`verificationStatus=UNVERIFIED`. They never become an approved hospital order
automatically.

### Staff workflow

Hospital staff can:

- View the medication lists for a patient.
- Add hospital medication orders.
- Compare home prescriptions with hospital orders.
- Review allergy and interaction alerts.
- Verify or reject patient-submitted medications with a reason.
- Continue, modify, hold, replace, review, or discontinue medications.
- View reconciliation history and audit events.

Medication verification states are:

- `UNVERIFIED` — submitted by a patient or awaiting review.
- `VERIFIED` — reviewed and accepted by staff.
- `REJECTED` — reviewed and rejected by staff.

Every verification and reconciliation decision records the acting user, reason,
before/after values where applicable, and timestamp in the audit trail.

### Medication API surface

| Method | Endpoint | Access |
|--------|----------|--------|
| `GET` | `/api/patients/:patientId/medications` | Patient owner or staff |
| `POST` | `/api/patients/:patientId/medications` | Patient owner for home meds; staff for hospital orders |
| `GET` | `/api/patients/:patientId/allergies` | Patient owner or staff |
| `POST` | `/api/patients/:patientId/allergies` | Patient owner or staff |
| `GET` | `/api/patients/:patientId/medication-comparison` | Staff workflow |
| `GET` | `/api/patients/:patientId/medication-safety` | Staff workflow |
| `GET` | `/api/patients/:patientId/medication-history` | Patient-safe history or staff |
| `GET` | `/api/patients/:patientId/medication-audit` | Staff only |
| `PATCH` | `/api/medications/:medicationId/verification` | Staff only |
| `POST` | `/api/medications/:medicationId/reconcile` | Staff only |

### Database setup

Start PostgreSQL and apply the Prisma migrations before starting the backend:

```bash
docker compose up -d postgres
npx prisma generate
npx prisma migrate deploy
```

The medication verification migration adds the `MedicationVerificationStatus`
field to medication records. The backend requires `DATABASE_URL` at startup.

## Available Scripts

### Frontend (`apps/frontend/`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server (port 5173) |
| `npm run build` | Production build via Vite |
| `npm run preview` | Preview the production build |

### Backend (`apps/backend/`)

| Script | Description |
|--------|-------------|
| `npm run start:dev` | NestJS in watch mode (port 3000) |
| `npm run build` | Build the NestJS app |
| `npm run test` | Vitest unit tests |
| `npm run lint` | ESLint |

### Nx Workspace (root)

```bash
npx nx serve frontend        # dev server
npx nx serve backend          # API gateway
npx nx build frontend         # build frontend (Vite)
npx nx build backend          # build backend (NestJS)
npx nx typecheck              # type-check all projects (tsc --noEmit)
npx nx format:check           # Prettier check
npx nx format:write           # Prettier write
npx nx lint                   # ESLint across projects
npx nx test                   # Vitest tests
npx nx run-many -t build      # build everything
npx nx graph                  # project graph
```

> ⚠️ **Nx project names**: the frontend project is named **`frontend`** (dir `apps/frontend`), the backend is **`backend`** (dir `apps/backend`). Use `npx nx build frontend`, not `npx nx build web`. See [CI/CD caveats](#cicd-caveats).

## Project Structure

```
sanctuary-plus/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD pipeline (lint → test → build → docker → deploy)
├── apps/
│   ├── frontend/               # React 19 + Vite + Hero UI v3  (Nx project: "frontend")
│   │   ├── index.html          # Vite entry (loads /src/main.tsx)
│   │   ├── vite.config.ts      # @vitejs/plugin-react + @tailwindcss/vite
│   │   ├── src/
│   │   │   ├── App.tsx         # Navigation shell (Drawer sidebar + page router)
│   │   │   ├── main.tsx        # React root (imports ./styles/global.css, no Provider)
│   │   │   ├── vite-env.d.ts   # Vite client type refs (enables CSS side-effect imports)
│   │   │   ├── pages/          # One file per feature (default exports)
│   │   │   │   ├── DashboardPage.tsx
│   │   │   │   ├── QueuePage.tsx
│   │   │   │   ├── DocumentationPage.tsx
│   │   │   │   ├── MedicationsPage.tsx
│   │   │   │   ├── WardSyncPage.tsx
│   │   │   │   └── ChronosPage.tsx
│   │   │   ├── components/     # Per-feature subfolders (dashboard/ queue/ documentation/
│   │   │   │                   #   medications/ wardsync/ chronos/) — reserved for future
│   │   │   │                   #   component extraction; feature code currently lives in pages/
│   │   │   └── styles/
│   │   │       └── global.css
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── backend/                # NestJS 12 API Gateway (Nx project: "backend", port 3000)
│   │   └── src/                # chronos bridge + wardwatch modules
│
├── packages/
│   ├── shared/                 # Shared TS types/models
│   └── api/                    # Shared API client library
│
├── nx.json                     # Nx config — uses @nx/vite; @nx/webpack plugin REMOVED
├── package.json                # Root workspace (@org/source)
├── tsconfig.json / tsconfig.base.json
├── eslint.config.mjs           # Flat ESLint config
├── vitest.config.mts
├── .prettierrc / .prettierignore
└── .opencode/                  # Opencode config (gitignored)
```

## Hero UI v3 Component Notes

The frontend was written against the real Hero UI v3 API (verified from `@heroui/react` type defs):

- **Button** — no `color` prop. Use `variant`: `primary | secondary | danger | danger-soft | ghost | outline | tertiary`. `light` → `ghost`, `solid` → `primary`, `bordered` → `outline`. Prefer `onPress`.
- **Badge** — `color`: `default | primary | secondary | success | warning | danger | accent`. `variant`: `default | soft | solid`. Old `flat` → `soft`, `primary` → `accent`, `secondary` → `default`.
- **Input** — use `value` + `onChange`. No `onValueChange`, no `startContent`.
- **Tabs** — `Tabs`, `Tabs.List`, `Tabs.Tab` (with `id`), `Tabs.Panel` (with `id`). Controlled via `defaultSelectedKey`.
- **Drawer** — `Drawer.Trigger` wraps a `Button`; content via `Drawer.Content` / `Drawer.Header` / `Drawer.Body`.
- **Toast** — wrap the app in `Toast.Provider`; use `Toast` primitives.
- **No**: `Box`, `Stack`, `Text`, `Nav`, `TabNav`, `TabPane` (use `TabPanel`/Panel), `Toaster`, `Table`, `Divider` (use `Separator`), `Progress` (use `ProgressBar`), `Provider`/`HeroUIProvider`.

## Code Quality Gates

The repo enforces three local gates (all currently passing with **0 errors / 0 warnings**):

```bash
npx tsc --noEmit -p apps/frontend/tsconfig.json   # type check
npx prettier --check "apps/frontend/src/**/*.{ts,tsx}"
npx eslint "apps/frontend/src/**/*.{ts,tsx}"
```

- `lucide-react` is installed with `--legacy-peer-deps`.
- `src/vite-env.d.ts` declares `vite/client` so CSS side-effect imports type-check.

## CI/CD Workflow (`.github/workflows/deploy.yml`)

A 6-stage GitHub Actions pipeline. Stages 1–3 run on every PR / push / tag; deploy stages run on `main` or `v*` tags.

| Stage | Job | What it does |
|-------|-----|--------------|
| 1 | `lint-quality` | `npx nx typecheck`, `npx nx format:check`, `npx nx lint`; fails the build on typecheck/lint failure |
| 1 | `unit-tests` | `npx nx test` (Vitest) |
| 2 | `build-artifacts` | `npx nx build backend` and `npx nx build web`; uploads `apps/backend/dist` + frontend dist |
| 2B | `security-scan` | `npm audit --audit-level=high` |
| 3 | `docker-build` | Builds + pushes backend Docker image to GHCR (main only) |
| 4 | `trivy-scan` | Trivy image vulnerability scan (tags/main) |
| 5 | `deploy` | Deploys frontend to GitHub Pages (`peaceiris/actions-gh-pages`); health check |
| 6 | `ci-summary` | Writes a Markdown CI report to the run summary |

**Triggers:** `pull_request` (non-`main`), `push` (non-`main`), `tags: v*`, `workflow_dispatch`.

**Notes:**
- GitHub Pages serves only the static React frontend; the NestJS backend is deployed via Docker to GHCR / a VPS.
- `BASE_PATH` defaults to `/`; set `VITE_BASE_PATH` for sub-path hosting.
- HIPAA posture: on-premise / air-gapped friendly — no cloud egress for patient data.

### CI/CD Caveats

The workflow file still references the **original scaffold name `web`**, which no longer matches the repo:

- `npx nx build web` and `cd apps/web` / `apps/web/dist` / `publish_dir: ./frontend-build/apps/web/dist` — the real project is **`frontend`** (`apps/frontend`).
- The `deploy` job references `chronos/backend/models/`, but there is no `chronos/` directory in this repo (Chronos is an external/linked system).

Before the deploy stage can succeed end-to-end, update those references from `web` → `frontend` (and `apps/web` → `apps/frontend`), and either vendor Chronos or make its verification step conditional. The **`lint-quality`** stage (the part that checks lint/format/typecheck) is unaffected by these mismatches and passes today.

## ML vs Rule-Based Design Rationale

**Rules** for auditable, deterministic clinical logic:
- **Queues** — ESI triage is standardized and protocol-driven.
- **Medications** — RxNorm/DrugBank DDI + allergy checks are knowledge-base lookups.
- **Documentation** — structured data → FHIR mapping is rule-based for reliability.

**ML** where it adds value:
- **Chronos** — the project's key differentiator; already trained ensembles.
- **Documentation NLP** — free-text needs ClinicalBERT / Whisper.
- **WardSync** — deterministic NEWS2 scoring and device-state correlation produce auditable ward review flags.

## License

MIT License.

## Learn More

- [Nx Documentation](https://nx.dev/docs)
- [Hero UI Documentation](https://heroui.com)
- [NestJS Documentation](https://nestjs.com)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [Project Chronos](https://github.com/anomalyco/chronos)
