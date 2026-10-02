import os
from pathlib import Path
from tavily import TavilyClient
from .reconcile import ReconItem

# Ensure .env is loaded if running standalone or via uvicorn
def _load_env_if_needed():
    if not os.environ.get("TAVILY_API_KEY"):
        env_file = Path(__file__).resolve().parent.parent / ".env"
        if env_file.exists():
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    l = line.strip()
                    if l and not l.startswith("#") and "=" in l:
                        k, v = l.split("=", 1)
                        if k.strip() not in os.environ:
                            os.environ[k.strip()] = v.strip().strip('"').strip("'")

_load_env_if_needed()

_t = TavilyClient(api_key=os.environ.get("TAVILY_API_KEY", ""))


def enrich_exception(item: ReconItem) -> ReconItem:
    """
    Enriches an exception item with live web citations (e.g. fee schedules, business verification)
    via Tavily Search.
    """
    if item.status != "exception":
        return item

    merchant = None
    for c in item.candidates:
        if c.field == "merchant":
            merchant = c.value
            break
    if not merchant:
        merchant = item.candidates[0].value if item.candidates else "unknown merchant"

    query = f"{merchant} business verification OR official fee schedule site:chase.com OR site:stripe.com"
    try:
        res = _t.search(query, max_results=2)
        for r in res.get("results", []):
            if r.get("url") and r["url"] not in item.citations:
                item.citations.append(r["url"])
    except Exception:
        pass

    return item
