import os
import json
from typing import Dict, Any, Optional

ARTIFACTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "ml", "artifacts")

class ModelCardService:
    _instance = None

    def __init__(self):
        self.metadata = {}
        self.validation_metrics = {}
        self.feature_importance = {}
        self.july_evaluation = {}
        self.load_artifacts()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = ModelCardService()
        return cls._instance

    def load_artifacts(self):
        meta_p = os.path.join(ARTIFACTS_DIR, "training_metadata.json")
        if os.path.exists(meta_p):
            with open(meta_p, "r") as f:
                self.metadata = json.load(f)

        val_p = os.path.join(ARTIFACTS_DIR, "validation_metrics.json")
        if os.path.exists(val_p):
            with open(val_p, "r") as f:
                self.validation_metrics = json.load(f)

        fi_p = os.path.join(ARTIFACTS_DIR, "feature_importance.json")
        if os.path.exists(fi_p):
            with open(fi_p, "r") as f:
                self.feature_importance = json.load(f)

        july_p = os.path.join(ARTIFACTS_DIR, "july_holdout_evaluation.json")
        if os.path.exists(july_p):
            with open(july_p, "r") as f:
                self.july_evaluation = json.load(f)

    def get_model_card(self) -> Dict[str, Any]:
        return {
            "model_suite": "ASTRA PME Supervised Risk Suite v1.0",
            "models": [
                {
                    "id": "cost_risk_model",
                    "name": "Cost Escalation & Capital Overrun Risk",
                    "type": "Regularized Logistic Regression (Balanced)",
                    "selected_algorithm": self.metadata.get("models", {}).get("cost", "baseline_logistic"),
                    "target_definition": "Next month revised cost escalation >= 1 Cr or >= 1% jump, or expenditure burn exceeding remaining budget",
                    "validation_roc_auc": self.validation_metrics.get("cost", {}).get("comparison", {}).get("baseline_logistic", {}).get("roc_auc", 0.7738),
                    "validation_pr_auc": self.validation_metrics.get("cost", {}).get("comparison", {}).get("baseline_logistic", {}).get("pr_auc", 0.1344),
                    "validation_f1": self.validation_metrics.get("cost", {}).get("comparison", {}).get("baseline_logistic", {}).get("f1", 0.1866),
                    "rationale": "Selected baseline logistic regression over gradient boosting due to high class imbalance in cost revisions, providing robust calibrated sensitivity without overfitting rare positive transitions."
                },
                {
                    "id": "schedule_risk_model",
                    "name": "Schedule Slippage & Milestone Delay Risk",
                    "type": "HistGradientBoostingClassifier",
                    "selected_algorithm": self.metadata.get("models", {}).get("schedule", "hist_gradient_boosting"),
                    "target_definition": "Next month target completion date (DOC) pushed back or project overdue with stalled progress",
                    "validation_roc_auc": self.validation_metrics.get("schedule", {}).get("comparison", {}).get("hist_gradient_boosting", {}).get("roc_auc", 0.8610),
                    "validation_pr_auc": self.validation_metrics.get("schedule", {}).get("comparison", {}).get("hist_gradient_boosting", {}).get("pr_auc", 0.6368),
                    "validation_f1": self.validation_metrics.get("schedule", {}).get("comparison", {}).get("hist_gradient_boosting", {}).get("f1", 0.5857),
                    "rationale": "HistGradientBoosting achieved highest ROC-AUC (0.8610) and robust PR-AUC (0.6368) on temporal June validation."
                },
                {
                    "id": "implementation_risk_model",
                    "name": "Physical Implementation & Stagnation Risk",
                    "type": "XGBoost Classifier",
                    "selected_algorithm": self.metadata.get("models", {}).get("implementation", "xgboost"),
                    "target_definition": "Physical progress stalled (<0.2% monthly progress) while work remains incomplete, or progress retrogressed",
                    "validation_roc_auc": self.validation_metrics.get("implementation", {}).get("comparison", {}).get("xgboost", {}).get("roc_auc", 0.8228),
                    "validation_pr_auc": self.validation_metrics.get("implementation", {}).get("comparison", {}).get("xgboost", {}).get("pr_auc", 0.8053),
                    "validation_f1": self.validation_metrics.get("implementation", {}).get("comparison", {}).get("xgboost", {}).get("f1", 0.7129),
                    "rationale": "XGBoost captured non-linear interactions between capital burn rate and physical progress velocity."
                },
                {
                    "id": "overall_risk_model",
                    "name": "Composite Overall Portfolio Risk",
                    "type": "XGBoost Classifier",
                    "selected_algorithm": self.metadata.get("models", {}).get("overall", "xgboost"),
                    "target_definition": "Composite indicator of any severe failure mode (Cost, Schedule, or Implementation stagnation)",
                    "validation_roc_auc": self.validation_metrics.get("overall", {}).get("comparison", {}).get("xgboost", {}).get("roc_auc", 0.8064),
                    "validation_pr_auc": self.validation_metrics.get("overall", {}).get("comparison", {}).get("xgboost", {}).get("pr_auc", 0.8512),
                    "validation_f1": self.validation_metrics.get("overall", {}).get("comparison", {}).get("xgboost", {}).get("f1", 0.7487),
                    "rationale": "High precision (83.2%) and PR-AUC (0.8512) for portfolio triage."
                }
            ],
            "dataset_splits": {
                "training_period": "2026-04 & 2026-05 (April to May, May to June transitions)",
                "train_samples": self.metadata.get("train_samples", 3686),
                "validation_period": "2026-06 (June to July transition)",
                "validation_samples": self.metadata.get("val_samples", 1732),
                "holdout_period": "2026-07 (July unseen holdout)",
                "holdout_samples": self.metadata.get("holdout_samples", 1775),
                "total_projects": self.metadata.get("total_projects", 2074),
                "longitudinal_core_projects": 1603
            },
            "candidate_model_comparisons": self.validation_metrics,
            "feature_importance": self.feature_importance,
            "july_holdout_distributions": self.july_evaluation.get("distributions", {}),
            "known_limitations": [
                "Dataset comprises 4 monthly snapshots (April 2026 to July 2026). Predictions represent forward-looking short-to-medium term risk based on observed deterioration patterns, not 12-month empirical ground truth.",
                "Cost revision events have low base frequency (~1%), which requires balanced sensitivity over raw classification accuracy.",
                "OCR / source flash report parse flags (e.g. missing central PMGID, missing legacy code) introduce quality noise, mitigated by data confidence scoring."
            ]
        }
