import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional
from backend.services.data_loader import DataLoader
from backend.services.risk_service import RiskService

class BenchmarkService:
    _instance = None

    def __init__(self, data_loader: Optional[DataLoader] = None, risk_service: Optional[RiskService] = None):
        self.loader = data_loader or DataLoader.get_instance()
        self.risk_service = risk_service or RiskService.get_instance()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = BenchmarkService()
        return cls._instance

    def get_benchmark_for_project(self, project_code: int) -> Dict[str, Any]:
        latest_df = self.loader.get_latest_snapshot()
        all_risks = self.risk_service.get_all_latest_risks()

        proj_row = latest_df[latest_df["project_code"] == project_code]
        if proj_row.empty:
            return {"error": f"Project {project_code} not found in latest snapshot"}

        p = proj_row.iloc[0]
        state = p.get("state")
        agency = p.get("agency_raw")
        section = p.get("table_section")
        cost = p.get("cost_revised_cr", 100.0)

        # Peer filtering criteria:
        # Match sector / table_section first, or agency, or state
        peers_df = latest_df[
            (latest_df["table_section"] == section) |
            (latest_df["agency_raw"] == agency) |
            (latest_df["state"] == state)
        ].copy()

        if len(peers_df) < 5:
            # Fallback to entire portfolio if cohort too small
            peers_df = latest_df.copy()

        # Add metrics
        peers_df["cost_escalation"] = ((peers_df["cost_revised_cr"] - peers_df["cost_original_cr"]) / peers_df["cost_original_cr"].clip(lower=1.0)) * 100.0
        peers_df["expenditure_ratio"] = peers_df["expenditure_cum_cr"] / peers_df["cost_revised_cr"].clip(lower=1.0)
        peers_df["overall_risk"] = peers_df["project_code"].map(lambda pc: all_risks.get(pc, {}).get("overall_risk", 50.0))

        # Current project metrics
        curr_risk = all_risks.get(project_code, {}).get("overall_risk", 50.0)
        curr_cost_esc = float(((p["cost_revised_cr"] - p["cost_original_cr"]) / max(p["cost_original_cr"], 1.0)) * 100.0) if pd.notna(p["cost_original_cr"]) else 0.0
        curr_exp_ratio = float(p["expenditure_cum_cr"] / max(p["cost_revised_cr"], 1.0)) if pd.notna(p["expenditure_cum_cr"]) and pd.notna(p["cost_revised_cr"]) else 0.0
        curr_prog = float(p.get("physical_progress_pct", 0.0)) if pd.notna(p.get("physical_progress_pct")) else 0.0

        def calc_cohort_stats(series: pd.Series) -> Dict[str, float]:
            s = series.dropna()
            if len(s) == 0:
                return {"mean": 0.0, "median": 0.0, "p25": 0.0, "p75": 0.0}
            return {
                "mean": round(float(np.mean(s)), 2),
                "median": round(float(np.median(s)), 2),
                "p25": round(float(np.percentile(s, 25)), 2),
                "p75": round(float(np.percentile(s, 75)), 2)
            }

        # Benchmark comparison
        return {
            "project_code": project_code,
            "project_name": p.get("project_name", f"Project {project_code}"),
            "state": state,
            "agency_raw": agency,
            "table_section": section,
            "peer_count": len(peers_df),
            "current_project": {
                "cost_escalation_pct": round(curr_cost_esc, 2),
                "expenditure_ratio": round(curr_exp_ratio, 3),
                "physical_progress_pct": round(curr_prog, 1),
                "overall_risk": round(curr_risk, 1)
            },
            "cohort_benchmarks": {
                "cost_escalation_pct": calc_cohort_stats(peers_df["cost_escalation"]),
                "expenditure_ratio": calc_cohort_stats(peers_df["expenditure_ratio"]),
                "physical_progress_pct": calc_cohort_stats(peers_df["physical_progress_pct"]),
                "overall_risk": calc_cohort_stats(peers_df["overall_risk"])
            },
            "relative_position": {
                "cost_escalation_percentile": round(float((peers_df["cost_escalation"] < curr_cost_esc).mean() * 100.0), 1),
                "progress_percentile": round(float((peers_df["physical_progress_pct"] < curr_prog).mean() * 100.0), 1),
                "risk_percentile": round(float((peers_df["overall_risk"] < curr_risk).mean() * 100.0), 1)
            }
        }
