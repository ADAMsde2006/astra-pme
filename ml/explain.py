import os
import sys
import joblib
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ml.features import FEATURE_COLUMNS

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")

HUMAN_FEATURE_NAMES = {
    "cost_original_cr": "Original Project Cost",
    "cost_revised_cr": "Current Revised Cost",
    "cost_escalation_pct": "Cost Escalation (%)",
    "expenditure_cum_cr": "Cumulative Expenditure",
    "expenditure_ratio": "Expenditure-to-Budget Ratio",
    "physical_progress_pct": "Physical Progress (%)",
    "progress_expenditure_divergence": "Progress vs Expenditure Divergence",
    "original_duration_months": "Original Target Duration",
    "revised_duration_months": "Revised Schedule Duration",
    "schedule_slippage_months": "Schedule Slippage (Months)",
    "project_age_months": "Project Age (Months)",
    "time_elapsed_ratio": "Elapsed Time vs Duration Ratio",
    "progress_velocity": "Monthly Progress Velocity",
    "expenditure_velocity": "Monthly Capital Burn Rate",
    "has_cost_revision": "Cost Revision Triggered",
    "has_doc_revision": "Target Completion Delayed",
    "is_overdue": "Project Past DOC Milestone",
    "months_overdue": "Overdue Duration (Months)",
    "remaining_cost_cr": "Remaining Capital Budget",
    "remaining_progress_pct": "Remaining Physical Work (%)",
    "expenditure_burn_rate": "Historical Burn Rate (Cr/Mo)",
    "progress_burn_rate": "Historical Progress Pace (%/Mo)",
    "data_confidence_score": "Data Trust Confidence Score",
    "contradiction_count": "Active Contradiction Count",
    "parse_flag_count": "Source Parse Flags"
}

class ExplainerService:
    _instance = None

    def __init__(self):
        self.models = {}
        for target in ["cost", "schedule", "implementation", "overall"]:
            p = os.path.join(ARTIFACTS_DIR, f"{target}_model.pkl")
            if os.path.exists(p):
                self.models[target] = joblib.load(p)

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = ExplainerService()
        return cls._instance

    def explain_instance(self, features_row: pd.Series, target: str = "overall") -> List[Dict[str, Any]]:
        model = self.models.get(target) or self.models.get("overall")
        if model is None:
            return []

        X_row = features_row[FEATURE_COLUMNS].fillna(0.0).values.reshape(1, -1)
        drivers = []

        # Tree/Linear model explanation
        if hasattr(model, "feature_importances_"):
            importances = model.feature_importances_
            # Directional heuristic based on feature value deviation from median
            for col, imp in zip(FEATURE_COLUMNS, importances):
                val = float(features_row.get(col, 0.0))
                # Risk push direction
                direction = "INCREASES_RISK"
                if col in ["physical_progress_pct", "progress_velocity", "data_confidence_score", "progress_burn_rate"]:
                    direction = "DECREASES_RISK" if val > 50 else "INCREASES_RISK"
                elif col in ["cost_escalation_pct", "schedule_slippage_months", "months_overdue", "progress_expenditure_divergence", "contradiction_count"]:
                    direction = "INCREASES_RISK" if val > 0 else "DECREASES_RISK"

                drivers.append({
                    "feature": col,
                    "display_name": HUMAN_FEATURE_NAMES.get(col, col),
                    "importance_weight": round(float(imp), 4),
                    "feature_value": round(val, 2),
                    "direction": direction,
                    "impact": "HIGH" if imp > 0.08 else "MEDIUM" if imp > 0.03 else "LOW"
                })
        elif hasattr(model, "named_steps") and hasattr(model.named_steps.get("clf"), "coef_"):
            coefs = model.named_steps["clf"].coef_[0]
            for col, coef in zip(FEATURE_COLUMNS, coefs):
                val = float(features_row.get(col, 0.0))
                weight = abs(float(coef))
                direction = "INCREASES_RISK" if (coef * val) > 0 else "DECREASES_RISK"
                drivers.append({
                    "feature": col,
                    "display_name": HUMAN_FEATURE_NAMES.get(col, col),
                    "importance_weight": round(weight, 4),
                    "feature_value": round(val, 2),
                    "direction": direction,
                    "impact": "HIGH" if weight > 0.4 else "MEDIUM" if weight > 0.15 else "LOW"
                })

        drivers.sort(key=lambda x: x["importance_weight"], reverse=True)
        return drivers[:8]
