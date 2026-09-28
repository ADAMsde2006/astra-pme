import os
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from backend.services.data_loader import DataLoader, ym_to_int_months, diff_ym_months

class ContradictionService:
    _instance = None

    def __init__(self, data_loader: Optional[DataLoader] = None):
        self.loader = data_loader or DataLoader.get_instance()
        self.contradictions: List[Dict[str, Any]] = []
        self.run_contradiction_detection()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = ContradictionService()
        return cls._instance

    def run_contradiction_detection(self):
        df = self.loader.canonical_df
        contradictions = []

        # 1. Single-snapshot logical contradictions
        for idx, row in df.iterrows():
            p_code = int(row["project_code"])
            snap = row["snapshot_month"]
            p_name = row["project_name"] or f"Project {p_code}"
            state = row["state"] or "Unknown"
            agency = row["agency_raw"] or "Unknown"

            # Rule C01: Over-expenditure conflict (expenditure > revised cost)
            if pd.notna(row["expenditure_cum_cr"]) and pd.notna(row["cost_revised_cr"]):
                if row["cost_revised_cr"] > 0 and row["expenditure_cum_cr"] > row["cost_revised_cr"] * 1.05:
                    overrun_pct = ((row["expenditure_cum_cr"] - row["cost_revised_cr"]) / row["cost_revised_cr"]) * 100
                    contradictions.append({
                        "id": f"CONT-{p_code}-{snap}-C01",
                        "project_code": p_code,
                        "project_name": p_name,
                        "state": state,
                        "agency_raw": agency,
                        "snapshot_month": snap,
                        "rule_id": "RULE_EXPENDITURE_OVERRUN",
                        "field": "expenditure_cum_cr",
                        "observed_value": f"Expenditure {row['expenditure_cum_cr']:.2f} Cr > Revised {row['cost_revised_cr']:.2f} Cr (+{overrun_pct:.1f}%)",
                        "expected_condition": "expenditure_cum_cr <= cost_revised_cr",
                        "severity": "CRITICAL" if overrun_pct > 20 else "WARNING",
                        "status": "OPEN",
                        "category": "Financial Logic"
                    })

            # Rule C02: Severe cost reduction / negative revision without structural explanation
            if pd.notna(row["cost_original_cr"]) and pd.notna(row["cost_revised_cr"]):
                if row["cost_original_cr"] > 0 and row["cost_revised_cr"] < row["cost_original_cr"] * 0.7:
                    drop_pct = ((row["cost_original_cr"] - row["cost_revised_cr"]) / row["cost_original_cr"]) * 100
                    contradictions.append({
                        "id": f"CONT-{p_code}-{snap}-C02",
                        "project_code": p_code,
                        "project_name": p_name,
                        "state": state,
                        "agency_raw": agency,
                        "snapshot_month": snap,
                        "rule_id": "RULE_ANOMALOUS_COST_CONTRACTION",
                        "field": "cost_revised_cr",
                        "observed_value": f"Revised {row['cost_revised_cr']:.2f} Cr is {drop_pct:.1f}% lower than Original {row['cost_original_cr']:.2f} Cr",
                        "expected_condition": "cost_revised_cr >= cost_original_cr (or scope de-escalation notice)",
                        "severity": "WARNING",
                        "status": "OPEN",
                        "category": "Cost Consistency"
                    })

            # Rule C03: Inverted Progress vs Expenditure
            if pd.notna(row["expenditure_cum_cr"]) and pd.notna(row["cost_revised_cr"]) and pd.notna(row["physical_progress_pct"]):
                if row["cost_revised_cr"] > 0:
                    exp_ratio = row["expenditure_cum_cr"] / row["cost_revised_cr"]
                    prog_ratio = row["physical_progress_pct"] / 100.0
                    if exp_ratio >= 0.70 and prog_ratio <= 0.10:
                        contradictions.append({
                            "id": f"CONT-{p_code}-{snap}-C03",
                            "project_code": p_code,
                            "project_name": p_name,
                            "state": state,
                            "agency_raw": agency,
                            "snapshot_month": snap,
                            "rule_id": "RULE_EXPENDITURE_PROGRESS_DIVERGENCE",
                            "field": "physical_progress_pct",
                            "observed_value": f"Expenditure is {exp_ratio*100:.1f}% but Physical Progress is only {row['physical_progress_pct']:.1f}%",
                            "expected_condition": "Physical progress aligned with cumulative capital expenditure",
                            "severity": "CRITICAL",
                            "status": "OPEN",
                            "category": "Progress / Financial"
                        })
                    elif prog_ratio >= 0.90 and exp_ratio <= 0.10:
                        contradictions.append({
                            "id": f"CONT-{p_code}-{snap}-C04",
                            "project_code": p_code,
                            "project_name": p_name,
                            "state": state,
                            "agency_raw": agency,
                            "snapshot_month": snap,
                            "rule_id": "RULE_ZERO_EXPENDITURE_NEAR_COMPLETION",
                            "field": "expenditure_cum_cr",
                            "observed_value": f"Physical Progress {row['physical_progress_pct']:.1f}% but Expenditure only {exp_ratio*100:.1f}%",
                            "expected_condition": "Expenditure reported for nearly completed works",
                            "severity": "WARNING",
                            "status": "OPEN",
                            "category": "Progress / Financial"
                        })

            # Rule C05: Date ordering conflict (Start > DOC Original)
            if pd.notna(row["start_month"]) and pd.notna(row["doc_original"]):
                dur = diff_ym_months(row["doc_original"], row["start_month"])
                if dur is not None and dur < 0:
                    contradictions.append({
                        "id": f"CONT-{p_code}-{snap}-C05",
                        "project_code": p_code,
                        "project_name": p_name,
                        "state": state,
                        "agency_raw": agency,
                        "snapshot_month": snap,
                        "rule_id": "RULE_DATE_ORDERING_START_AFTER_DOC",
                        "field": "doc_original",
                        "observed_value": f"Start ({row['start_month']}) is after Original DOC ({row['doc_original']}) by {-dur} months",
                        "expected_condition": "start_month <= doc_original",
                        "severity": "CRITICAL",
                        "status": "OPEN",
                        "category": "Temporal Ordering"
                    })

            # Rule C06: Approval date after Start date
            if pd.notna(row["approval_month"]) and pd.notna(row["start_month"]):
                dur = diff_ym_months(row["start_month"], row["approval_month"])
                if dur is not None and dur < -12: # Started more than 1 year prior to approval without retroactive regularization flag
                    contradictions.append({
                        "id": f"CONT-{p_code}-{snap}-C06",
                        "project_code": p_code,
                        "project_name": p_name,
                        "state": state,
                        "agency_raw": agency,
                        "snapshot_month": snap,
                        "rule_id": "RULE_DATE_ORDERING_START_PRE_APPROVAL",
                        "field": "start_month",
                        "observed_value": f"Start ({row['start_month']}) is {-dur} months before formal Approval ({row['approval_month']})",
                        "expected_condition": "approval_month <= start_month",
                        "severity": "INFO",
                        "status": "OPEN",
                        "category": "Temporal Ordering"
                    })

        # 2. Cross-month longitudinal contradictions
        grouped = df.groupby("project_code")
        for p_code, group in grouped:
            if len(group) < 2:
                continue
            sorted_group = group.sort_values("snapshot_month").reset_index(drop=True)
            proj_name = sorted_group["project_name"].dropna().iloc[0] if len(sorted_group["project_name"].dropna()) > 0 else f"Project {p_code}"
            state = sorted_group["state"].dropna().iloc[0] if len(sorted_group["state"].dropna()) > 0 else "Unknown"
            agency = sorted_group["agency_raw"].dropna().iloc[0] if len(sorted_group["agency_raw"].dropna()) > 0 else "Unknown"

            for i in range(1, len(sorted_group)):
                prev_row = sorted_group.iloc[i-1]
                curr_row = sorted_group.iloc[i]
                curr_snap = curr_row["snapshot_month"]
                prev_snap = prev_row["snapshot_month"]

                # Rule C07: Physical Progress Regression (Progress decreased from previous month)
                if pd.notna(prev_row["physical_progress_pct"]) and pd.notna(curr_row["physical_progress_pct"]):
                    prog_drop = prev_row["physical_progress_pct"] - curr_row["physical_progress_pct"]
                    if prog_drop > 2.0: # Meaningful drop > 2%
                        contradictions.append({
                            "id": f"CONT-{p_code}-{curr_snap}-C07",
                            "project_code": p_code,
                            "project_name": proj_name,
                            "state": state,
                            "agency_raw": agency,
                            "snapshot_month": curr_snap,
                            "rule_id": "RULE_CROSS_MONTH_PROGRESS_REGRESSION",
                            "field": "physical_progress_pct",
                            "observed_value": f"Progress dropped from {prev_row['physical_progress_pct']:.1f}% ({prev_snap}) to {curr_row['physical_progress_pct']:.1f}% ({curr_snap}) [-{prog_drop:.1f}%]",
                            "expected_condition": "Cumulative physical progress is non-decreasing across consecutive monthly flash reports",
                            "severity": "CRITICAL" if prog_drop > 10 else "WARNING",
                            "status": "OPEN",
                            "category": "Cross-Month Consistency"
                        })

                # Rule C08: Cumulative Expenditure Regression (Expenditure dropped)
                if pd.notna(prev_row["expenditure_cum_cr"]) and pd.notna(curr_row["expenditure_cum_cr"]):
                    exp_drop = prev_row["expenditure_cum_cr"] - curr_row["expenditure_cum_cr"]
                    if exp_drop > 5.0 and (exp_drop / max(prev_row["expenditure_cum_cr"], 1.0)) > 0.05:
                        contradictions.append({
                            "id": f"CONT-{p_code}-{curr_snap}-C08",
                            "project_code": p_code,
                            "project_name": proj_name,
                            "state": state,
                            "agency_raw": agency,
                            "snapshot_month": curr_snap,
                            "rule_id": "RULE_CROSS_MONTH_EXPENDITURE_REGRESSION",
                            "field": "expenditure_cum_cr",
                            "observed_value": f"Expenditure dropped from {prev_row['expenditure_cum_cr']:.2f} Cr ({prev_snap}) to {curr_row['expenditure_cum_cr']:.2f} Cr ({curr_snap}) [-{exp_drop:.2f} Cr]",
                            "expected_condition": "Cumulative expenditure is monotonic non-decreasing",
                            "severity": "WARNING",
                            "status": "OPEN",
                            "category": "Cross-Month Consistency"
                        })

        self.contradictions = contradictions
        return self.contradictions

    def get_contradictions(self, severity: Optional[str] = None, snapshot_month: Optional[str] = None,
                            project_code: Optional[int] = None, rule_id: Optional[str] = None,
                            state: Optional[str] = None, limit: int = 500) -> List[Dict[str, Any]]:
        res = self.contradictions
        if severity:
            res = [c for c in res if c["severity"].upper() == severity.upper()]
        if snapshot_month:
            res = [c for c in res if c["snapshot_month"] == snapshot_month]
        if project_code:
            res = [c for c in res if c["project_code"] == project_code]
        if rule_id:
            res = [c for c in res if c["rule_id"] == rule_id]
        if state:
            res = [c for c in res if c.get("state") == state]
        return res[:limit]

    def get_project_contradictions(self, project_code: int) -> List[Dict[str, Any]]:
        return [c for c in self.contradictions if c["project_code"] == project_code]

    def get_contradiction_stats(self) -> Dict[str, Any]:
        total = len(self.contradictions)
        critical = sum(1 for c in self.contradictions if c["severity"] == "CRITICAL")
        warning = sum(1 for c in self.contradictions if c["severity"] == "WARNING")
        info = sum(1 for c in self.contradictions if c["severity"] == "INFO")
        
        projects_with_contradictions = len(set(c["project_code"] for c in self.contradictions))
        
        rule_counts = {}
        for c in self.contradictions:
            r = c["rule_id"]
            rule_counts[r] = rule_counts.get(r, 0) + 1

        return {
            "total_contradictions": total,
            "critical_count": critical,
            "warning_count": warning,
            "info_count": info,
            "affected_projects_count": projects_with_contradictions,
            "by_rule": rule_counts
        }
