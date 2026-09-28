import os
import re
import numpy as np
import pandas as pd

def parse_ym_to_months(val):
    if pd.isna(val) or not isinstance(val, str):
        return np.nan
    val = val.strip()
    match = re.match(r'^(\d{4})-(\d{2})$', val)
    if match:
        year, month = int(match.group(1)), int(match.group(2))
        return year * 12 + month
    return np.nan

def months_diff(ym_end, ym_start):
    m_end = parse_ym_to_months(ym_end)
    m_start = parse_ym_to_months(ym_start)
    if np.isnan(m_end) or np.isnan(m_start):
        return np.nan
    return m_end - m_start
