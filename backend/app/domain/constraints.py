import json
from functools import lru_cache
from importlib.resources import files
from typing import Any, Dict, Optional


@lru_cache(maxsize=1)
def load_sar_constraints() -> Dict[str, Any]:
    constraints_path = files("app.domain").joinpath("sar_constraints.json")
    return json.loads(constraints_path.read_text(encoding="utf-8"))


def build_domain_context(domain: str, command_mode: Optional[str] = None) -> str:
    """
    Generate structured prompt context for domain injection (keep concise to save tokens).
    """
    if (domain or "").lower() != "sar":
        return ""

    constraints = load_sar_constraints()

    required_blocks = constraints.get("bdd", {}).get("required_blocks", []) or []
    required_phases = constraints.get("smd", {}).get("required_phases", []) or []
    synonyms = constraints.get("terminology", {}).get("synonyms", {}) or {}

    blocks_str = ", ".join(required_blocks[:12])
    phases_str = " → ".join(required_phases[:12])
    terms_str = "\n".join([f"- Use '{v}' instead of '{k}'" for k, v in list(synonyms.items())[:12]])

    mode_str = ""
    if command_mode == "ICS":
        mode_str = "\nCommand mode: ICS (Incident Commander; Operations Section Chief)."
    elif command_mode == "GSB":
        mode_str = "\nCommand mode: GSB (Gold → Silver → Bronze)."

    context = (
        "SAR (Flood Rescue / Search-and-Rescue) domain constraints:\n"
        f"- Required BDD blocks: {blocks_str}\n"
        f"- Required mission phases (SMD): {phases_str}\n"
        "- Communications: critical roles require PrimaryComms + BackupComms (no cellular-only).\n"
        "- Assets: Type B boat teams require MotorizedRescueBoat with Motor; drones require ReturnToHome.\n"
        "Terminology:\n"
        f"{terms_str}\n"
        f"{mode_str}"
    )
    return context.strip()
