import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from backend.services.data_loader import DataLoader
from backend.services.risk_service import RiskService

class TrajectoryService:
    _instance = None

    def __init__(self, data_loader: Optional[DataLoader] = None, risk_service: Optional[RiskService] = None):
        self.loader = data_loader or DataLoader.get_instance()
        self.risk_service = risk_service or RiskService.get_instance()
        self.project_trajectories: Dict[int, Dict[str, Any]] = {}
        self.compute_trajectories()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = TrajectoryService()
        return cls._instance

    def compute_trajectories(self):
        latest_risks = self.risk_service.get_all_latest_risks()
        trajectories = {}

        for p_code in latest_risks.keys():
            history = self.risk_service.get_project_risk_history(p_code)
            if not history:
                continue

            months = [h["snapshot_month"] for h in history]
            overall_risks = [h["overall_risk"] for h in history]
            cost_risks = [h["cost_risk"] for h in history]
            sched_risks = [h["schedule_risk"] for h in history]
            impl_risks = [h["implementation_risk"] for h in history]

            # Compute velocities: risk(t) - risk(t-1)
            velocities = []
            for i in range(1, len(overall_risks)):
                v = overall_risks[i] - overall_risks[i-1]
                velocities.append(round(v, 2))

            # Compute accelerations: velocity(t) - velocity(t-1)
            accelerations = []
            for i in range(1, len(velocities)):
                a = velocities[i] - velocities[i-1]
                accelerations.append(round(a, 2))

            current_risk = overall_risks[-1]
            current_velocity = velocities[-1] if velocities else 0.0
            current_acceleration = accelerations[-1] if accelerations else 0.0

            # Classification logic
            if current_velocity > 5.0 and current_acceleration > 0:
                trajectory_state = "RAPIDLY DETERIORATING"
            elif current_velocity > 2.0 or (current_velocity > 0 and current_risk > 70.0):
                trajectory_state = "DETERIORATING"
            elif current_velocity < -3.0:
                trajectory_state = "IMPROVING"
            else:
                trajectory_state = "STABLE"

            trajectories[p_code] = {
                "project_code": p_code,
                "current_risk": current_risk,
                "current_velocity": current_velocity,
                "current_acceleration": current_acceleration,
                "trajectory_state": trajectory_state,
                "months": months,
                "overall_risks": overall_risks,
                "cost_risks": cost_risks,
                "schedule_risks": sched_risks,
                "implementation_risks": impl_risks,
                "velocities": velocities,
                "accelerations": accelerations
            }

        self.project_trajectories = trajectories

    def get_project_trajectory(self, project_code: int) -> Optional[Dict[str, Any]]:
        return self.project_trajectories.get(project_code)

    def get_portfolio_trajectory_summary(self) -> Dict[str, Any]:
        states = [t["trajectory_state"] for t in self.project_trajectories.values()]
        return {
            "total_tracked": len(states),
            "rapidly_deteriorating": states.count("RAPIDLY DETERIORATING"),
            "deteriorating": states.count("DETERIORATING"),
            "stable": states.count("STABLE"),
            "improving": states.count("IMPROVING")
        }
