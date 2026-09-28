from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np

from backend.services.data_loader import DataLoader
from backend.services.audit_service import AuditService
from backend.services.contradiction_service import ContradictionService
from backend.services.exit_service import ExitService
from backend.services.risk_service import RiskService
from backend.services.trajectory_service import TrajectoryService
from backend.services.early_warning_service import EarlyWarningService
from backend.services.driver_service import DriverService
from backend.services.benchmark_service import BenchmarkService
from backend.services.watchlist_service import WatchlistService
from backend.services.assistant_service import AssistantService
from backend.services.model_card_service import ModelCardService
from backend.utils.json_cleaner import clean_json_val

api_router = APIRouter()

class AssistantRequest(BaseModel):
    query: str
    project_code: Optional[int] = None

# 1. OVERVIEW
@api_router.get("/overview")
def get_overview():
    loader = DataLoader.get_instance()
    risk_svc = RiskService.get_instance()
    traj_svc = TrajectoryService.get_instance()
    audit_svc = AuditService.get_instance()
    contra_svc = ContradictionService.get_instance()
    exit_svc = ExitService.get_instance()

    latest_df = loader.get_latest_snapshot()
    all_risks = risk_svc.get_all_latest_risks()
    
    total_projects = len(latest_df)
    risk_values = [r["overall_risk"] for r in all_risks.values()]
    high_risk_count = sum(1 for r in risk_values if r >= 60.0)
    critical_risk_count = sum(1 for r in risk_values if r >= 80.0)
    moderate_risk_count = sum(1 for r in risk_values if 35.0 <= r < 60.0)
    low_risk_count = sum(1 for r in risk_values if r < 35.0)

    # Cost, Schedule, Implementation breakdown
    avg_cost_risk = float(np.mean([r["cost_risk"] for r in all_risks.values()]))
    avg_sched_risk = float(np.mean([r["schedule_risk"] for r in all_risks.values()]))
    avg_impl_risk = float(np.mean([r["implementation_risk"] for r in all_risks.values()]))

    # Trajectory summary
    traj_summary = traj_svc.get_portfolio_trajectory_summary()
    audit_summary = audit_svc.get_portfolio_audit_stats()
    contra_summary = contra_svc.get_contradiction_stats()
    exit_summary = exit_svc.get_exit_stats()

    # State level risk aggregation
    latest_df["overall_risk"] = latest_df["project_code"].map(lambda pc: all_risks.get(pc, {}).get("overall_risk", 0.0))
    latest_df["cost_revised_cr"] = pd.to_numeric(latest_df["cost_revised_cr"], errors="coerce").fillna(0.0)
    latest_df["expenditure_cum_cr"] = pd.to_numeric(latest_df["expenditure_cum_cr"], errors="coerce").fillna(0.0)

    state_agg = latest_df.groupby("state").agg(
        project_count=("project_code", "count"),
        total_cost_cr=("cost_revised_cr", "sum"),
        total_exp_cr=("expenditure_cum_cr", "sum"),
        avg_risk=("overall_risk", "mean")
    ).reset_index().sort_values("project_count", ascending=False).head(12)

    # Agency risk aggregation
    agency_agg = latest_df.groupby("agency_raw").agg(
        project_count=("project_code", "count"),
        avg_risk=("overall_risk", "mean")
    ).reset_index().sort_values("project_count", ascending=False).head(10)

    # Sector / Table Section risk aggregation
    sector_agg = latest_df.groupby("table_section").agg(
        project_count=("project_code", "count"),
        avg_risk=("overall_risk", "mean")
    ).reset_index().sort_values("project_count", ascending=False).head(8)

    # Monthly snapshot progression
    snap_counts = loader.canonical_df["snapshot_month"].value_counts().to_dict()

    return clean_json_val({
        "snapshot_month": "2026-07",
        "total_projects_monitored": total_projects,
        "total_distinct_projects": loader.canonical_df["project_code"].nunique(),
        "longitudinal_core_projects": 1603,
        "monthly_snapshots": snap_counts,
        "risk_summary": {
            "critical_risk_count": critical_risk_count,
            "high_risk_count": high_risk_count,
            "moderate_risk_count": moderate_risk_count,
            "low_risk_count": low_risk_count,
            "avg_overall_risk": round(float(np.mean(risk_values)), 1),
            "avg_cost_risk": round(avg_cost_risk, 1),
            "avg_schedule_risk": round(avg_sched_risk, 1),
            "avg_implementation_risk": round(avg_impl_risk, 1)
        },
        "trajectory_summary": traj_summary,
        "audit_summary": audit_summary,
        "contradiction_summary": contra_summary,
        "exit_summary": exit_summary,
        "state_breakdown": state_agg.to_dict(orient="records"),
        "agency_breakdown": agency_agg.to_dict(orient="records"),
        "sector_breakdown": sector_agg.to_dict(orient="records")
    })

# 2. PROJECTS LIST
@api_router.get("/projects")
def get_projects(
    search: Optional[str] = None,
    state: Optional[str] = None,
    agency: Optional[str] = None,
    section: Optional[str] = None,
    risk_band: Optional[str] = None,
    page: int = 1,
    limit: int = 50
):
    loader = DataLoader.get_instance()
    risk_svc = RiskService.get_instance()
    traj_svc = TrajectoryService.get_instance()
    audit_svc = AuditService.get_instance()

    latest_df = loader.get_latest_snapshot()
    all_risks = risk_svc.get_all_latest_risks()

    records = []
    for idx, row in latest_df.iterrows():
        p_code = int(row["project_code"])
        r_dict = all_risks.get(p_code, {})
        traj = traj_svc.get_project_trajectory(p_code)
        conf = audit_svc.get_project_confidence(p_code)

        overall_r = r_dict.get("overall_risk", 0.0)
        o_band = r_dict.get("overall_risk_band", "LOW")

        p_name = row.get("project_name") or f"Project {p_code}"
        p_state = row.get("state") or "Unknown"
        p_agency = row.get("agency_raw") or "Unknown"
        p_sec = row.get("table_section") or "Unknown"

        # Search filter
        if search:
            q = search.lower()
            if q not in str(p_code) and q not in p_name.lower() and q not in p_agency.lower() and q not in p_state.lower():
                continue
        if state and p_state != state:
            continue
        if agency and p_agency != agency:
            continue
        if section and p_sec != section:
            continue
        if risk_band and o_band != risk_band.upper():
            continue

        records.append({
            "project_code": p_code,
            "project_name": p_name,
            "state": p_state,
            "agency_raw": p_agency,
            "table_section": p_sec,
            "cost_revised_cr": round(float(row.get("cost_revised_cr", 0.0)), 2),
            "expenditure_cum_cr": round(float(row.get("expenditure_cum_cr", 0.0)), 2),
            "physical_progress_pct": round(float(row.get("physical_progress_pct", 0.0)), 1),
            "overall_risk": overall_r,
            "cost_risk": r_dict.get("cost_risk", 0.0),
            "schedule_risk": r_dict.get("schedule_risk", 0.0),
            "implementation_risk": r_dict.get("implementation_risk", 0.0),
            "overall_risk_band": o_band,
            "trajectory": traj["trajectory_state"] if traj else "STABLE",
            "data_confidence": conf
        })

    # Sort descending by overall risk
    records.sort(key=lambda x: x["overall_risk"], reverse=True)
    total_count = len(records)
    start_idx = (page - 1) * limit
    paginated = records[start_idx:start_idx + limit]

    return clean_json_val({
        "total_count": total_count,
        "page": page,
        "limit": limit,
        "projects": paginated
    })

# 3. PROJECT DETAIL
@api_router.get("/projects/{project_code}")
def get_project_detail(project_code: int):
    loader = DataLoader.get_instance()
    risk_svc = RiskService.get_instance()
    traj_svc = TrajectoryService.get_instance()
    early_warning_svc = EarlyWarningService.get_instance()
    driver_svc = DriverService.get_instance()
    benchmark_svc = BenchmarkService.get_instance()
    audit_svc = AuditService.get_instance()
    contra_svc = ContradictionService.get_instance()
    exit_svc = ExitService.get_instance()

    latest_df = loader.get_latest_snapshot()
    proj_rows = latest_df[latest_df["project_code"] == project_code]
    
    if proj_rows.empty:
        # Check historical snapshots
        history_df = loader.get_project_history(project_code)
        if history_df.empty:
            raise HTTPException(status_code=404, detail=f"Project {project_code} not found in repository.")
        p = history_df.iloc[-1]
    else:
        p = proj_rows.iloc[0]

    # Project Information
    project_info = {
        "project_code": project_code,
        "project_name": p.get("project_name", f"Project {project_code}"),
        "state": p.get("state", "Unknown"),
        "agency_raw": p.get("agency_raw", "Unknown"),
        "table_section": p.get("table_section", "Unknown"),
        "legacy_ocms_code": p.get("legacy_ocms_code"),
        "pmgid": p.get("pmgid"),
        "cost_original_cr": round(float(p.get("cost_original_cr", 0.0)), 2) if pd.notna(p.get("cost_original_cr")) else None,
        "cost_revised_cr": round(float(p.get("cost_revised_cr", 0.0)), 2) if pd.notna(p.get("cost_revised_cr")) else None,
        "expenditure_cum_cr": round(float(p.get("expenditure_cum_cr", 0.0)), 2) if pd.notna(p.get("expenditure_cum_cr")) else None,
        "physical_progress_pct": round(float(p.get("physical_progress_pct", 0.0)), 1) if pd.notna(p.get("physical_progress_pct")) else 0.0,
        "approval_month": p.get("approval_month"),
        "start_month": p.get("start_month"),
        "doc_original": p.get("doc_original"),
        "doc_revised": p.get("doc_revised"),
        "parse_flags": p.get("parse_flags")
    }

    # Longitudinal History
    history_df = loader.get_project_history(project_code)
    longitudinal_history = []
    for _, h_row in history_df.iterrows():
        s_month = h_row["snapshot_month"]
        r_hist = risk_svc.project_risk_cache.get(s_month, {}).get(project_code, {})
        longitudinal_history.append({
            "snapshot_month": s_month,
            "cost_revised_cr": round(float(h_row.get("cost_revised_cr", 0.0)), 2) if pd.notna(h_row.get("cost_revised_cr")) else None,
            "expenditure_cum_cr": round(float(h_row.get("expenditure_cum_cr", 0.0)), 2) if pd.notna(h_row.get("expenditure_cum_cr")) else None,
            "physical_progress_pct": round(float(h_row.get("physical_progress_pct", 0.0)), 1) if pd.notna(h_row.get("physical_progress_pct")) else 0.0,
            "progress_velocity": round(float(h_row.get("progress_velocity", 0.0)), 2),
            "expenditure_velocity": round(float(h_row.get("expenditure_velocity", 0.0)), 2),
            "doc_revised": h_row.get("doc_revised"),
            "overall_risk": r_hist.get("overall_risk", 0.0),
            "cost_risk": r_hist.get("cost_risk", 0.0),
            "schedule_risk": r_hist.get("schedule_risk", 0.0),
            "implementation_risk": r_hist.get("implementation_risk", 0.0)
        })

    # Risk & Trajectory & Early Warning
    raw_risk = risk_svc.get_latest_project_risk(project_code) or {
        "overall_risk": 50.0, "cost_risk": 50.0, "schedule_risk": 50.0, "implementation_risk": 50.0,
        "overall_risk_band": "MODERATE", "cost_risk_band": "MODERATE", "schedule_risk_band": "MODERATE",
        "implementation_risk_band": "MODERATE", "anomaly_score": 0.0
    }
    # Exclude non-serializable pandas Series from risk
    risk = {k: v for k, v in raw_risk.items() if k != "features_row"}

    trajectory = traj_svc.get_project_trajectory(project_code) or {
        "current_risk": 50.0, "current_velocity": 0.0, "current_acceleration": 0.0, "trajectory_state": "STABLE",
        "months": ["2026-07"], "overall_risks": [50.0]
    }
    early_warning = early_warning_svc.get_project_early_warning(project_code)
    drivers = driver_svc.get_project_drivers(project_code, target="overall")
    benchmarks = benchmark_svc.get_benchmark_for_project(project_code)
    
    # Data Trust (Audits, Contradictions, Confidence)
    project_audits = audit_svc.get_audits(project_code=project_code)
    project_contradictions = contra_svc.get_project_contradictions(project_code)
    data_confidence = audit_svc.get_project_confidence(project_code)
    exit_status = exit_svc.get_project_exit_status(project_code)

    # Administrative Attention Assessment (Rule-based recommendation)
    admin_priority = "LOW"
    admin_reasons = []
    if risk.get("overall_risk", 0) >= 80.0:
        admin_priority = "CRITICAL"
        admin_reasons.append("Overall risk is in Critical band (>=80%)")
    elif risk.get("overall_risk", 0) >= 60.0:
        admin_priority = "HIGH"
        admin_reasons.append("Overall risk is in High band (>=60%)")

    if trajectory.get("trajectory_state") == "RAPIDLY DETERIORATING":
        admin_priority = "CRITICAL"
        admin_reasons.append("Risk is accelerating month-over-month (Rapidly Deteriorating)")

    if len([c for c in project_contradictions if c["severity"] == "CRITICAL"]) > 0:
        admin_reasons.append("Active critical data contradiction requires data reconciliation")

    if not admin_reasons:
        admin_reasons.append("Project execution within stable parameters; continue routine monthly monitoring")

    return clean_json_val({
        "project_info": project_info,
        "risk": risk,
        "trajectory": trajectory,
        "early_warning": early_warning,
        "drivers": drivers,
        "benchmarks": benchmarks,
        "data_trust": {
            "confidence_score": data_confidence,
            "audits": project_audits,
            "contradictions": project_contradictions,
            "anomaly_score": risk.get("anomaly_score", 0.0)
        },
        "longitudinal_history": longitudinal_history,
        "exit_status": exit_status,
        "administrative_attention": {
            "priority": admin_priority,
            "reasons": admin_reasons
        }
    })

# 4. WATCHLIST
@api_router.get("/watchlist")
def get_watchlist(state: Optional[str] = None, priority: Optional[str] = None, trajectory: Optional[str] = None):
    watchlist_svc = WatchlistService.get_instance()
    return clean_json_val(watchlist_svc.get_watchlist(state=state, priority=priority, trajectory=trajectory))

# 5. EARLY WARNING
@api_router.get("/early-warning")
def get_early_warning(horizon: str = "3m", band: Optional[str] = None):
    ew_svc = EarlyWarningService.get_instance()
    return clean_json_val(ew_svc.get_early_warning_list(horizon=horizon, band=band, limit=200))

# 6. DRIVERS
@api_router.get("/drivers/{project_code}")
def get_drivers(project_code: int, target: str = "overall"):
    driver_svc = DriverService.get_instance()
    return clean_json_val(driver_svc.get_project_drivers(project_code, target=target))

# 7. BENCHMARKS
@api_router.get("/benchmark/{project_code}")
def get_benchmark(project_code: int):
    bm_svc = BenchmarkService.get_instance()
    return clean_json_val(bm_svc.get_benchmark_for_project(project_code))

# 8. AUDIT
@api_router.get("/audit")
def get_audits(snapshot_month: Optional[str] = None, severity: Optional[str] = None,
               project_code: Optional[int] = None, state: Optional[str] = None):
    audit_svc = AuditService.get_instance()
    return clean_json_val({
        "stats": audit_svc.get_portfolio_audit_stats(),
        "audits": audit_svc.get_audits(snapshot_month=snapshot_month, severity=severity, project_code=project_code, state=state, limit=500)
    })

# 9. CONTRADICTIONS
@api_router.get("/contradictions")
def get_contradictions(severity: Optional[str] = None, snapshot_month: Optional[str] = None,
                       project_code: Optional[int] = None, rule_id: Optional[str] = None,
                       state: Optional[str] = None):
    contra_svc = ContradictionService.get_instance()
    return clean_json_val({
        "stats": contra_svc.get_contradiction_stats(),
        "contradictions": contra_svc.get_contradictions(severity=severity, snapshot_month=snapshot_month, project_code=project_code, rule_id=rule_id, state=state, limit=500)
    })

# 10. EXITS
@api_router.get("/exits")
def get_exits(status: Optional[str] = None, state: Optional[str] = None, agency: Optional[str] = None):
    exit_svc = ExitService.get_instance()
    return clean_json_val({
        "stats": exit_svc.get_exit_stats(),
        "exits": exit_svc.get_exits(status=status, state=state, agency=agency, limit=500)
    })

# 11. MODEL CARD
@api_router.get("/model-card")
def get_model_card():
    mc_svc = ModelCardService.get_instance()
    return clean_json_val(mc_svc.get_model_card())

# 12. ASSISTANT QUERY
@api_router.post("/assistant/query")
def assistant_query(payload: AssistantRequest):
    as_svc = AssistantService.get_instance()
    return clean_json_val(as_svc.process_query(payload.query, payload.project_code))

