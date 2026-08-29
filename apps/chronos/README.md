# Embedded Chronos Feature Module

This service is the embedded Project Chronos runtime inside the Hospital Platform repository.

## Purpose

The hospital platform owns the operational workflow and UI, while Chronos remains a dedicated ICU early-warning feature module within the same repo.

## Runtime

- FastAPI service
- local port: 8000
- model artifacts live under `apps/chronos/models/`

## Local run

```bash
cd apps/chronos
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Why this is embedded

This keeps Chronos inside the same monorepo as the hospital platform, instead of depending on a separate sibling repo or external service.

## Contract

- GET /health
- GET /patients
- POST /predict

The app is designed so that the hospital backend can call it via `CHRONOS_BASE_URL`, and the bridge defaults to `http://127.0.0.1:8000` when no override is supplied.
