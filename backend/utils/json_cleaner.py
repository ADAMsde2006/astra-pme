import math
import numpy as np
import pandas as pd
from typing import Any

def clean_json_val(val: Any) -> Any:
    if val is None:
        return None
    if isinstance(val, (float, np.floating)):
        if math.isnan(val) or np.isnan(val):
            return None
        if math.isinf(val) or np.isinf(val):
            return None
        return float(val)
    if isinstance(val, (int, np.integer)):
        return int(val)
    if isinstance(val, (np.bool_, bool)):
        return bool(val)
    if isinstance(val, dict):
        return {k: clean_json_val(v) for k, v in val.items()}
    if isinstance(val, (list, tuple, set)):
        return [clean_json_val(v) for v in val]
    if pd.isna(val):
        return None
    return val
