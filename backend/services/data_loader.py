import os
import glob
import re
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple

DATA_RAW_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "raw")
DATA_PROCESSED_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "processed")

def parse_ym(val: any) -> Optional[str]:
    if pd.isna(val) or val is None:
        return None
    val_str = str(val).strip()
    match = re.match(r"^(\d{4})-(\d{2})$", val_str)
    if match:
        return f"{match.group(1)}-{match.group(2)}"
    return None

def ym_to_int_months(ym: Optional[str]) -> Optional[int]:
    if not ym:
        return None
    try:
        parts = ym.split("-")
        return int(parts[0]) * 12 + int(parts[1])
    except Exception:
        return None

def diff_ym_months(ym2: Optional[str], ym1: Optional[str]) -> Optional[int]:
    m2 = ym_to_int_months(ym2)
    m1 = ym_to_int_months(ym1)
    if m2 is not None and m1 is not None:
        return m2 - m1
    return None

class DataLoader:
    _instance = None
    
    def __init__(self, raw_dir: str = DATA_RAW_DIR, processed_dir: str = DATA_PROCESSED_DIR):
        self.raw_dir = raw_dir
        self.processed_dir = processed_dir
        os.makedirs(self.processed_dir, exist_ok=True)
        self.raw_dfs: Dict[str, pd.DataFrame] = {}
        self.canonical_df: Optional[pd.DataFrame] = None
        self.load_all()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = DataLoader()
        return cls._instance

    def load_all(self, force_reload: bool = False):
        cache_path = os.path.join(self.processed_dir, "canonical_longitudinal.parquet")
        csv_files = sorted(glob.glob(os.path.join(self.raw_dir, "*.csv")))
        
        all_snapshots = []
        for file_path in csv_files:
            filename = os.path.basename(file_path)
            month_match = re.search(r"(\d{4}-\d{2})", filename)
            if not month_match:
                continue
            snapshot_month = month_match.group(1)
            df = pd.read_csv(file_path)
            
            # Standardize column names
            df.columns = [c.strip().lower() for c in df.columns]
            
            # Ensure snapshot_month
            df["snapshot_month"] = snapshot_month
            
            # Project code as int/string
            df["project_code"] = pd.to_numeric(df["project_code"], errors="coerce").fillna(-1).astype(int)
            df = df[df["project_code"] > 0].copy()
            
            # Normalize numeric columns
            for num_col in ["cost_original_cr", "cost_revised_cr", "expenditure_cum_cr", "physical_progress_pct"]:
                if num_col in df.columns:
                    df[num_col] = pd.to_numeric(df[num_col], errors="coerce")
                else:
                    df[num_col] = np.nan
            
            # Normalize string columns
            for str_col in ["project_name", "agency_raw", "table_section", "state", "legacy_ocms_code", "pmgid", "parse_flags"]:
                if str_col in df.columns:
                    df[str_col] = df[str_col].astype(str).replace({"nan": None, "None": None, "": None})
                else:
                    df[str_col] = None
                    
            # Normalize date columns
            for date_col in ["approval_month", "start_month", "doc_original", "doc_revised"]:
                if date_col in df.columns:
                    df[date_col] = df[date_col].apply(parse_ym)
                else:
                    df[date_col] = None
                    
            self.raw_dfs[snapshot_month] = df
            all_snapshots.append(df)
            
        if not all_snapshots:
            raise FileNotFoundError(f"No CSV datasets found in {self.raw_dir}")
            
        combined = pd.concat(all_snapshots, ignore_index=True)
        # Sort by project_code and snapshot_month
        combined = combined.sort_values(["project_code", "snapshot_month"]).reset_index(drop=True)
        
        # Calculate month-over-month lag values
        combined["prev_snapshot"] = combined.groupby("project_code")["snapshot_month"].shift(1)
        combined["prev_progress"] = combined.groupby("project_code")["physical_progress_pct"].shift(1)
        combined["prev_expenditure"] = combined.groupby("project_code")["expenditure_cum_cr"].shift(1)
        combined["prev_cost_revised"] = combined.groupby("project_code")["cost_revised_cr"].shift(1)
        combined["prev_doc_revised"] = combined.groupby("project_code")["doc_revised"].shift(1)
        
        # Month-over-month velocities
        combined["progress_velocity"] = (combined["physical_progress_pct"] - combined["prev_progress"]).fillna(0.0)
        combined["expenditure_velocity"] = (combined["expenditure_cum_cr"] - combined["prev_expenditure"]).fillna(0.0)
        combined["cost_revision_velocity"] = (combined["cost_revised_cr"] - combined["prev_cost_revised"]).fillna(0.0)
        
        # Future leads for target construction (next month state)
        combined["next_snapshot"] = combined.groupby("project_code")["snapshot_month"].shift(-1)
        combined["next_progress"] = combined.groupby("project_code")["physical_progress_pct"].shift(-1)
        combined["next_expenditure"] = combined.groupby("project_code")["expenditure_cum_cr"].shift(-1)
        combined["next_cost_revised"] = combined.groupby("project_code")["cost_revised_cr"].shift(-1)
        combined["next_doc_revised"] = combined.groupby("project_code")["doc_revised"].shift(-1)
        
        self.canonical_df = combined
        # Cache to parquet and csv
        try:
            combined.to_parquet(cache_path, index=False)
            combined.to_csv(os.path.join(self.processed_dir, "canonical_longitudinal.csv"), index=False)
        except Exception as e:
            print(f"Warning saving cache: {e}")
            
        return self.canonical_df

    def get_snapshot(self, snapshot_month: str) -> pd.DataFrame:
        if self.canonical_df is None:
            self.load_all()
        return self.canonical_df[self.canonical_df["snapshot_month"] == snapshot_month].copy()

    def get_project_history(self, project_code: int) -> pd.DataFrame:
        if self.canonical_df is None:
            self.load_all()
        return self.canonical_df[self.canonical_df["project_code"] == project_code].sort_values("snapshot_month").copy()

    def get_latest_snapshot(self) -> pd.DataFrame:
        if self.canonical_df is None:
            self.load_all()
        latest_month = sorted(self.canonical_df["snapshot_month"].unique())[-1]
        return self.get_snapshot(latest_month)
