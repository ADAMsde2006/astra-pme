import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import HistGradientBoostingClassifier
from xgboost import XGBClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import roc_auc_score, average_precision_score, precision_score, recall_score, f1_score, confusion_matrix

from backend.services.data_loader import DataLoader
from backend.services.audit_service import AuditService
from backend.services.contradiction_service import ContradictionService
from ml.features import FEATURE_COLUMNS, engineer_features
from ml.targets import construct_temporal_targets
from ml.anomaly import AnomalyDetector

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

TARGETS = {
    "cost": "target_cost_risk",
    "schedule": "target_schedule_risk",
    "implementation": "target_implementation_risk",
    "overall": "target_overall_risk"
}

def train_and_select_models():
    print("Initializing Data Loader, Audit, and Contradictions...")
    loader = DataLoader.get_instance()
    audit_svc = AuditService(loader)
    contra_svc = ContradictionService(loader)

    print("Engineering features across canonical dataset...")
    df_feat = engineer_features(
        loader.canonical_df,
        confidence_map=audit_svc.project_confidence,
        contradiction_map={p: len(contra_svc.get_project_contradictions(p)) for p in loader.canonical_df["project_code"].unique()}
    )
    
    print("Constructing temporal targets...")
    df_full = construct_temporal_targets(df_feat)

    # Train Split: 2026-04 and 2026-05
    train_mask = df_full["snapshot_month"].isin(["2026-04", "2026-05"]) & df_full["target_overall_risk"].notna()
    # Validation Split: 2026-06 (predicting deterioration into July)
    val_mask = (df_full["snapshot_month"] == "2026-06") & df_full["target_overall_risk"].notna()
    # July Holdout: 2026-07 (unseen features)
    july_mask = (df_full["snapshot_month"] == "2026-07")

    train_df = df_full[train_mask].copy()
    val_df = df_full[val_mask].copy()
    july_df = df_full[july_mask].copy()

    print(f"Train samples (April + May): {len(train_df)}")
    print(f"Validation samples (June): {len(val_df)}")
    print(f"July holdout samples: {len(july_df)}")

    X_train = train_df[FEATURE_COLUMNS].fillna(0.0)
    X_val = val_df[FEATURE_COLUMNS].fillna(0.0)
    X_july = july_df[FEATURE_COLUMNS].fillna(0.0)

    # Train IsolationForest on all training feature observations
    print("Training IsolationForest anomaly detector...")
    anomaly_detector = AnomalyDetector(contamination=0.06, random_state=42)
    anomaly_detector.fit(X_train)
    anomaly_detector.save()

    model_artifacts = {}
    validation_results = {}
    feature_importance_summary = {}

    for target_key, target_col in TARGETS.items():
        print(f"\n--- Training Models for: {target_key.upper()} RISK ({target_col}) ---")
        y_train = train_df[target_col].astype(int)
        y_val = val_df[target_col].astype(int)

        pos_rate_train = float(np.mean(y_train))
        pos_rate_val = float(np.mean(y_val))
        print(f"  Target positive rate - Train: {pos_rate_train:.3f}, Val: {pos_rate_val:.3f}")

        # Candidates
        candidates = {
            "baseline_logistic": Pipeline([
                ("scaler", StandardScaler()),
                ("clf", LogisticRegression(C=1.0, max_iter=1000, class_weight="balanced", random_state=42))
            ]),
            "hist_gradient_boosting": HistGradientBoostingClassifier(
                max_iter=120, max_leaf_nodes=31, learning_rate=0.06, class_weight="balanced", random_state=42
            ),
            "xgboost": XGBClassifier(
                n_estimators=120, max_depth=4, learning_rate=0.05,
                scale_pos_weight=(1.0 - pos_rate_train) / max(pos_rate_train, 1e-4),
                eval_metric="logloss", random_state=42
            )
        }

        eval_comparison = {}
        best_name = None
        best_auc = -1.0
        best_fitted_model = None

        for name, model in candidates.items():
            model.fit(X_train, y_train)
            val_probs = model.predict_proba(X_val)[:, 1]
            val_preds = (val_probs >= 0.5).astype(int)

            try:
                roc_auc = float(roc_auc_score(y_val, val_probs))
            except Exception:
                roc_auc = 0.5
            try:
                pr_auc = float(average_precision_score(y_val, val_probs))
            except Exception:
                pr_auc = pos_rate_val

            prec = float(precision_score(y_val, val_preds, zero_division=0))
            rec = float(recall_score(y_val, val_preds, zero_division=0))
            f1 = float(f1_score(y_val, val_preds, zero_division=0))
            cm = confusion_matrix(y_val, val_preds).tolist()

            eval_comparison[name] = {
                "roc_auc": round(roc_auc, 4),
                "pr_auc": round(pr_auc, 4),
                "precision": round(prec, 4),
                "recall": round(rec, 4),
                "f1": round(f1, 4),
                "confusion_matrix": cm
            }
            print(f"  {name:24s} -> ROC-AUC: {roc_auc:.4f} | PR-AUC: {pr_auc:.4f} | F1: {f1:.4f} | Precision: {prec:.4f} | Recall: {rec:.4f}")

            # Selection based on ROC-AUC + PR-AUC combined score
            composite_score = (roc_auc * 0.6) + (pr_auc * 0.4)
            if composite_score > best_auc:
                best_auc = composite_score
                best_name = name
                best_fitted_model = model

        print(f"  Selected Best Model for {target_key}: {best_name}")
        model_artifacts[target_key] = best_fitted_model
        validation_results[target_key] = {
            "selected_model": best_name,
            "comparison": eval_comparison,
            "target_distribution": {
                "train_pos_rate": round(pos_rate_train, 4),
                "val_pos_rate": round(pos_rate_val, 4),
                "train_samples": len(train_df),
                "val_samples": len(val_df)
            }
        }

        # Feature Importance calculation
        if hasattr(best_fitted_model, "feature_importances_"):
            importances = best_fitted_model.feature_importances_
        elif hasattr(best_fitted_model, "named_steps") and hasattr(best_fitted_model.named_steps.get("clf"), "coef_"):
            importances = np.abs(best_fitted_model.named_steps["clf"].coef_[0])
        else:
            importances = np.ones(len(FEATURE_COLUMNS)) / len(FEATURE_COLUMNS)

        fi_dict = {col: round(float(imp), 4) for col, imp in zip(FEATURE_COLUMNS, importances)}
        sorted_fi = dict(sorted(fi_dict.items(), key=lambda item: item[1], reverse=True))
        feature_importance_summary[target_key] = sorted_fi

        # Save individual model
        model_path = os.path.join(ARTIFACTS_DIR, f"{target_key}_model.pkl")
        joblib.dump(best_fitted_model, model_path)

    # Save feature metadata & training metadata
    training_metadata = {
        "training_months": ["2026-04", "2026-05"],
        "validation_month": "2026-06",
        "holdout_month": "2026-07",
        "feature_names": FEATURE_COLUMNS,
        "n_features": len(FEATURE_COLUMNS),
        "train_samples": len(train_df),
        "val_samples": len(val_df),
        "holdout_samples": len(july_df),
        "total_projects": loader.canonical_df["project_code"].nunique(),
        "projects_in_all_4_months": 1603,
        "models": {k: v["selected_model"] for k, v in validation_results.items()}
    }

    with open(os.path.join(ARTIFACTS_DIR, "training_metadata.json"), "w") as f:
        json.dump(training_metadata, f, indent=2)

    with open(os.path.join(ARTIFACTS_DIR, "validation_metrics.json"), "w") as f:
        json.dump(validation_results, f, indent=2)

    with open(os.path.join(ARTIFACTS_DIR, "feature_importance.json"), "w") as f:
        json.dump(feature_importance_summary, f, indent=2)

    print("\nTraining completed successfully. All artifacts saved to ml/artifacts/")
    return validation_results

if __name__ == "__main__":
    train_and_select_models()
