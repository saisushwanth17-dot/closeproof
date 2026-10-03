import time
from typing import Dict, Any, List, Optional

# Contract C v0.2: Telemetry event types
ALLOWED_EVENTS = [
    "feed_ingested",
    "recon_match",
    "recon_exception",
    "evidence_attached",
    "tavily_lookup",
    "explain_done",
    "sandbox_result",
    "packet_ready",
    "action_applied",
]


def make_envelope(
    event: str,
    payload: Dict[str, Any],
    severity: str = "info",
    ts: Optional[int] = None
) -> Dict[str, Any]:
    """
    Creates an authoritative Contract C telemetry envelope.
    """
    if event not in ALLOWED_EVENTS:
        raise ValueError(f"Unknown telemetry event '{event}'. Allowed events: {ALLOWED_EVENTS}")

    return {
        "project": "closeproof",
        "event": event,
        "severity": severity,
        "ts": ts if ts is not None else int(time.time() * 1000),
        "payload": payload,
    }
