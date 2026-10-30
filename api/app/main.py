import logging
import os
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import urlsplit

from fastapi import FastAPI, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, model_validator

from . import models, sources, virustotal
from .article import ArticleError, extract

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.models = models.build_models()
    threading.Thread(target=models.load_all, args=(app.state.models,), daemon=True).start()
    yield


app = FastAPI(title="Loki", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    url: str | None = None
    text: str | None = None

    @model_validator(mode="after")
    def exactly_one(self):
        if (self.url is None) == (self.text is None):
            raise ValueError("Provide exactly one of url or text")
        if self.text is not None and len(self.text) > 50_000:
            raise ValueError("text must be at most 50000 characters")
        return self


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/models")
def list_models():
    return [
        {
            "id": m.id,
            "name": m.name,
            "accuracy": m.accuracy,
            "weight": m.weight,
            "trained_on": m.trained_on,
            "architecture": m.architecture,
            "status": m.status,
            "error": m.error,
        }
        for m in app.state.models
    ]


@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest):
    warnings = []
    article = domain = vt_report = None
    source_list = []
    text = req.text

    if req.url is not None:
        try:
            article = await run_in_threadpool(extract, req.url)
        except ArticleError as e:
            raise HTTPException(400, str(e)) from e
        except Exception as e:
            log.exception("article extraction failed")
            raise HTTPException(400, f"Could not read article: {e}") from e
        text = article["text"]
        domain = urlsplit(req.url).hostname
        source_list = sources.lookup(domain)
        try:
            vt_report = await virustotal.scan(req.url)
        except Exception as e:
            log.warning("virustotal failed: %s", e)
            warnings.append("VirusTotal lookup failed")

    results, verdict = [], None
    if text and text.strip():
        title = article["title"] or "" if article else ""
        results, model_warnings = await run_in_threadpool(models.run, app.state.models, text, title)
        warnings += model_warnings
        verdict = models.ensemble([r["p_fake"] for r in results])
        if verdict is None:
            warnings.append("No model available to classify the text")
    else:
        warnings.append("No article text found to classify")

    return {
        "input": {"kind": "url" if req.url is not None else "text", "url": req.url, "domain": domain},
        "article": article,
        "verdict": verdict,
        "models": results,
        "sources": source_list,
        "virustotal": vt_report,
        "warnings": warnings,
    }


_repo_web = Path(__file__).resolve().parents[2] / "web" / "out"
_web_dir = Path(os.environ.get("WEB_DIR", "/app/static" if Path("/app/static").is_dir() else _repo_web))
if _web_dir.is_dir():
    app.mount("/", StaticFiles(directory=_web_dir, html=True), name="web")
