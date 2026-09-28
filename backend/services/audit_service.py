import os
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from backend.services.data_loader import DataLoader, ym_to_int_months, diff_ym_months

class AuditService:
    _instance = None

    def __init__(self, data_loader: Optional[DataLoader] = None):
        self.loader = data_loader or DataLoader.get_instance()
        self.audits: List[Dict[str, Any]] = []
        self.project_confidence: Dict[int, float] = {}
        self.project_audit_summary: Dict[int, Dict[str, Any]] = {}
        self.run_audit()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = AuditService()
        return cls._instance

    def run_audit(self):
        df = self.loader.canonical_df
        audits = []
        project_scores = {}
        project_summaries = {}

        grouped = df.groupby("project_code")

        for p_code, group in grouped:
            proj_audits = []
            proj_name = group["project_name"].dropna().iloc[0] if len(group["project_name"].dropna()) > 0 else f"Project {p_code}"
            state = group["state"].dropna().iloc[0] if len(group["state"].dropna()) > 0 else "Unknown"
            agency = group["agency_raw"].dropna().iloc[0] if len(group["agency_raw"].dropna()) > 0 else "Unknown"

            for _, row in group.iterrows():
                snap = row["snapshot_month"]
                
                # Check 1: Missing core fields
                if pd.isna(row["cost_original_cr"]) or row["cost_original_cr"] is None:
                    proj_audits.append({
                        "project_code": p_code, "project_name": proj_name, "state": state, "agency_raw": agency,
                        "snapshot_month": snap, "field": "cost_original_cr", "issue": "Missing original cost",
                        "observed_value": "NULL", "expected_condition": "cost_original_cr > 0",
                        "severity": "ERROR", "status": "OPEN"
                    })
                if pd.isna(row["cost_revised_cr"]) or row["cost_revised_cr"] is None:
                    proj_audits.append({
                        "project_code": p_code, "project_name": proj_name, "state": state, "agency_raw": agency,
                        "snapshot_month": snap, "field": "cost_revised_cr", "issue": "Missing revised cost",
                        "observed_value": "NULL", "expected_condition": "cost_revised_cr > 0",
                        "severity": "ERROR", "status": "OPEN"
                    })
                if pd.isna(row["expenditure_cum_cr"]):
                    proj_audits.append({
                        "project_code": p_code, "project_name": proj_name, "state": state, "agency_raw": agency,
                        "snapshot_month": snap, "field": "expenditure_cum_cr", "issue": "Missing cumulative expenditure",
                        "observed_value": "NULL", "expected_condition": "expenditure_cum_cr >= 0",
                        "severity": "WARNING", "status": "OPEN"
                    })
                if pd.isna(row["physical_progress_pct"]):
                    proj_audits.append({
                        "project_code": p_code, "project_name": proj_name, "state": state, "agency_raw": agency,
                        "snapshot_month": snap, "field": "physical_progress_pct", "issue": "Missing physical progress",
                        "observed_value": "NULL", "expected_condition": "0 <= physical_progress_pct <= 100",
                        "severity": "ERROR", "status": "OPEN"
                    })
                
                # Check 2: Invalid numeric values
                if pd.notna(row["cost_original_cr"]) and row["cost_original_cr"] <= 0:
                    proj_audits.append({
                        "project_code": p_code, "project_name": proj_name, "state": state, "agency_raw": agency,
                        "snapshot_month": snap, "field": "cost_original_cr", "issue": "Non-positive original cost",
                        "observed_value": str(row["cost_original_cr"]), "expected_condition": "cost_original_cr > 0",
                        "severity": "ERROR", "status": "OPEN"
                    })
                if pd.notna(row["expenditure_cum_cr"]) and row["expenditure_cum_cr"] < 0:
                    proj_audits.append({
                        "project_code": p_code, "project_name": proj_name, "state": state, "agency_raw": agency,
                        "snapshot_month": snap, "field": "expenditure_cum_cr", "issue": "Negative cumulative expenditure",
                        "observed_value": str(row["expenditure_cum_cr"]), "expected_condition": "expenditure_cum_cr >= 0",
                        "severity": "ERROR", "status": "OPEN"
                    })
                if pd.notna(row["physical_progress_pct"]) and (row["physical_progress_pct"] < 0 or row["physical_progress_pct"] > 100):
                    proj_audits.append({
                        "project_code": p_code, "project_name": proj_name, "state": state, "agency_raw": agency,
                        "snapshot_month": snap, "field": "physical_progress_pct", "issue": "Physical progress out of bounds [0, 100]",
                        "observed_value": f"{row['physical_progress_pct']}%", "expected_condition": "0 <= progress <= 100",
                        "severity": "ERROR", "status": "OPEN"
                    })

                # Check 3: Over-expenditure beyond revised cost
                if pd.notna(row["expenditure_cum_cr"]) and pd.notna(row["cost_revised_cr"]) and row["cost_revised_cr"] > 0:
                    if row["expenditure_cum_cr"] > row["cost_revised_cr"] * 1.2:
                        proj_audits.append({
                            "project_code": p_code, "project_name": proj_name, "state": state, "agency_raw": agency,
                            "snapshot_month": snap, "field": "expenditure_cum_cr", "issue": "Severe expenditure overrun (>120% of revised cost)",
                            "observed_value": f"{row['expenditure_cum_cr']:.2f} Cr vs {row['cost_revised_cr']:.2f} Cr",
                            "expected_condition": "expenditure_cum_cr <= cost_revised_cr",
                            "severity": "WARNING", "status": "OPEN"
                        })

                # Check 4: Missing dates
                if pd.isna(row["start_month"]) or row["start_month"] is None:
                    proj_audits.append({
                        "project_code": p_code, "project_name": proj_name, "state": state, "agency_raw": agency,
                        "snapshot_month": snap, "field": "start_month", "issue": "Missing project start month",
                        "observed_value": "NULL", "expected_condition": "Valid YYYY-MM date",
                        "severity": "WARNING", "status": "OPEN"
                    })
                if pd.isna(row["doc_original"]) or row["doc_original"] is None:
                    proj_audits.append({
                        "project_code": p_code, "project_name": proj_name, "state": state, "agency_raw": agency,
                        "snapshot_month": snap, "field": "doc_original", "issue": "Missing original completion date (DOC)",
                        "observed_value": "NULL", "expected_condition": "Valid YYYY-MM date",
                        "severity": "WARNING", "status": "OPEN"
                    })

                # Check 5: Parse flags
                p_flags = str(row["parse_flags"]) if pd.notna(row["parse_flags"]) else ""
                if "DATE_PARSE_FAIL" in p_flags:
                    proj_audits.append({
                        "project_code": p_code, "project_name": proj_name, "state": state, "agency_raw": agency,
                        "snapshot_month": snap, "field": "parse_flags", "issue": "Flash report date parse failure",
                        "observed_value": p_flags, "expected_condition": "Parsed without failure",
                        "severity": "ERROR", "status": "OPEN"
                    })
                if "EPOCH_DATE" in p_flags:
                    proj_audits.append({
                        "project_code": p_code, "project_name": proj_name, "state": state, "agency_raw": agency,
                        "snapshot_month": snap, "field": "parse_flags", "issue": "Epoch date artifact encountered in OCR/source",
                        "observed_value": p_flags, "expected_condition": "Valid calendar date",
                        "severity": "WARNING", "status": "OPEN"
                    })
                if "NO_PMGID" in p_flags:
                    proj_audits.append({
                        "project_code": p_code, "project_name": proj_name, "state": state, "agency_raw": agency,
                        "snapshot_month": snap, "field": "pmgid", "issue": "Missing Central PMGID identifier",
                        "observed_value": "NULL", "expected_condition": "PMGID mapped",
                        "severity": "INFO", "status": "OPEN"
                    })
                if "NO_LEGACY_CODE" in p_flags:
                    proj_audits.append({
                        "project_code": p_code, "project_name": proj_name, "state": state, "agency_raw": agency,
                        "snapshot_month": snap, "field": "legacy_ocms_code", "issue": "Missing legacy OCMS code identifier",
                        "observed_value": "NULL", "expected_condition": "Legacy code mapped",
                        "severity": "INFO", "status": "OPEN"
                    })

            # Calculate project data confidence score (100 - penalties)
            err_count = sum(1 for a in proj_audits if a["severity"] == "ERROR")
            warn_count = sum(1 for a in proj_audits if a["severity"] == "WARNING")
            info_count = sum(1 for a in proj_audits if a["severity"] == "INFO")
            
            penalty = (err_count * 12.0) + (warn_count * 4.0) + (info_count * 0.5)
            # Add bonus if project has all 4 months
            months_present = len(group)
            if months_present < 4:
                penalty += (4 - months_present) * 3.0

            confidence = max(10.0, min(100.0, round(100.0 - penalty, 1)))
            project_scores[p_code] = confidence
            project_summaries[p_code] = {
                "confidence_score": confidence,
                "error_count": err_count,
                "warning_count": warn_count,
                "info_count": info_count,
                "total_issues": len(proj_audits),
                "months_present": months_present
            }

            audits.extend(proj_audits)

        self.audits = audits
        self.project_confidence = project_scores
        self.project_audit_summary = project_summaries
        return self.audits

    def get_audits(self, snapshot_month: Optional[str] = None, severity: Optional[str] = None,
                   project_code: Optional[int] = None, state: Optional[str] = None, limit: int = 500) -> List[Dict[str, Any]]:
        res = self.audits
        if snapshot_month:
            res = [a for a in res if a["snapshot_month"] == snapshot_month]
        if severity:
            res = [a for a in res if a["severity"].upper() == severity.upper()]
        if project_code:
            res = [a for a in res if a["project_code"] == project_code]
        if state:
            res = [a for a in res if a.get("state") == state]
        return res[:limit]

    def get_project_confidence(self, project_code: int) -> float:
        return self.project_confidence.get(project_code, 85.0)

    def get_project_audit_summary(self, project_code: int) -> Dict[str, Any]:
        return self.project_audit_summary.get(project_code, {
            "confidence_score": 85.0, "error_count": 0, "warning_count": 0, "info_count": 0, "total_issues": 0, "months_present": 4
        })

    def get_portfolio_audit_stats(self) -> Dict[str, Any]:
        total_projects = len(self.project_confidence)
        conf_scores = list(self.project_confidence.values())
        avg_conf = float(np.mean(conf_scores)) if conf_scores else 0.0
        high_conf = sum(1 for c in conf_scores if c >= 85.0)
        med_conf = sum(1 for c in conf_scores if 60.0 <= c < 85.0)
        low_conf = sum(1 for c in conf_scores if c < 60.0)
        
        errors = sum(1 for a in self.audits if a["severity"] == "ERROR")
        warnings = sum(1 for a in self.audits if a["severity"] == "WARNING")
        infos = sum(1 for a in self.audits if a["severity"] == "INFO")

        return {
            "total_audit_issues": len(self.audits),
            "errors": errors,
            "warnings": warnings,
            "infos": infos,
            "average_confidence": round(avg_conf, 1),
            "high_confidence_projects": high_conf,
            "medium_confidence_projects": med_conf,
            "low_confidence_projects": low_conf,
            "total_projects": total_projects
        }
