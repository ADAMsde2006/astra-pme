import os
import re
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple, Optional
from backend.services.data_loader import ym_to_int_months, diff_ym_months

FEATURE_COLUMNS = [
    "cost_original_cr",
    "cost_revised_cr",
    "cost_escalation_pct",
    "expenditure_cum_cr",
    "expenditure_ratio",
    "physical_progress_pct",
    "progress_expenditure_divergence",
    "original_duration_months",
    "revised_duration_months",
    "schedule_slippage_months",
    "project_age_months",
    "time_elapsed_ratio",
    "progress_velocity",
    "expenditure_velocity",
    "has_cost_revision",
    "has_doc_revision",
    "is_overdue",
    "months_overdue",
    "remaining_cost_cr",
    "remaining_progress_pct",
    "expenditure_burn_rate",
    "progress_burn_rate",
    "data_confidence_score",
    "contradiction_count",
    "parse_flag_count"
]

CATEGORICAL_COLUMNS = [
    "state",
    "agency_raw",
    "table_section"
]

def engineer_features(df: pd.DataFrame, 
                       confidence_map: Optional[Dict[int, float]] = None,
                       contradiction_map: Optional[Dict[int, int]] = None) -> pd.DataFrame:
    res = df.copy()

    # Numeric safety
    res["cost_original_cr"] = pd.to_numeric(res["cost_original_cr"], errors="coerce").fillna(100.0)
    res["cost_revised_cr"] = pd.to_numeric(res["cost_revised_cr"], errors="coerce").fillna(res["cost_original_cr"])
    res["expenditure_cum_cr"] = pd.to_numeric(res["expenditure_cum_cr"], errors="coerce").fillna(0.0)
    res["physical_progress_pct"] = pd.to_numeric(res["physical_progress_pct"], errors="coerce").fillna(0.0).clip(0, 100)

    # 1. Cost Escalation
    res["cost_escalation_pct"] = ((res["cost_revised_cr"] - res["cost_original_cr"]) / res["cost_original_cr"].clip(lower=1.0)) * 100.0
    res["cost_escalation_pct"] = res["cost_escalation_pct"].clip(lower=-50, upper=1000)

    # 2. Expenditure Ratio
    res["expenditure_ratio"] = res["expenditure_cum_cr"] / res["cost_revised_cr"].clip(lower=1.0)
    res["expenditure_ratio"] = res["expenditure_ratio"].clip(0.0, 3.0)

    # 3. Progress-Expenditure Divergence
    res["progress_expenditure_divergence"] = res["expenditure_ratio"] - (res["physical_progress_pct"] / 100.0)

    # 4. Schedule Calculations
    orig_dur = []
    rev_dur = []
    sched_slip = []
    proj_age = []
    time_ratio = []
    is_od = []
    mo_od = []

    for _, row in res.iterrows():
        start = row.get("start_month") or row.get("approval_month") or "2020-01"
        doc_orig = row.get("doc_original") or "2026-12"
        doc_rev = row.get("doc_revised") or doc_orig
        snap = row.get("snapshot_month") or "2026-07"
        prog = row.get("physical_progress_pct", 0.0)

        # Durations in months
        od = diff_ym_months(doc_orig, start)
        od = od if od is not None and od > 0 else 24
        orig_dur.append(od)

        rd = diff_ym_months(doc_rev, start)
        rd = rd if rd is not None and rd > 0 else od
        rev_dur.append(rd)

        slip = rd - od
        sched_slip.append(max(-24, min(360, slip)))

        age = diff_ym_months(snap, start)
        age = age if age is not None and age >= 0 else 12
        proj_age.append(age)

        tr = age / max(rd, 1.0)
        time_ratio.append(min(5.0, tr))

        # Overdue check
        od_diff = diff_ym_months(snap, doc_rev)
        if od_diff is not None and od_diff > 0 and prog < 99.5:
            is_od.append(1.0)
            mo_od.append(float(od_diff))
        else:
            is_od.append(0.0)
            mo_od.append(0.0)

    res["original_duration_months"] = orig_dur
    res["revised_duration_months"] = rev_dur
    res["schedule_slippage_months"] = sched_slip
    res["project_age_months"] = proj_age
    res["time_elapsed_ratio"] = time_ratio
    res["is_overdue"] = is_od
    res["months_overdue"] = mo_od

    # 5. Velocities
    res["progress_velocity"] = res["progress_velocity"].fillna(0.0).clip(-50, 50)
    res["expenditure_velocity"] = res["expenditure_velocity"].fillna(0.0).clip(-500, 5000)

    # 6. Revision indicators
    res["has_cost_revision"] = (res["cost_revised_cr"] > (res["cost_original_cr"] + 0.01)).astype(float)
    res["has_doc_revision"] = (res["schedule_slippage_months"] > 0).astype(float)

    # 7. Remaining progress & cost
    res["remaining_cost_cr"] = (res["cost_revised_cr"] - res["expenditure_cum_cr"]).clip(lower=0.0)
    res["remaining_progress_pct"] = (100.0 - res["physical_progress_pct"]).clip(lower=0.0)

    # 8. Burn rates
    res["expenditure_burn_rate"] = res["expenditure_cum_cr"] / res["project_age_months"].clip(lower=1.0)
    res["progress_burn_rate"] = res["physical_progress_pct"] / res["project_age_months"].clip(lower=1.0)

    # 9. Data Trust & Quality features
    if confidence_map is not None:
        res["data_confidence_score"] = res["project_code"].map(lambda p: confidence_map.get(p, 85.0))
    else:
        res["data_confidence_score"] = 85.0

    if contradiction_map is not None:
        res["contradiction_count"] = res["project_code"].map(lambda p: contradiction_map.get(p, 0))
    else:
        res["contradiction_count"] = 0

    # Parse flags count
    res["parse_flag_count"] = res["parse_flags"].fillna("").apply(
        lambda f: len(f.split(";")) if f and f != "nan" else 0
    )

    return res
