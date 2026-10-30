import json
from pathlib import Path

_DATA = Path(__file__).parent / "data"


def _load(name: str):
    return json.loads((_DATA / name).read_text(encoding="utf-8"))


def normalize(host: str) -> str:
    return host.strip().lower().removeprefix("www.")


_CATEGORIES = _load("categories.json")
# Keys with a URL path (cato.org/blog) would flag the whole domain, so drop them.
_OPENSOURCES = {normalize(k): v for k, v in _load("opensources.json").items() if "/" not in k.strip("/")}


def lookup(domain: str) -> list[dict]:
    hit = _OPENSOURCES.get(normalize(domain))
    types = hit["types"] if hit else []
    return [
        {
            "source": "OpenSources",
            "found": hit is not None,
            "category": ", ".join(types) or None,
            "description": _CATEGORIES.get(types[0]) if types else None,
            "notes": hit["notes"] or None if hit else None,
        }
    ]
