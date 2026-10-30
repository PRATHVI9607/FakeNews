import asyncio
import os

import vt

TIMEOUT = 30


async def _report(client: vt.Client, url: str):
    try:
        return await client.get_object_async(f"/urls/{vt.url_id(url)}")
    except vt.APIError as e:
        if e.code != "NotFoundError":
            raise
    return await client.scan_url_async(url, wait_for_completion=True)


async def scan(url: str) -> dict | None:
    """Returns None when no API key is configured. Raises on VirusTotal failure."""
    key = os.environ.get("VIRUS_TOTAL_API_KEY")
    if not key:
        return None
    async with vt.Client(key) as client:
        obj = await asyncio.wait_for(_report(client, url), TIMEOUT)
    stats = obj.last_analysis_stats
    engines = [
        {"name": r["engine_name"], "category": r["category"], "result": r["result"] or r["category"]}
        for r in obj.last_analysis_results.values()
    ]
    engines.sort(key=lambda e: e["category"] in ("harmless", "undetected"))
    return {
        **{k: stats.get(k, 0) for k in ("malicious", "suspicious", "harmless", "undetected")},
        "engines": engines[:20],
    }
