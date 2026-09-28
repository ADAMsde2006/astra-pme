import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from backend.services.data_loader import DataLoader
from backend.services.risk_service import RiskService
from backend.services.trajectory_service import TrajectoryService
from backend.services.audit_service import AuditService

class WatchlistService:
    _instance = None

    def __init__(self, data_loader: Optional[DataLoader] = None,
                 risk_service: Optional[RiskService] = None,
                 trajectory_service: Optional[TrajectoryService] = None,
                 audit_service: Optional[AuditService] = None):
        self.loader = data_loader or DataLoader.get_instance()
        self.risk_service = risk_service or RiskService.get_instance()
        self.trajectory_service = trajectory_service or TrajectoryService.get_instance()
        self.audit_service = audit_service or AuditService.get_instance()
        self.watchlist: List[Dict[str, Any]] = []
        self.compute_watchlist()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = WatchlistService()
        return cls._instance

    def compute_watchlist(self):
        latest_df = self.loader.get_latest_snapshot()
        all_risks = self.risk_service.get_all_latest_risks()
        
        items = []
        for idx, row in latest_df.iterrows():
            p_code = int(row["project_code"])
            r_dict = all_risks.get(p_code)
            if not r_dict:
                continue

            traj = self.trajectory_service.get_project_trajectory(p_code)
            conf = self.audit_service.get_project_confidence(p_code)

            overall_r = r_dict["overall_risk"]
            cost_r = r_dict["cost_risk"]
            sched_r = r_dict["schedule_risk"]
            impl_r = r_dict["implementation_risk"]
            vel = traj["current_velocity"] if traj else 0.0
            accel = traj["current_acceleration"] if traj else 0.0
            traj_state = traj["trajectory_state"] if traj else "STABLE"

            # Composite prioritization score
            # Weighs overall risk, velocity, acceleration, and quality uncertainty
            priority_score = (
                (overall_r * 0.35) +
                (cost_r * 0.20) +
                (sched_r * 0.20) +
                (impl_r * 0.10) +
                (max(0.0, vel) * 1.5) +
                ((100.0 - conf) * 0.15)
            )

            priority_level = "CRITICAL" if priority_score >= 70.0 else "HIGH" if priority_score >= 50.0 else "MEDIUM"

            items.append({
                "project_code": p_code,
                "project_name": row.get("project_name") or f"Project {p_code}",
                "state": row.get("state") or "Unknown",
                "agency_raw": row.get("agency_raw") or "Unknown",
                "table_section": row.get("table_section") or "Unknown",
                "cost_revised_cr": round(float(row.get("cost_revised_cr", 0.0)), 2),
                "expenditure_cum_cr": round(float(row.get("expenditure_cum_cr", 0.0)), 2),
                "physical_progress_pct": round(float(row.get("physical_progress_pct", 0.0)), 1),
                "overall_risk": overall_r,
                "cost_risk": cost_r,
                "schedule_risk": sched_r,
                "implementation_risk": impl_r,
                "trajectory": traj_state,
                "risk_velocity": vel,
                "risk_acceleration": accel,
                "data_confidence": conf,
                "priority_score": round(priority_score, 1),
                "priority": priority_level
            })

        # Sort descending by priority score
        items.sort(key=lambda x: x["priority_score"], reverse=True)

        # Assign Rank
        for rank, item in enumerate(items, start=1):
            item["rank"] = rank

        self.watchlist = items[:50]
        return self.watchlist

    def get_watchlist(self, state: Optional[str] = None, priority: Optional[str] = None,
                      trajectory: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        res = self.watchlist
        if state:
            res = [w for w in res if w["state"] == state]
        if priority:
            res = [w for w in res if w["priority"].upper() == priority.upper()]
        if trajectory:
            res = [w for w in res if w["trajectory"].upper() == trajectory.upper()]
        return res[:limit]
