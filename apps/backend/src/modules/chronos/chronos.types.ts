/**
 * Chronos backend types — mirrors health-tech/shared/data_contract.py full contract.
 * This is the canonical Chronos prediction shape, not the ICU simplified alerts shape.
 */

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export type SHAPDriver = {
  feature_name: string;
  shap_value: number;
  current_value: number;
  direction: string;
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

export type ChronosPredictionResponse = {
  patient_id: string;
  timestamp: string;
  crash_probability_score: number;
  crash_risk_level: RiskLevel;
  clinical_scores: ClinicalScores;
  predictions: {
    septic_shock: SepticShockPrediction;
    blood_pressure_collapse: HypotensionPrediction;
    cardiac_arrest: CardiacArrestPrediction;
  };
  last_updated: string;
  inference_errors?: string[];
  ground_truth?: unknown;
};

export type ChronosSummary = {
  status: string;
  modelsLoaded: string[];
  activePatients: number;
};
