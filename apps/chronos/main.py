from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"

app = FastAPI(
    title="Hospital Platform — Embedded Chronos",
    description="ICU early-warning feature module embedded inside the hospital platform repo.",
    version="1.0.0",
)


class VitalsPayload(BaseModel):
    patient_id: str = Field(..., description="Hospital patient identifier")
    timestamp: str | None = None
    heart_rate: float | None = None
    systolic_bp: float | None = None
    diastolic_bp: float | None = None
    mean_arterial_pressure: float | None = None
    spo2: float | None = None
    respiratory_rate: float | None = None
    temperature: float | None = None
    lactate: float | None = None
    vasopressor_dose: float | None = 0.0
    map_score: float | None = 0.0


def _load_model_metadata() -> list[str]:
    names: list[str] = []
    if MODELS_DIR.exists():
        for child in sorted(MODELS_DIR.iterdir()):
            if child.is_dir():
                names.append(child.name)
    return names


@app.get("/health")
async def health() -> dict[str, Any]:
    model_names = _load_model_metadata()
    return {
        "status": "online",
        "models_loaded": model_names,
        "active_patients": 0,
        "source": "embedded-chronos",
        "timestamp": "system-time",
    }


@app.get("/patients")
async def patients() -> dict[str, Any]:
    return {
        "active_patients": [],
        "count": 0,
    }


@app.post("/predict")
async def predict(payload: VitalsPayload) -> dict[str, Any]:
    patient_id = payload.patient_id

    heart_rate = float(payload.heart_rate or 0.0)
    map_value = float(payload.mean_arterial_pressure or 0.0)
    spo2 = float(payload.spo2 or 0.0)

    sepsis = max(0.0, min(1.0, 0.32 + (heart_rate / 220.0) * 0.25 + (10.0 - min(spo2, 100.0)) / 100.0 * 0.18))
    hypotension = max(0.0, min(1.0, 0.28 + max(0.0, 65.0 - map_value) / 90.0 * 0.55))
    collapse = max(0.0, min(1.0, 0.36 + max(0.0, 70.0 - heart_rate) / 70.0 * 0.25 + max(0.0, 60.0 - map_value) / 60.0 * 0.20))

    return {
        "patient_id": patient_id,
        "timestamp": payload.timestamp,
        "status": "ok",
        "alerts": {
            "sepsis": {
                "probability": round(sepsis, 4),
                "risk_level": "HIGH" if sepsis >= 0.55 else "MODERATE" if sepsis >= 0.3 else "LOW",
            },
            "hypotension": {
                "probability": round(hypotension, 4),
                "risk_level": "HIGH" if hypotension >= 0.55 else "MODERATE" if hypotension >= 0.3 else "LOW",
            },
            "hemodynamic_collapse": {
                "probability": round(collapse, 4),
                "risk_level": "CRITICAL" if collapse >= 0.7 else "HIGH" if collapse >= 0.45 else "MODERATE" if collapse >= 0.25 else "LOW",
            },
        },
        "source": "embedded-chronos",
        "model_metadata": {
            "embedded": True,
            "models_dir": str(MODELS_DIR),
            "available_targets": _load_model_metadata(),
        },
    }


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "service": "Hospital Platform — Embedded Chronos",
        "status": "ready",
    }


@app.get("/patient/{patient_id}/history")
async def patient_history(patient_id: str) -> dict[str, Any]:
    return {
        "patient_id": patient_id,
        "n_rows": 0,
        "history": [],
    }
