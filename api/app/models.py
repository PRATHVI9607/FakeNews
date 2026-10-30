import logging
import os
import time
from dataclasses import dataclass

log = logging.getLogger(__name__)

MAX_WINDOWS = 16  # caps CPU time on very long articles; later text is ignored
WINDOW = 510  # 512 minus the two special tokens
STRIDE = 256
BATCH = 8


@dataclass(frozen=True)
class Spec:
    id: str
    name: str
    repo: str
    fake_index: int
    trained_on: str
    architecture: str
    accuracy: float | None = None
    titled: bool = False  # trained on "<title>..<content>..<end>" inputs


SPECS = [
    Spec("argus", "Argus", "hamzab/roberta-fake-news-classification", 0,
         "Kaggle Fake and Real News (ISOT)", "RoBERTa-base", 1.0, titled=True),
    Spec("sentry", "Sentry", "jy46604790/Fake-News-Bert-Detect", 0,
         "40,000+ articles from mixed outlets", "RoBERTa-base"),
    Spec("ledger", "Ledger", "winterForestStump/Roberta-fake-news-detector", 0,
         "EUvsDisinfo disinformation cases", "RoBERTa-base"),
    Spec("prism", "Prism", "dhruvpal/fake-news-bert", 1,
         "Mixed real/fake news articles", "DistilBERT", 0.92),
]


def windows(seq: list, size: int, stride: int) -> list[list]:
    """Overlapping windows that always cover the tail of seq."""
    last = max(len(seq) - size, 0)
    starts = sorted({*range(0, last, stride), last})
    return [seq[s : s + size] for s in starts][:MAX_WINDOWS]


def ensemble(p_fakes: list[float]) -> dict | None:
    if not p_fakes:
        return None
    p_fake = sum(p_fakes) / len(p_fakes)
    return {
        "label": "fake" if p_fake >= 0.5 else "real",
        "p_fake": p_fake,
        "confidence": abs(p_fake - 0.5) * 2,
    }


class Model:
    weight = 1.0  # equal votes: the cards report no comparable accuracies

    def __init__(self, spec: Spec):
        self.spec = spec
        self.status = "loading"
        self.error = None

    def __getattr__(self, name):
        return getattr(self.spec, name)

    def load(self) -> None:
        import torch
        from transformers import AutoModelForSequenceClassification, AutoTokenizer

        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.tokenizer = AutoTokenizer.from_pretrained(self.repo)
        self.net = AutoModelForSequenceClassification.from_pretrained(self.repo).eval().to(self.device)

    def try_load(self) -> None:
        try:
            self.load()
            self.status = "ready"
        except Exception as e:
            log.warning("model %s unavailable: %s", self.id, e)
            self.status, self.error = "unavailable", str(e)

    def predict(self, text: str, title: str = "") -> float:
        """Probability the text is fake, averaged over overlapping windows."""
        import torch

        if self.titled:
            text = f"<title>{title}<content>{text}<end>"
        ids = self.tokenizer(text, add_special_tokens=False)["input_ids"]
        chunks = [self.tokenizer.build_inputs_with_special_tokens(w) for w in windows(ids, WINDOW, STRIDE)]
        probs = []
        with torch.inference_mode():
            for i in range(0, len(chunks), BATCH):
                batch = self.tokenizer.pad({"input_ids": chunks[i : i + BATCH]}, return_tensors="pt").to(self.device)
                probs += self.net(**batch).logits.softmax(-1)[:, self.fake_index].tolist()
        return sum(probs) / len(probs)


def build_models() -> list[Model]:
    enabled = os.environ.get("ENABLED_MODELS")
    ids = enabled.split(",") if enabled is not None else [s.id for s in SPECS]
    return [Model(s) for s in SPECS if s.id in ids]


def load_all(models: list[Model]) -> None:
    for m in models:
        m.try_load()


def run(models: list[Model], text: str, title: str = "") -> tuple[list[dict], list[str]]:
    results, warnings = [], []
    for m in models:
        if m.status != "ready":
            warnings.append(f"{m.name} {'still loading' if m.status == 'loading' else 'unavailable'}")
            continue
        start = time.perf_counter()
        try:
            p_fake = m.predict(text, title)
        except Exception as e:
            log.exception("model %s failed", m.id)
            warnings.append(f"{m.name} failed: {e}")
            continue
        results.append(
            {
                "id": m.id,
                "name": m.name,
                "p_fake": p_fake,
                "label": "fake" if p_fake >= 0.5 else "real",
                "weight": m.weight,
                "accuracy": m.accuracy,
                "architecture": m.architecture,
                "latency_ms": round((time.perf_counter() - start) * 1000),
            }
        )
    return results, warnings
