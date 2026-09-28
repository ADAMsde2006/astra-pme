import os
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from backend.services.data_loader import DataLoader
from backend.services.audit_service import AuditService
from backend.services.contradiction_service import ContradictionService

class ExitService:
    _instance = None

    def __init__(self, data_loader: Optional[DataLoader] = None,
                 audit_service: Optional[AuditService] = None,
                 contradiction_service: Optional[ContradictionService] = None):
        self.loader = data_loader or DataLoader.get_instance()
        self.audit_service = audit_service or AuditService.get_instance()
        self.contradiction_service = contradiction_service or ContradictionService.get_instance()
        self.exit_records: List[Dict[str, Any]] = []
        self.evaluate_exits()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = ExitService()
        return cls._instance

    def evaluate_exits(self):
        latest_df = self.loader.get_latest_snapshot()
        exit_records = []

        for idx, row in latest_df.iterrows():
            p_code = int(row["project_code"])
            snap = row["snapshot_month"]
            p_name = row["project_name"] or f"Project {p_code}"
            state = row["state"] or "Unknown"
            agency = row["agency_raw"] or "Unknown"
            section = row["table_section"] or "Unknown"

            prog = row["physical_progress_pct"] if pd.notna(row["physical_progress_pct"]) else 0.0
            cost_rev = row["cost_revised_cr"] if pd.notna(row["cost_revised_cr"]) else 0.0
            exp = row["expenditure_cum_cr"] if pd.notna(row["expenditure_cum_cr"]) else 0.0
            exp_ratio = (exp / cost_rev) if cost_rev > 0 else 0.0

            # Contradictions & Audit Status
            proj_contradictions = self.contradiction_service.get_project_contradictions(p_code)
            critical_contradictions = [c for c in proj_contradictions if c["severity"] == "CRITICAL"]
            conf_score = self.audit_service.get_project_confidence(p_code)

            status = "ACTIVE"
            condition_desc = "Project execution in progress"
            evidence = []

            # Exit criteria evaluation:
            if prog >= 99.5:
                # Progress condition satisfied. Now check financial consistency and data integrity:
                has_financial_anomaly = exp > cost_rev * 1.15 or exp_ratio < 0.60
                has_critical_issue = len(critical_contradictions) > 0 or conf_score < 60.0

                if not has_financial_anomaly and not has_critical_issue:
                    status = "EXIT CANDIDATE"
                    condition_desc = "Full Physical Completion + Clean Financials + No Critical Defects"
                    evidence = [
                        f"100% Physical Progress reached ({prog:.1f}%)",
                        f"Expenditure ratio healthy at {exp_ratio*100:.1f}% ({exp:.2f} Cr / {cost_rev:.2f} Cr)",
                        f"Data Confidence is high ({conf_score:.1f}%)",
                        "Zero active critical contradictions"
                    ]
                else:
                    status = "REVIEW REQUIRED"
                    condition_desc = "100% Progress Reported but Financial / Quality Discrepancies Present"
                    if has_financial_anomaly:
                        if exp > cost_rev * 1.15:
                            evidence.append(f"Unresolved budget overrun: Expenditure is {exp_ratio*100:.1f}% of revised cost")
                        elif exp_ratio < 0.60:
                            evidence.append(f"Suspiciously low cumulative expenditure: only {exp_ratio*100:.1f}% billed for 100% completion")
                    if len(critical_contradictions) > 0:
                        evidence.append(f"{len(critical_contradictions)} critical contradiction(s) active on record")
                    if conf_score < 60.0:
                        evidence.append(f"Data Confidence low ({conf_score:.1f}%) due to audit flags")
            elif prog >= 90.0 and exp_ratio >= 0.95:
                # Near completion but not 100%
                status = "ACTIVE"
                condition_desc = "Near Completion (Ongoing Monitoring)"
                evidence = [
                    f"Physical Progress at {prog:.1f}%",
                    f"Expenditure at {exp_ratio*100:.1f}%",
                    f"Data Confidence {conf_score:.1f}%"
                ]
            else:
                status = "ACTIVE"
                condition_desc = "Active Project In Execution"
                evidence = [
                    f"Physical Progress: {prog:.1f}%",
                    f"Expenditure Ratio: {exp_ratio*100:.1f}%",
                    f"Remaining Progress: {max(0.0, 100.0 - prog):.1f}%"
                ]

            exit_records.append({
                "project_code": p_code,
                "project_name": p_name,
                "state": state,
                "agency_raw": agency,
                "table_section": section,
                "snapshot_month": snap,
                "physical_progress_pct": round(prog, 1),
                "cost_revised_cr": round(cost_rev, 2),
                "expenditure_cum_cr": round(exp, 2),
                "expenditure_ratio": round(exp_ratio, 3),
                "data_confidence_score": conf_score,
                "exit_condition": condition_desc,
                "evidence": evidence,
                "status": status
            })

        self.exit_records = exit_records
        return self.exit_records

    def get_exits(self, status: Optional[str] = None, state: Optional[str] = None,
                  agency: Optional[str] = None, limit: int = 500) -> List[Dict[str, Any]]:
        res = self.exit_records
        if status:
            res = [e for e in res if e["status"].upper() == status.upper()]
        if state:
            res = [e for e in res if e["state"] == state]
        if agency:
            res = [e for e in res if e["agency_raw"] == agency]
        return res[:limit]

    def get_project_exit_status(self, project_code: int) -> Optional[Dict[str, Any]]:
        for e in self.exit_records:
            if e["project_code"] == project_code:
                return e
        return None

    def get_exit_stats(self) -> Dict[str, Any]:
        candidates = sum(1 for e in self.exit_records if e["status"] == "EXIT CANDIDATE")
        review = sum(1 for e in self.exit_records if e["status"] == "REVIEW REQUIRED")
        active = sum(1 for e in self.exit_records if e["status"] == "ACTIVE")
        return {
            "total_evaluated": len(self.exit_records),
            "exit_candidates": candidates,
            "review_required": review,
            "active_projects": active
        }
