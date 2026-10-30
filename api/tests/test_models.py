import pytest

from app import models


def test_ensemble_mean():
    verdict = models.ensemble([0.9, 0.3])
    assert verdict["p_fake"] == pytest.approx(0.6)
    assert verdict["label"] == "fake"
    assert verdict["confidence"] == pytest.approx(0.2)


def test_ensemble_threshold_and_empty():
    assert models.ensemble([0.5])["label"] == "fake"
    assert models.ensemble([0.49])["label"] == "real"
    assert models.ensemble([]) is None


def test_windows_cover_tail():
    chunks = models.windows(list(range(10)), 4, 3)
    assert chunks[0] == [0, 1, 2, 3]
    assert chunks[-1] == [6, 7, 8, 9]
    assert all(len(c) == 4 for c in chunks)


def test_windows_short_and_cap():
    assert models.windows([1, 2], 4, 3) == [[1, 2]]
    assert len(models.windows(list(range(10_000)), 10, 5)) == models.MAX_WINDOWS


def test_enabled_models_filter(monkeypatch):
    monkeypatch.setenv("ENABLED_MODELS", "prism,nope")
    assert [m.id for m in models.build_models()] == ["prism"]
    monkeypatch.delenv("ENABLED_MODELS")
    assert len(models.build_models()) == len(models.SPECS)


def test_run_skips_unready_models():
    loading = models.build_models()[0]
    results, warnings = models.run([loading], "text")
    assert results == []
    assert "still loading" in warnings[0]
