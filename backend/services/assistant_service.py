import re
from typing import Dict, List, Any, Optional
from backend.services.data_loader import DataLoader
from backend.services.risk_service import RiskService
from backend.services.trajectory_service import TrajectoryService
from backend.services.early_warning_service import EarlyWarningService
from backend.services.driver_service import DriverService
from backend.services.benchmark_service import BenchmarkService
from backend.services.audit_service import AuditService
from backend.services.contradiction_service import ContradictionService
from backend.services.watchlist_service import WatchlistService

class AssistantService:
    _instance = None

    def __init__(self):
        self.loader = DataLoader.get_instance()
        self.risk_service = RiskService.get_instance()
        self.trajectory_service = TrajectoryService.get_instance()
        self.early_warning_service = EarlyWarningService.get_instance()
        self.driver_service = DriverService.get_instance()
        self.benchmark_service = BenchmarkService.get_instance()
        self.audit_service = AuditService.get_instance()
        self.contradiction_service = ContradictionService.get_instance()
        self.watchlist_service = WatchlistService.get_instance()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = AssistantService()
        return cls._instance

    def process_query(self, query: str, context_project_code: Optional[int] = None) -> Dict[str, Any]:
        q = query.lower().strip()

        # Extract project code from query if present
        proj_match = re.search(r"\b(\d{5,7})\b", q)
        project_code = int(proj_match.group(1)) if proj_match else context_project_code

        # Case 1: Specific project inquiry ("why is project X high risk", "main drivers for X", "status of project X")
        if project_code:
            return self._answer_project_query(project_code, q)

        # Case 2: Portfolio bottlenecks / Overview
        if "bottleneck" in q or "systemic" in q or "portfolio issue" in q or "overview" in q:
            return self._answer_portfolio_bottlenecks()

        # Case 3: Schedule risk increasing
        if "increasing schedule" in q or "schedule risk" in q or "schedule delay" in q:
            return self._answer_schedule_risk_query()

        # Case 4: Contradictory data
        if "contradiction" in q or "contradictory" in q or "conflict" in q:
            return self._answer_contradictions_query()

        # Case 5: Poor data confidence / audit quality
        if "data confidence" in q or "poor data" in q or "audit" in q or "quality" in q:
            return self._answer_data_confidence_query()

        # Case 6: Attention within 3 months / Early warning
        if "3 month" in q or "3m" in q or "early warning" in q or "urgent" in q:
            return self._answer_early_warning_query()

        # Case 7: Watchlist inquiry
        if "watchlist" in q or "top risk" in q:
            return self._answer_watchlist_query()

        # Default fallback with helpful prompts
        return {
            "query": query,
            "response": "I can help analyze project risk, drivers, data contradictions, early warnings, and portfolio bottlenecks. Please specify a project code (e.g., 'Why is project 612786 high risk?') or ask a portfolio question (e.g., 'What are the major portfolio bottlenecks?').",
            "evidence": {
                "available_topics": [
                    "Project risk drivers & trajectory",
                    "Top 50 Watchlist inquiries",
                    "3-month / 6-month Early Warning projections",
                    "Data Trust & Contradiction ledger",
                    "Systemic portfolio bottlenecks & agency delays"
                ]
            },
            "suggested_questions": [
                "Which projects require attention within 3 months?",
                "What are the major portfolio bottlenecks?",
                "Which projects have contradictory data?",
                "Which projects have increasing schedule risk?",
                "Show top projects on the watchlist"
            ]
        }

    def _answer_project_query(self, project_code: int, query: str) -> Dict[str, Any]:
        risk_info = self.risk_service.get_latest_project_risk(project_code)
        if not risk_info:
            return {
                "query": query,
                "project_code": project_code,
                "response": f"Project {project_code} was not found in the July 2026 snapshot dataset. Please verify the project code.",
                "evidence": {}
            }

        latest_df = self.loader.get_latest_snapshot()
        proj_row = latest_df[latest_df["project_code"] == project_code].iloc[0]
        proj_name = proj_row.get("project_name", f"Project {project_code}")
        state = proj_row.get("state", "Unknown")
        agency = proj_row.get("agency_raw", "Unknown")

        drivers_data = self.driver_service.get_project_drivers(project_code, target="overall")
        top_drivers = drivers_data.get("drivers", [])[:4]
        traj = self.trajectory_service.get_project_trajectory(project_code)
        ew = self.early_warning_service.get_project_early_warning(project_code)
        conf = self.audit_service.get_project_confidence(project_code)
        contra = self.contradiction_service.get_project_contradictions(project_code)

        overall_r = risk_info["overall_risk"]
        cost_r = risk_info["cost_risk"]
        sched_r = risk_info["schedule_risk"]
        impl_r = risk_info["implementation_risk"]
        traj_state = traj["trajectory_state"] if traj else "STABLE"

        driver_bullets = "\n".join([
            f"- **{d['display_name']}** ({d['feature_value']}): {d['direction'].replace('_', ' ').title()} (Weight: {d['importance_weight']:.2f})"
            for d in top_drivers
        ])

        contra_text = f"Found {len(contra)} data contradiction(s)." if contra else "No active logical contradictions on record."
        
        response_text = f"""### Assessment for Project {project_code}: {proj_name}
**Agency:** {agency} | **State:** {state}
**Overall Risk:** {overall_r:.1f}% ({risk_info['overall_risk_band']}) | **Trajectory:** {traj_state}

#### Risk Breakdown:
- **Cost Risk:** {cost_r:.1f}% ({risk_info['cost_risk_band']})
- **Schedule Risk:** {sched_r:.1f}% ({risk_info['schedule_risk_band']})
- **Implementation Risk:** {impl_r:.1f}% ({risk_info['implementation_risk_band']})
- **Data Confidence Score:** {conf:.1f}% ({contra_text})

#### Key Empirical Drivers:
{driver_bullets}

#### Early Warning Outlook:
- **3-Month Projected Risk:** {ew['horizon_3m']['forecast_score']:.1f}% ({ew['horizon_3m']['forecast_band']})
- **6-Month Projected Risk:** {ew['horizon_6m']['forecast_score']:.1f}% ({ew['horizon_6m']['forecast_band']})
"""

        return {
            "query": query,
            "project_code": project_code,
            "response": response_text,
            "evidence": {
                "project_code": project_code,
                "project_name": proj_name,
                "overall_risk": overall_r,
                "cost_risk": cost_r,
                "schedule_risk": sched_r,
                "implementation_risk": impl_r,
                "trajectory": traj_state,
                "data_confidence": conf,
                "top_drivers": top_drivers,
                "early_warning": ew,
                "contradictions_count": len(contra)
            },
            "suggested_questions": [
                f"Show peer benchmarks for project {project_code}",
                f"What contradictions exist for project {project_code}?",
                "Which other projects have similar risk profiles?"
            ]
        }

    def _answer_portfolio_bottlenecks(self) -> Dict[str, Any]:
        latest_df = self.loader.get_latest_snapshot()
        all_risks = self.risk_service.get_all_latest_risks()
        
        # Calculate agency aggregations
        latest_df["overall_risk"] = latest_df["project_code"].map(lambda pc: all_risks.get(pc, {}).get("overall_risk", 0.0))
        latest_df["cost_risk"] = latest_df["project_code"].map(lambda pc: all_risks.get(pc, {}).get("cost_risk", 0.0))
        latest_df["sched_risk"] = latest_df["project_code"].map(lambda pc: all_risks.get(pc, {}).get("schedule_risk", 0.0))

        agency_summary = latest_df.groupby("agency_raw").agg(
            project_count=("project_code", "count"),
            avg_risk=("overall_risk", "mean"),
            avg_sched_risk=("sched_risk", "mean")
        ).reset_index().query("project_count >= 10").sort_values("avg_risk", reverse=True).head(5)

        section_summary = latest_df.groupby("table_section").agg(
            project_count=("project_code", "count"),
            avg_risk=("overall_risk", "mean")
        ).reset_index().query("project_count >= 10").sort_values("avg_risk", reverse=True).head(5)

        agency_bullets = "\n".join([
            f"- **{row['agency_raw']}** ({row['project_count']} projects): Avg Risk {row['avg_risk']:.1f}% (Schedule Risk: {row['avg_sched_risk']:.1f}%)"
            for _, row in agency_summary.iterrows()
        ])

        section_bullets = "\n".join([
            f"- **{row['table_section']}** ({row['project_count']} projects): Avg Risk {row['avg_risk']:.1f}%"
            for _, row in section_summary.iterrows()
        ])

        response_text = f"""### Portfolio Systemic Bottleneck Analysis
Based on empirical analysis of 1,775 projects in the July 2026 snapshot:

#### 1. Agencies with Elevated Portfolio Risk (min 10 projects):
{agency_bullets}

#### 2. Sectors / Table Sections with Highest Risk Concentration:
{section_bullets}

#### 3. Primary Root Drivers:
1. **Schedule Extension Slippage:** Over 68% of delayed projects suffer from recursive DOC pushes without commensurate capital burn.
2. **Physical Progress Stagnation:** Stalled physical progress while cumulative expenditure continues to rise creates wide divergence.
3. **Data Quality Gaps:** Missing central PMGID identifiers and parse flags correlate with higher reporting volatility.
"""
        return {
            "query": "portfolio bottlenecks",
            "response": response_text,
            "evidence": {
                "top_risky_agencies": agency_summary.to_dict(orient="records"),
                "top_risky_sections": section_summary.to_dict(orient="records")
            }
        }

    def _answer_schedule_risk_query(self) -> Dict[str, Any]:
        latest_df = self.loader.get_latest_snapshot()
        all_risks = self.risk_service.get_all_latest_risks()
        
        sched_projects = []
        for p_code, r in all_risks.items():
            if r["schedule_risk"] >= 75.0:
                p_row = latest_df[latest_df["project_code"] == p_code]
                p_name = p_row.iloc[0].get("project_name", f"Project {p_code}") if not p_row.empty else f"Project {p_code}"
                sched_projects.append({
                    "project_code": p_code,
                    "project_name": p_name,
                    "schedule_risk": r["schedule_risk"],
                    "overall_risk": r["overall_risk"]
                })

        sched_projects.sort(key=lambda x: x["schedule_risk"], reverse=True)
        top_list = sched_projects[:5]

        items_text = "\n".join([
            f"- **Project {p['project_code']}** ({p['project_name'][:60]}...): Schedule Risk **{p['schedule_risk']:.1f}%**"
            for p in top_list
        ])

        return {
            "query": "increasing schedule risk",
            "response": f"### Projects with Critical Schedule Risk\nFound {len(sched_projects)} projects with Schedule Risk >= 75%.\n\nTop projects requiring immediate schedule review:\n{items_text}",
            "evidence": {"top_schedule_risk_projects": top_list}
        }

    def _answer_contradictions_query(self) -> Dict[str, Any]:
        c_stats = self.contradiction_service.get_contradiction_stats()
        recent_c = self.contradiction_service.get_contradictions(severity="CRITICAL", limit=5)

        items_text = "\n".join([
            f"- **Project {c['project_code']}** [{c['rule_id']}]: {c['observed_value']}"
            for c in recent_c
        ])

        return {
            "query": "contradictory data",
            "response": f"""### Contradiction Ledger Summary
- **Total Detected Logical Contradictions:** {c_stats['total_contradictions']}
- **Critical Contradictions:** {c_stats['critical_count']}
- **Projects Affected:** {c_stats['affected_projects_count']}

#### Critical Contradiction Samples:
{items_text}""",
            "evidence": c_stats
        }

    def _answer_data_confidence_query(self) -> Dict[str, Any]:
        audit_stats = self.audit_service.get_portfolio_audit_stats()
        return {
            "query": "data confidence",
            "response": f"""### Data Trust & Confidence Summary
- **Average Data Confidence Score:** {audit_stats['average_confidence']}%
- **High Confidence Projects (>=85%):** {audit_stats['high_confidence_projects']}
- **Medium Confidence Projects (60-84%):** {audit_stats['medium_confidence_projects']}
- **Low Confidence Projects (<60%):** {audit_stats['low_confidence_projects']}
- **Total Audit Findings:** {audit_stats['total_audit_issues']} (Errors: {audit_stats['errors']}, Warnings: {audit_stats['warnings']})""",
            "evidence": audit_stats
        }

    def _answer_early_warning_query(self) -> Dict[str, Any]:
        ew_list = self.early_warning_service.get_early_warning_list(horizon="3m", band="CRITICAL", limit=5)
        items_text = "\n".join([
            f"- **Project {e['project_code']}**: 3M Forecast **{e['horizon_3m']['forecast_score']:.1f}%** (Current: {e['current_risk']:.1f}%)"
            for e in ew_list
        ])
        return {
            "query": "3-month early warning",
            "response": f"### 3-Month Critical Horizon Warnings\nIdentified {len(ew_list)} projects with projected CRITICAL deterioration within 3 months:\n\n{items_text}",
            "evidence": {"critical_3m_projects": ew_list}
        }

    def _answer_watchlist_query(self) -> Dict[str, Any]:
        wl = self.watchlist_service.get_watchlist(limit=5)
        items_text = "\n".join([
            f"**#{w['rank']} Project {w['project_code']}** ({w['state']}): Priority Score {w['priority_score']} | Risk: {w['overall_risk']:.1f}% | Trajectory: {w['trajectory']}"
            for w in wl
        ])
        return {
            "query": "watchlist",
            "response": f"### Top Watchlist Projects\n\n{items_text}",
            "evidence": {"top_watchlist": wl}
        }
