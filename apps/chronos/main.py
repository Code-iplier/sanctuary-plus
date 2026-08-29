from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import torch
from fastapi import FastAPI
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
MODELS_DIR = BASE_DIR / "models"
TARGETS = ["sepsis", "hypotension", "hemodynamic_collapse"]


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
    wbc: float | None = None
    creatinine: float | None = None
    bilirubin: float | None = None
    platelets: float | None = None
    fio2: float | None = None
    pao2: float | None = None
    gcs: float | None = None
    vasopressor_dose: float | None = 0.0
    map_score: float | None = 0.0
    model_target: str | None = None


MODEL_REGISTRY: dict[str, dict[str, Any]] = {}


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def _risk_level(probability: float) -> str:
    if probability >= 0.8:
        return "CRITICAL"
    if probability >= 0.55:
        return "HIGH"
    if probability >= 0.3:
        return "MODERATE"
    return "LOW"


def _load_model_metadata() -> list[str]:
    names: list[str] = []
    if MODELS_DIR.exists():
        for child in sorted(MODELS_DIR.iterdir()):
            if child.is_dir():
                names.append(child.name)
    return names


def _load_registry() -> None:
    available = _load_model_metadata()
    for target in available:
        model_dir = MODELS_DIR / target
        artifact_path = model_dir / "lgbm_model.pkl"
        if not artifact_path.exists():
            continue

        try:
            feature_names = json.loads((model_dir / "feature_columns.json").read_text())
            metadata = json.loads((model_dir / "model_metadata.json").read_text())
            art: dict[str, Any] = {
                "target": target,
                "feature_columns": feature_names,
                "metadata": metadata,
                "lgbm": joblib.load(artifact_path),
            }

            xgb_path = model_dir / "xgb_model.pkl"
            if xgb_path.exists():
                art["xgb"] = joblib.load(xgb_path)

            meta_path = model_dir / "meta_stacker.pkl"
            if meta_path.exists():
                art["meta_stacker"] = joblib.load(meta_path)

            calibrator_path = model_dir / "isotonic_calibrator.pkl"
            if calibrator_path.exists():
                art["calibrator"] = joblib.load(calibrator_path)

            shap_path = model_dir / "shap_explainer.pkl"
            if shap_path.exists():
                art["explainer"] = joblib.load(shap_path)

            for seq_name in ("grud_model.pt", "tcn_model.pt"):
                seq_path = model_dir / seq_name
                if seq_path.exists():
                    art[seq_name.replace(".pt", "")] = torch.load(seq_path, map_location="cpu", weights_only=True)

            art["threshold"] = float(metadata.get("optimal_threshold", 0.3))
            MODEL_REGISTRY[target] = art
        except Exception as exc:  # pragma: no cover - best effort at startup
            MODEL_REGISTRY[target] = {"error": str(exc), "target": target}


def _build_feature_vector(payload: VitalsPayload, target: str) -> np.ndarray:
    feature_columns = MODEL_REGISTRY.get(target, {}).get("feature_columns", [])
    if not feature_columns:
        feature_columns = [
            "heart_rate",
            "systolic_bp",
            "diastolic_bp",
            "mean_arterial_pressure",
            "spo2",
            "respiratory_rate",
            "temperature",
            "lactate",
            "creatinine",
            "wbc",
            "platelets",
            "fio2",
            "pao2",
            "age",
            "gender",
        ]

    data: dict[str, float] = {}
    values = payload.model_dump(exclude_none=True)
    for key, value in values.items():
        if key in {"patient_id", "timestamp", "model_target"}:
            continue
        data[key] = _safe_float(value)

    heart_rate = data.get("heart_rate", 0.0)
    systolic_bp = data.get("systolic_bp", 0.0)
    diastolic_bp = data.get("diastolic_bp", 0.0)
    mean_arterial_pressure = data.get("mean_arterial_pressure", (systolic_bp + 2 * diastolic_bp) / 3.0)
    spo2 = data.get("spo2", 97.0)
    lactate = data.get("lactate", 1.2)
    fio2 = data.get("fio2", 0.21)
    pao2 = data.get("pao2", 90.0)

    derived = {
        "age": 65.0,
        "gender": 0.5,
        "shock_index": heart_rate / max(systolic_bp, 1.0),
        "map_lactate_ratio": mean_arterial_pressure / max(lactate, 0.1),
        "pf_ratio": pao2 / max(fio2, 0.21),
        "pulse_pressure": max(systolic_bp - diastolic_bp, 0.0),
        "mean_arterial_pressure": mean_arterial_pressure,
        "heart_rate": heart_rate,
        "systolic_bp": systolic_bp,
        "diastolic_bp": diastolic_bp,
        "spo2": spo2,
        "respiratory_rate": data.get("respiratory_rate", 16.0),
        "temperature": data.get("temperature", 37.0),
        "lactate": lactate,
        "creatinine": data.get("creatinine", 1.0),
        "wbc": data.get("wbc", 9.0),
        "platelets": data.get("platelets", 200.0),
        "fio2": fio2,
        "pao2": pao2,
    }
    data.update(derived)

    vector: list[float] = []
    for name in feature_columns:
        value = data.get(name, 0.0)
        if isinstance(value, (int, float, np.integer, np.floating)):
            vector.append(float(value))
        else:
            try:
                vector.append(float(value))
            except (TypeError, ValueError):
                vector.append(0.0)
    return np.asarray(vector, dtype=np.float32)


def _score_target(target: str, payload: VitalsPayload) -> tuple[float, str]:
    art = MODEL_REGISTRY.get(target)
    if not art:
        return _heuristic_score(target, payload)

    vec = _build_feature_vector(payload, target)
    lgbm_model = art.get("lgbm")
    xgb_model = art.get("xgb")
    meta_model = art.get("meta_stacker")

    candidates: list[float] = []

    if lgbm_model is not None and hasattr(lgbm_model, "predict_proba"):
        try:
            candidates.append(float(lgbm_model.predict_proba(vec.reshape(1, -1))[0, 1]))
        except Exception:
            try:
                candidates.append(float(lgbm_model.predict(vec.reshape(1, -1))[0]))
            except Exception:
                pass

    if xgb_model is not None and hasattr(xgb_model, "predict_proba"):
        try:
            candidates.append(float(xgb_model.predict_proba(vec.reshape(1, -1))[0, 1]))
        except Exception:
            pass

    if meta_model is not None:
        try:
            candidates.append(float(meta_model.predict(vec.reshape(1, -1))[0]))
        except Exception:
            pass

    if not candidates:
        return _heuristic_score(target, payload)

    score = float(np.clip(np.mean(candidates), 0.0, 1.0))
    calibrator = art.get("calibrator")
    if calibrator is not None:
        try:
            if hasattr(calibrator, "transform"):
                score = float(np.clip(calibrator.transform(np.array([[score]]))[0][0], 0.0, 1.0))
            elif hasattr(calibrator, "predict"):
                score = float(np.clip(calibrator.predict(np.array([[score]])).item(), 0.0, 1.0))
        except Exception:
            pass

    return score, _risk_level(score)


def _heuristic_score(target: str, payload: VitalsPayload) -> tuple[float, str]:
    heart_rate = _safe_float(payload.heart_rate, 72.0)
    map_value = _safe_float(payload.mean_arterial_pressure, 93.0)
    spo2 = _safe_float(payload.spo2, 97.0)
    lactate = _safe_float(payload.lactate, 1.2)

    if target == "hypotension":
        score = max(0.0, min(1.0, 0.18 + max(0.0, 65.0 - map_value) / 80.0 * 0.7))
    elif target == "hemodynamic_collapse":
        score = max(0.0, min(1.0, 0.25 + max(0.0, 70.0 - heart_rate) / 70.0 * 0.25 + max(0.0, 60.0 - map_value) / 60.0 * 0.2 + max(0.0, 2.0 - lactate) / 2.0 * 0.1))
    else:
        sepsis = 0.22 + (heart_rate / 220.0) * 0.28 + (100.0 - min(spo2, 100.0)) / 100.0 * 0.18 + max(0.0, lactate - 1.0) / 4.0 * 0.15
        score = max(0.0, min(1.0, sepsis))

    return score, _risk_level(score)


@app.get("/health")
async def health() -> dict[str, Any]:
    model_names = _load_model_metadata()
    if not MODEL_REGISTRY:
        _load_registry()
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
    if not MODEL_REGISTRY:
        _load_registry()

    patient_id = payload.patient_id
    targets = [payload.model_target] if payload.model_target else TARGETS

    alerts: dict[str, Any] = {}
    for target in targets:
        if target not in _load_model_metadata() and target not in MODEL_REGISTRY:
            target = "sepsis" if target not in TARGETS else target
        score, risk = _score_target(target, payload)
        alerts[target] = {
            "probability": round(float(score), 4),
            "risk_level": risk,
            "source": "loaded-model" if target in MODEL_REGISTRY else "heuristic-fallback",
        }

    return {
        "patient_id": patient_id,
        "timestamp": payload.timestamp,
        "status": "ok",
        "alerts": alerts,
        "source": "embedded-chronos",
        "model_metadata": {
            "embedded": True,
            "models_dir": str(MODELS_DIR),
            "available_targets": _load_model_metadata(),
            "loaded_registry": sorted(MODEL_REGISTRY.keys()),
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


_load_registry()
