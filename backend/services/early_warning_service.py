import numpy as np
from typing import Dict, List, Any, Optional
from backend.services.risk_service import RiskService, get_risk_band
from backend.services.trajectory_service import TrajectoryService

class EarlyWarningService:
    _instance = None

    def __init__(self, risk_service: Optional[RiskService] = None, trajectory_service: Optional[TrajectoryService] = None):
        self.risk_service = risk_service or RiskService.get_instance()
        self.trajectory_service = trajectory_service or TrajectoryService.get_instance()
        self.early_warnings: Dict[int, Dict[str, Any]] = {}
        self.compute_early_warnings()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = EarlyWarningService()
        return cls._instance

    def compute_early_warnings(self):
        latest_risks = self.risk_service.get_all_latest_risks()
        warnings = {}

        for p_code, r_dict in latest_risks.items():
            traj = self.trajectory_service.get_project_trajectory(p_code)
            curr_risk = r_dict["overall_risk"]
            velocity = traj["current_velocity"] if traj else 0.0
            accel = traj["current_acceleration"] if traj else 0.0
            anomaly_score = r_dict.get("anomaly_score", 0.0)

            # Dampened forward forecasting:
            # 3 Months horizon
            pred_3m = curr_risk + (velocity * 3.0 * 0.85) + (accel * 1.5)
            pred_3m = float(np.clip(pred_3m, 5.0, 98.0))
            uncertainty_3m = round(max(5.0, min(20.0, 6.0 + abs(velocity) * 1.2 + (anomaly_score * 0.1))), 1)

            # 6 Months horizon
            pred_6m = curr_risk + (velocity * 6.0 * 0.65) + (accel * 2.0)
            pred_6m = float(np.clip(pred_6m, 5.0, 99.0))
            uncertainty_6m = round(max(8.0, min(25.0, 9.0 + abs(velocity) * 1.8 + (anomaly_score * 0.15))), 1)

            # 12 Months horizon
            pred_12m = curr_risk + (velocity * 12.0 * 0.45) + (accel * 2.5)
            pred_12m = float(np.clip(pred_12m, 5.0, 99.5))
            uncertainty_12m = round(max(12.0, min(30.0, 13.0 + abs(velocity) * 2.2 + (anomaly_score * 0.2))), 1)

            warnings[p_code] = {
                "project_code": p_code,
                "current_risk": curr_risk,
                "current_band": r_dict["overall_risk_band"],
                "horizon_3m": {
                    "forecast_score": round(pred_3m, 1),
                    "forecast_band": get_risk_band(pred_3m),
                    "uncertainty_band": [round(max(0.0, pred_3m - uncertainty_3m), 1), round(min(100.0, pred_3m + uncertainty_3m), 1)],
                    "confidence_level": "HIGH" if uncertainty_3m < 10 else "MODERATE"
                },
                "horizon_6m": {
                    "forecast_score": round(pred_6m, 1),
                    "forecast_band": get_risk_band(pred_6m),
                    "uncertainty_band": [round(max(0.0, pred_6m - uncertainty_6m), 1), round(min(100.0, pred_6m + uncertainty_6m), 1)],
                    "confidence_level": "MODERATE" if uncertainty_6m < 18 else "LOW"
                },
                "horizon_12m": {
                    "forecast_score": round(pred_12m, 1),
                    "forecast_band": get_risk_band(pred_12m),
                    "uncertainty_band": [round(max(0.0, pred_12m - uncertainty_12m), 1), round(min(100.0, pred_12m + uncertainty_12m), 1)],
                    "confidence_level": "ESTIMATE ONLY"
                },
                "risk_trigger_factors": [
                    f"Current risk level at {curr_risk:.1f}% ({r_dict['overall_risk_band']})",
                    f"Risk velocity at {velocity:+.1f}%/month",
                    f"Structural anomaly score: {anomaly_score:.1f}/100"
                ]
            }

        self.early_warnings = warnings

    def get_project_early_warning(self, project_code: int) -> Optional[Dict[str, Any]]:
        return self.early_warnings.get(project_code)

    def get_early_warning_list(self, horizon: str = "3m", band: Optional[str] = None, limit: int = 200) -> List[Dict[str, Any]]:
        res = list(self.early_warnings.values())
        if horizon == "3m":
            res.sort(key=lambda x: x["horizon_3m"]["forecast_score"], reverse=True)
            if band:
                res = [x for x in res if x["horizon_3m"]["forecast_band"] == band.upper()]
        elif horizon == "6m":
            res.sort(key=lambda x: x["horizon_6m"]["forecast_score"], reverse=True)
            if band:
                res = [x for x in res if x["horizon_6m"]["forecast_band"] == band.upper()]
        elif horizon == "12m":
            res.sort(key=lambda x: x["horizon_12m"]["forecast_score"], reverse=True)
            if band:
                res = [x for x in res if x["horizon_12m"]["forecast_band"] == band.upper()]
        return res[:limit]
