import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple, Optional
from sklearn.ensemble import IsolationForest
from ml.features import FEATURE_COLUMNS

ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")

class AnomalyDetector:
    def __init__(self, contamination: float = 0.05, random_state: int = 42):
        self.contamination = contamination
        self.random_state = random_state
        self.model = IsolationForest(
            n_estimators=150,
            contamination=self.contamination,
            random_state=self.random_state,
            n_jobs=-1
        )
        self.is_fitted = False

    def fit(self, X: pd.DataFrame):
        feat_df = X[FEATURE_COLUMNS].fillna(0.0)
        self.model.fit(feat_df)
        self.is_fitted = True
        return self

    def score_samples(self, X: pd.DataFrame) -> np.ndarray:
        if not self.is_fitted:
            raise ValueError("Anomaly detector not fitted yet.")
        feat_df = X[FEATURE_COLUMNS].fillna(0.0)
        # Decision function: lower values mean more anomalous. Invert and normalize to [0, 100]
        raw_scores = self.model.decision_function(feat_df)
        # Scale to 0 (normal) to 100 (highly anomalous)
        min_s, max_s = raw_scores.min(), raw_scores.max()
        if max_s > min_s:
            norm_scores = 100.0 * (1.0 - (raw_scores - min_s) / (max_s - min_s))
        else:
            norm_scores = np.zeros(len(raw_scores))
        return norm_scores

    def save(self, filepath: Optional[str] = None):
        os.makedirs(ARTIFACTS_DIR, exist_ok=True)
        path = filepath or os.path.join(ARTIFACTS_DIR, "anomaly_detector.pkl")
        joblib.dump(self, path)

    @classmethod
    def load(cls, filepath: Optional[str] = None):
        path = filepath or os.path.join(ARTIFACTS_DIR, "anomaly_detector.pkl")
        if os.path.exists(path):
            return joblib.load(path)
        return None
