from typing import Dict, List, Any, Optional
from backend.services.data_loader import DataLoader
from backend.services.risk_service import RiskService
from ml.explain import ExplainerService

class DriverService:
    _instance = None

    def __init__(self, data_loader: Optional[DataLoader] = None,
                 risk_service: Optional[RiskService] = None,
                 explainer_service: Optional[ExplainerService] = None):
        self.loader = data_loader or DataLoader.get_instance()
        self.risk_service = risk_service or RiskService.get_instance()
        self.explainer = explainer_service or ExplainerService.get_instance()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = DriverService()
        return cls._instance

    def get_project_drivers(self, project_code: int, target: str = "overall") -> Dict[str, Any]:
        risk_info = self.risk_service.get_latest_project_risk(project_code)
        if not risk_info:
            return {"project_code": project_code, "drivers": [], "error": "Project not found in latest snapshot"}

        features_row = risk_info["features_row"]
        drivers = self.explainer.explain_instance(features_row, target=target)

        return {
            "project_code": project_code,
            "target": target,
            "risk_score": risk_info.get(f"{target}_risk", risk_info["overall_risk"]),
            "risk_band": risk_info.get(f"{target}_risk_band", risk_info["overall_risk_band"]),
            "drivers": drivers
        }
