from fastapi.testclient import TestClient

from app.main import app


def client(monkeypatch):
    monkeypatch.setenv("ENABLED_MODELS", "")
    return TestClient(app)


def test_endpoints_without_models(monkeypatch):
    with client(monkeypatch) as c:
        assert c.get("/api/health").json() == {"status": "ok"}
        assert c.get("/api/models").json() == []
        body = c.post("/api/analyze", json={"text": "hello world"}).json()
        assert body["verdict"] is None
        assert body["warnings"]
        assert body["input"]["kind"] == "text"


def test_validation(monkeypatch):
    with client(monkeypatch) as c:
        assert c.post("/api/analyze", json={}).status_code == 422
        assert c.post("/api/analyze", json={"url": "http://a.com", "text": "x"}).status_code == 422
        assert c.post("/api/analyze", json={"text": "x" * 50_001}).status_code == 422
        assert c.post("/api/analyze", json={"url": "http://127.0.0.1"}).status_code == 400
