import json
from functools import lru_cache
from importlib.resources import files
from typing import Any, Dict


@lru_cache(maxsize=1)
def load_sar_constraints() -> Dict[str, Any]:
    constraints_path = files("app.domain").joinpath("sar_constraints.json")
    return json.loads(constraints_path.read_text(encoding="utf-8"))

