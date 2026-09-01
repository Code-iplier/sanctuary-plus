/**
 * Chronos Domain Types — Sanctuary native.
 * Mirrors health-tech/shared/data_contract.py PredictionPayload.
 * Source of truth for TS remains Python; this mirror is adapted for React 19.
 * ICU simplified `alerts` shape is intentionally NOT used.
 */

export type SHAPDriver = {
  feature_name: string;
  shap_value: number;
  current_value: number;
  direction: string; // ↑ Rising | ↓ Falling | → Stable
};

export type ClinicalScores = {
  sofa_score: number;
  news2_score: number;
  shock_index: number;
};

export type SepticShockPrediction = {
  risk_probability_percentage: number;
  time_window: string;
  risk_level: RiskLevel;
  shap_drivers: SHAPDriver[];
};

export type HypotensionPrediction = {
  risk_probability_percentage: number;
  time_window: string;
  risk_level: RiskLevel;
  shap_drivers: SHAPDriver[];
};

export type CardiacArrestPrediction = {
  risk_probability_percentage: number;
  time_window: string;
  risk_level: RiskLevel;
  shap_drivers: SHAPDriver[];
  ml_probability: number;
  physics_probability: number;
  physics_metrics: {
    tissue_hypoxia_index: number;
    hemodynamic_instability_score: number;
    oxygen_delivery_do2: number;
    o2_extraction_ratio: number;
  };
  physics_override_triggered: boolean;
  alert_reasons: string[];
};

export type Predictions = {
  septic_shock: SepticShockPrediction;
  blood_pressure_collapse: HypotensionPrediction;
  cardiac_arrest: CardiacArrestPrediction;
};

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
export type RiskFilter = RiskLevel | 'ALL';

export type ChronosPatient = {
  patient_id: string;
  timestamp: string;
  crash_probability_score: number;
  crash_risk_level: RiskLevel;
  clinical_scores: ClinicalScores;
  predictions: Predictions;
  last_updated: string;
  ground_truth?: unknown;
  inference_errors?: string[];
  _crashHistory?: number[];
};

export type ChronosHealth = {
  status: string;
  models_loaded: string[];
  modelsLoaded?: string[];
  active_patients: number;
  activePatients?: number;
  timestamp: string;
};

export type ChronosSummary = {
  status: string;
  modelsLoaded: string[];
  models_loaded?: string[];
  activePatients: number;
  active_patients?: number;
  patient_count?: number;
  source?: string;
  route?: string;
  refreshedAt?: string;
  timestamp?: string;
};
