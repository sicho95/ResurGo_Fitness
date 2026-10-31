"""No-network Web Push safety tests for ResurGo's public API and NAS worker."""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import os
import sys

from fastapi.testclient import TestClient
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import app as sync
import push_worker
import push_service

SUB = {
    "endpoint": "https://web.push.apple.com/QABCDEF0123456789",
    "keys": {"p256dh": "ABCDE0123456789abcdefghijklmnopqrstuvwxyz",
             "auth": "ABCDEFGHIJKLMN0123456789"},
}


@pytest.fixture
def api_pair(tmp_path, monkeypatch):
    monkeypatch.setattr(sync, "DB_PATH", tmp_path / "resurgo.sqlite3")
    monkeypatch.setattr(push_worker, "DB_PATH", sync.DB_PATH)
    monkeypatch.setenv("RS_PAIR_PEPPER", "p" * 48)
    monkeypatch.setenv("RS_ADMIN_TOKEN", "a" * 48)
    with TestClient(sync.admin) as adm, TestClient(sync.public) as api:
        initial = adm.post("/admin/profiles", json={"label": "Famille test"},
                           headers={"Authorization": "Bearer " + "a" * 48})
        assert initial.status_code == 200
        paired = api.post("/api/v1/pair/redeem",
                          json={"label": "iPhone", "code": initial.json()["enrollmentCode"]})
        assert paired.status_code == 200
        token = {"Authorization": "Bearer " + paired.json()["token"]}
        yield adm, api, paired.json(), token


def test_subscription_and_key_are_per_device(api_pair):
    adm, api, dev, auth = api_pair
    assert api.get("/api/v1/push/key").status_code == 401
    key = api.get("/api/v1/push/key", headers=auth)
    assert key.status_code == 200
    assert len(key.json()["publicKey"]) >= 80
    assert api.get("/api/v1/push/key", headers=auth).json() == key.json()
    private = sync.DB_PATH.parent / ".resurgo-vapid-private.pem"
    assert private.exists()
    assert private.stat().st_mode & 0o077 == 0
    assert api.get("/api/v1/push/status", headers=auth).json()["subscribed"] is False
    assert api.post("/api/v1/push/subscribe", json={
        "subscription": SUB, "timezone": "Europe/Paris", "reminderTime": "08:00"
    }).status_code == 401
    response = api.post("/api/v1/push/subscribe", headers=auth, json={
        "subscription":SUB,"timezone":"Europe/Paris","reminderTime":"08:00"})
    assert response.status_code == 200, response.text
    assert api.get("/api/v1/push/status", headers=auth).json()["subscribed"] is True
    response = api.post("/api/v1/push/unsubscribe", headers=auth)
    assert response.status_code == 200
    assert api.get("/api/v1/push/status", headers=auth).json()["subscribed"] is False


@pytest.mark.parametrize("url", [
    "http://127.0.0.1:18879/health",
    "https://localhost/private",
    "https://web.push.apple.com.evil.example/Q",
    "https://web.push.apple.com:8443/Q",
    "file:///etc/passwd",
    "https://user:secret@web.push.apple.com/Q"
])
def test_ssrf_targets_are_rejected(api_pair, url):
    _, api, _, auth = api_pair
    invalid = {**SUB, "endpoint":url}
    response = api.post("/api/v1/push/subscribe", headers=auth, json={
        "subscription":invalid,"timezone":"Europe/Paris","reminderTime":"08:00"})
    assert response.status_code == 422


def test_push_test_is_authenticated_and_rate_limited(api_pair, monkeypatch):
    _, api, dev, auth = api_pair
    assert api.post("/api/v1/push/test", headers=auth).status_code == 409
    api.post("/api/v1/push/subscribe", headers=auth, json={
        "subscription":SUB,"timezone":"Europe/Paris","reminderTime":"08:00"})
    delivered = []
    monkeypatch.setattr(push_service, "send", lambda db, sub, data: delivered.append(data))
    assert api.post("/api/v1/push/test", headers=auth).status_code == 200
    assert len(delivered) == 1
    assert "weight" not in delivered[0]
    assert api.post("/api/v1/push/test", headers=auth).status_code == 200
    assert api.post("/api/v1/push/test", headers=auth).status_code == 429


def test_worker_sends_only_due_sessions_once_and_respects_revoke(api_pair):
    _, api, dev, auth = api_pair
    api.post("/api/v1/push/subscribe", headers=auth, json={
        "subscription":SUB,"timezone":"Europe/Paris","reminderTime":"08:00"})
    for i, date, completed in (
        (1, "2026-10-30", None),
        (2, "2026-10-31", None),
        (3, "2026-10-30", "2026-10-30T10:00:00Z")
    ):
        result = api.post("/api/v1/sync/push", headers=auth,json={"operations":[{
            "operationId":f"push-{i:06d}","entityType":"plan",
            "entityId":f"plan-{i}",
            "expectedRevision":0,
            "payload":{"id":f"plan-{i}","profileId":"P-1",
                       "date":date,"completedAt":completed,"title":"Séance"},
            "deleted":False
        }]})
        assert result.status_code == 200, result.text
    sent = []
    emit = lambda db, sub, msg: sent.append(msg)
    now = datetime(2026,10,30,12,0,tzinfo=timezone.utc)
    assert push_worker.tick(now,deliver=emit) == 1
    assert sent[0]["sessionId"] == "plan-1"
    assert push_worker.tick(now,deliver=emit) == 0
    assert len(sent) == 1
    # Revoked device never gets more reminders, even if new sessions appear.
    api.post(f"/api/v1/devices/{dev['deviceId']}/revoke",headers=auth)
    assert push_worker.tick(now,deliver=emit) == 0


def test_invalid_timezone_and_clock_are_rejected(api_pair):
    _,api,_,auth=api_pair
    for tz,clock in (("Mars/Olympus", "08:00"),("Europe/Paris","55:99")):
        resp=api.post("/api/v1/push/subscribe",headers=auth,json={
            "subscription":SUB,"timezone":tz,"reminderTime":clock})
        assert resp.status_code == 422


@pytest.mark.parametrize("configured", [
    None,
    "https://sicho95.github.io",
    "https://sicho95.github.io/ResurGo_Fitness/",
])
def test_vapid_subject_legacy_path_is_normalized(monkeypatch, configured):
    if configured is None:
        monkeypatch.delenv("RS_VAPID_SUBJECT", raising=False)
    else:
        monkeypatch.setenv("RS_VAPID_SUBJECT", configured)
    assert push_service.vapid_subject() == "https://sicho95.github.io"


def test_vapid_subject_can_sign_without_network_or_key_rotation(tmp_path, monkeypatch):
    from py_vapid import Vapid

    db_path = tmp_path / "resurgo.sqlite3"
    monkeypatch.setenv("RS_VAPID_SUBJECT", "https://sicho95.github.io/ResurGo_Fitness/")
    key = push_service._read_or_create_private(db_path)
    original_public = push_service.public_key(db_path)
    assert key is not None

    # py-vapid previously raised VapidException: Missing 'sub' from claims
    # because the configured contact included a PWA path.
    signer = Vapid.from_file(str(push_service._keyfile(db_path)))
    headers = signer.sign({
        "sub": push_service.vapid_subject(), "aud": "https://web.push.apple.com"
    })
    assert headers["Authorization"].startswith("vapid ")
    assert push_service.public_key(db_path) == original_public


def test_send_passes_valid_origin_claim_without_network(tmp_path, monkeypatch):
    captured = []
    monkeypatch.setenv("RS_VAPID_SUBJECT", "https://sicho95.github.io/ResurGo_Fitness/")
    monkeypatch.setattr(push_service, "webpush",
                        lambda **kw: captured.append(kw) or object())
    push_service.send(tmp_path / "resurgo.sqlite3", SUB, {
        "id": "local-test", "title": "Test", "body": "No network"
    })
    assert len(captured) == 1
    assert captured[0]["vapid_claims"]["sub"] == "https://sicho95.github.io"


@pytest.mark.parametrize("configured", [
    "http://sicho95.github.io",
    "https://user:pass@sicho95.github.io",
    "https://sicho95.github.io?token=bad",
    "https://sicho95.github.io:8443/",
])
def test_invalid_vapid_subject_is_rejected(monkeypatch, configured):
    monkeypatch.setenv("RS_VAPID_SUBJECT", configured)
    with pytest.raises(RuntimeError, match="VAPID subject invalid"):
        push_service.vapid_subject()
