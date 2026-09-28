import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple
from backend.services.data_loader import diff_ym_months

def construct_temporal_targets(df: pd.DataFrame) -> pd.DataFrame:
    """
    Construct defensible next-snapshot deterioration targets.
    
    Training periods:
      - April (t0) -> May (t1) deterioration
      - May (t0) -> June (t1) deterioration
    Validation:
      - June (t0) -> July (t1) deterioration
    Holdout Test:
      - July (t0) (Holdout test features, unseen during training)
    """
    res = df.copy()

    # Cost Risk Target:
    # 1 if next month revised cost increased OR next month expenditure surged over remaining budget
    cost_risk = []
    sched_risk = []
    impl_risk = []
    overall_risk = []

    for idx, row in res.iterrows():
        next_snap = row.get("next_snapshot")
        if pd.isna(next_snap) or next_snap is None:
            # End of longitudinal observation (e.g. July)
            cost_risk.append(np.nan)
            sched_risk.append(np.nan)
            impl_risk.append(np.nan)
            overall_risk.append(np.nan)
            continue

        curr_cost = row.get("cost_revised_cr", 0.0)
        next_cost = row.get("next_cost_revised", curr_cost)
        curr_doc = row.get("doc_revised") or row.get("doc_original")
        next_doc = row.get("next_doc_revised") or curr_doc
        curr_prog = row.get("physical_progress_pct", 0.0)
        next_prog = row.get("next_progress", curr_prog)
        curr_exp = row.get("expenditure_cum_cr", 0.0)
        next_exp = row.get("next_expenditure", curr_exp)

        # 1. Cost Risk Target (Cost increased by >= 1 Cr or >= 2%, or severe burn overrun)
        cost_jump = (next_cost - curr_cost) if (pd.notna(next_cost) and pd.notna(curr_cost)) else 0.0
        exp_jump = (next_exp - curr_exp) if (pd.notna(next_exp) and pd.notna(curr_exp)) else 0.0
        rem_budget = max(0.0, curr_cost - curr_exp)
        
        c_flag = 1 if (cost_jump >= 1.0 or (cost_jump > 0 and (cost_jump / max(curr_cost, 1.0)) > 0.01) or (exp_jump > rem_budget and rem_budget > 0)) else 0
        cost_risk.append(c_flag)

        # 2. Schedule Risk Target (DOC pushed back in next snapshot, or project is overdue with slow progress)
        s_slip = diff_ym_months(next_doc, curr_doc) if (curr_doc and next_doc) else 0
        s_flag = 1 if (s_slip is not None and s_slip > 0) else 0
        sched_risk.append(s_flag)

        # 3. Implementation Risk Target (Progress stalled < 0.2% while still incomplete, or progress dropped)
        prog_diff = (next_prog - curr_prog) if (pd.notna(next_prog) and pd.notna(curr_prog)) else 0.0
        i_flag = 1 if (curr_prog < 99.0 and prog_diff < 0.2) or (prog_diff < -0.5) else 0
        impl_risk.append(i_flag)

        # 4. Overall Risk Target (Composite of high-impact deterioration)
        o_flag = 1 if (c_flag == 1 or s_flag == 1 or i_flag == 1) else 0
        overall_risk.append(o_flag)

    res["target_cost_risk"] = cost_risk
    res["target_schedule_risk"] = sched_risk
    res["target_implementation_risk"] = impl_risk
    res["target_overall_risk"] = overall_risk

    return res
