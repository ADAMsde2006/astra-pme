import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional
from backend.services.data_loader import DataLoader
from backend.services.audit_service import AuditService
from backend.services.contradiction_service import ContradictionService
from ml.features import FEATURE_COLUMNS, engineer_features
from ml.anomaly import AnomalyDetector

ARTIFACTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "ml", "artifacts")

def get_risk_band(score_pct: float) -> str:
    if score_pct >= 80.0:
        return "CRITICAL"
    elif score_pct >= 60.0:
        return "HIGH"
    elif score_pct >= 35.0:
        return "MODERATE"
    return "LOW"

class RiskService:
    _instance = None

    def __init__(self, data_loader: Optional[DataLoader] = None,
                 audit_service: Optional[AuditService] = None,
                 contradiction_service: Optional[ContradictionService] = None):
        self.loader = data_loader or DataLoader.get_instance()
        self.audit_service = audit_service or AuditService.get_instance()
        self.contradiction_service = contradiction_service or ContradictionService.get_instance()
        self.models = {}
        self.anomaly_detector = None
        self.project_risk_cache: Dict[str, Dict[int, Dict[str, Any]]] = {} # month -> p_code -> risk_dict
        self._load_models()
        self.compute_all_risks()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = RiskService()
        return cls._instance

    def _load_models(self):
        for target in ["cost", "schedule", "implementation", "overall"]:
            p = os.path.join(ARTIFACTS_DIR, f"{target}_model.pkl")
            if os.path.exists(p):
                self.models[target] = joblib.load(p)
        self.anomaly_detector = AnomalyDetector.load()

    def compute_all_risks(self):
        df = self.loader.canonical_df
        confidence_map = self.audit_service.project_confidence
        contra_map = {p: len(self.contradiction_service.get_project_contradictions(p)) for p in df["project_code"].unique()}

        for snap_month, group in df.groupby("snapshot_month"):
            df_feat = engineer_features(group, confidence_map=confidence_map, contradiction_map=contra_map)
            X = df_feat[FEATURE_COLUMNS].fillna(0.0)

            # Predictions
            cost_probs = self.models["cost"].predict_proba(X)[:, 1] if "cost" in self.models else np.zeros(len(X))
            sched_probs = self.models["schedule"].predict_proba(X)[:, 1] if "schedule" in self.models else np.zeros(len(X))
            impl_probs = self.models["implementation"].predict_proba(X)[:, 1] if "implementation" in self.models else np.zeros(len(X))
            overall_probs = self.models["overall"].predict_proba(X)[:, 1] if "overall" in self.models else np.zeros(len(X))
            anomaly_scores = self.anomaly_detector.score_samples(X) if self.anomaly_detector else np.zeros(len(X))

            snap_risks = {}
            for i, (_, row) in enumerate(df_feat.iterrows()):
                p_code = int(row["project_code"])
                c_risk = round(float(cost_probs[i]) * 100.0, 1)
                s_risk = round(float(sched_probs[i]) * 100.0, 1)
                i_risk = round(float(impl_probs[i]) * 100.0, 1)
                o_risk = round(float(overall_probs[i]) * 100.0, 1)
                a_score = round(float(anomaly_scores[i]), 1)

                snap_risks[p_code] = {
                    "project_code": p_code,
                    "snapshot_month": snap_month,
                    "cost_risk": c_risk,
                    "schedule_risk": s_risk,
                    "implementation_risk": i_risk,
                    "overall_risk": o_risk,
                    "anomaly_score": a_score,
                    "cost_risk_band": get_risk_band(c_risk),
                    "schedule_risk_band": get_risk_band(s_risk),
                    "implementation_risk_band": get_risk_band(i_risk),
                    "overall_risk_band": get_risk_band(o_risk),
                    "features_row": row
                }
            self.project_risk_cache[snap_month] = snap_risks

    def get_latest_project_risk(self, project_code: int) -> Optional[Dict[str, Any]]:
        latest_month = sorted(self.project_risk_cache.keys())[-1]
        return self.project_risk_cache.get(latest_month, {}).get(project_code)

    def get_all_latest_risks(self) -> Dict[int, Dict[str, Any]]:
        latest_month = sorted(self.project_risk_cache.keys())[-1]
        return self.project_risk_cache.get(latest_month, {})

    def get_project_risk_history(self, project_code: int) -> List[Dict[str, Any]]:
        history = []
        for month in sorted(self.project_risk_cache.keys()):
            if project_code in self.project_risk_cache[month]:
                history.append(self.project_risk_cache[month][project_code])
        return history
