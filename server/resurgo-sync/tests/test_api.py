"""Safety and concurrency regression tests for the candidate NAS sync backend."""
import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import app as sync  # noqa: E402


@pytest.fixture
def clients(tmp_path, monkeypatch):
    monkeypatch.setattr(sync, "DB_PATH", tmp_path / "resurgo.sqlite3")
    monkeypatch.setenv("RS_PAIR_PEPPER", "p" * 48)
    monkeypatch.setenv("RS_ADMIN_TOKEN", "a" * 48)
    with TestClient(sync.admin) as adm, TestClient(sync.public) as api:
        yield adm, api


def admin_headers():
    return {"Authorization": "Bearer " + "a" * 48}


def enrolled(clients, label="Coureur", device="iPhone"):
    adm, api = clients
    resp = adm.post("/admin/profiles", json={"label": label}, headers=admin_headers())
    assert resp.status_code == 200, resp.text
    created = resp.json()
    redeem = api.post("/api/v1/pair/redeem", json={"label": device, "code": created["enrollmentCode"]})
    assert redeem.status_code == 200, redeem.text
    return redeem.json()


def headers(device):
    return {"Authorization": "Bearer " + device["token"]}


def operation(op_id="op-000001", rev=0, entity="activity-1", payload=None):
    return {"operationId": op_id, "entityType": "activity", "entityId": entity,
            "expectedRevision": rev, "payload": payload or {"distanceM": 5100}, "deleted": False}


def test_public_api_has_no_admin_routes(clients):
    adm, api = clients
    assert api.get("/admin/profiles").status_code == 404
    assert api.get("/health").json()["service"] == "resurgo-sync-public"
    assert adm.get("/admin/profiles").status_code == 401
    assert adm.get("/health", headers=admin_headers()).status_code == 200


def test_private_admin_dashboard_is_not_exposed_by_funnel_app(clients):
    adm, api = clients
    assert api.get("/").status_code == 404
    assert api.get("/admin.js").status_code == 404
    page = adm.get("/")
    assert page.status_code == 200
    assert "ResurGo Sync" in page.text
    assert "frame-ancestors 'none'" in page.headers["content-security-policy"]
    assert adm.get("/admin.js").status_code == 200
    assert adm.get("/admin/profiles").status_code == 401


def test_private_admin_can_list_profile_devices(clients):
    adm, api = clients
    user = enrolled(clients)
    path = "/admin/profiles/" + user["profileId"] + "/devices"
    assert adm.get(path).status_code == 401
    data = adm.get(path, headers=admin_headers())
    assert data.status_code == 200
    assert len(data.json()["devices"]) == 1
    assert data.json()["devices"][0]["id"] == user["deviceId"]


def test_enrollment_and_pairing_code_single_use(clients):
    adm, api = clients
    created = adm.post("/admin/profiles", json={"label": "Test"}, headers=admin_headers()).json()
    body = {"code": created["enrollmentCode"], "label": "iPhone 15"}
    result = api.post("/api/v1/pair/redeem", json=body)
    assert result.status_code == 200
    assert len(result.json()["token"]) >= 32
    assert api.post("/api/v1/pair/redeem", json=body).status_code == 400
    assert api.get("/api/v1/devices").status_code == 401
    assert api.get("/api/v1/devices", headers=headers(result.json())).status_code == 200


def test_push_pull_idempotence_and_conflict(clients):
    adm, api = clients
    user = enrolled(clients)
    auth = headers(user)
    one = api.post("/api/v1/sync/push", json={"operations": [operation()]}, headers=auth)
    assert one.status_code == 200, one.text
    assert one.json()["results"][0]["status"] == "applied"
    duplicate = api.post("/api/v1/sync/push", json={"operations": [operation()]}, headers=auth)
    assert duplicate.json()["results"][0]["status"] == "duplicate"
    conflict = api.post("/api/v1/sync/push", json={"operations": [operation("op-000002")]}, headers=auth)
    assert conflict.json()["results"][0] == {
        "operationId": "op-000002", "status": "conflict", "currentRevision": 1}
    data = api.get("/api/v1/sync/pull?cursor=0", headers=auth).json()
    assert len(data["events"]) == 1
    assert data["events"][0]["payload"] == {"distanceM": 5100}
    assert data["events"][0]["revision"] == 1
    next_page = api.get(f"/api/v1/sync/pull?cursor={data['nextCursor']}", headers=auth).json()
    assert next_page["events"] == []


def test_second_device_and_profile_isolation(clients):
    adm, api = clients
    first = enrolled(clients, "Coupeur A")
    second = enrolled(clients, "Coupeur B")
    pairing = api.post("/api/v1/pair/start", json={"label": "iPhone 13"},
                       headers=headers(first)).json()
    twin_result = api.post("/api/v1/pair/redeem",
                           json={"code": pairing["code"], "label": "iPhone 13"})
    assert twin_result.status_code == 200
    twin = twin_result.json()
    assert twin["profileId"] == first["profileId"]
    api.post("/api/v1/sync/push", json={"operations": [operation()]},
             headers=headers(first))
    assert len(api.get("/api/v1/sync/pull", headers=headers(twin)).json()["events"]) == 1
    assert api.get("/api/v1/sync/pull", headers=headers(second)).json()["events"] == []


def test_device_revocation_and_no_unauthenticated_write(clients):
    adm, api = clients
    user = enrolled(clients)
    auth = headers(user)
    assert api.post("/api/v1/sync/push", json={"operations": [operation()]}).status_code == 401
    devices = api.get("/api/v1/devices", headers=auth).json()
    assert devices["currentDeviceId"] == user["deviceId"]
    assert api.post(f"/api/v1/devices/{user['deviceId']}/revoke", headers=auth).status_code == 200
    assert api.get("/api/v1/sync/pull", headers=auth).status_code == 401


def test_invalid_pair_codes_are_rate_limited_even_when_rejected(clients):
    adm, api = clients
    statuses = [api.post("/api/v1/pair/redeem", json={"code": "ABCDEFGHIJKL", "label": "Attacker"}).status_code
                for _ in range(41)]
    assert statuses.count(400) == 40
    assert statuses[-1] == 429


def test_payload_limits_and_unknown_types(clients):
    adm, api = clients
    user = enrolled(clients)
    auth = headers(user)
    payload = operation(payload={"huge": "x" * 20000})
    r = api.post("/api/v1/sync/push", json={"operations": [payload]}, headers=auth)
    assert r.json()["results"][0]["status"] == "payload_too_large"
    bad = operation("bad-type")
    bad["entityType"] = "anything"
    res = api.post("/api/v1/sync/push", json={"operations": [bad]}, headers=auth)
    assert res.json()["results"][0]["status"] == "invalid_entity_type"

def test_recovery_from_encrypted_backup_secret_without_admin(clients):
    adm, api = clients
    original = enrolled(clients)
    assert original["recovery"]["keyId"] and len(original["recovery"]["secret"]) >= 40
    # Losing the original phone: revoke its session; encrypted backup retains a separate secret.
    assert api.post("/api/v1/devices/" + original["deviceId"] + "/revoke",
                    headers=headers(original)).status_code == 200
    assert api.get("/api/v1/devices", headers=headers(original)).status_code == 401
    data = {
        "profileId": original["profileId"],
        "keyId": original["recovery"]["keyId"],
        "secret": original["recovery"]["secret"],
        "label": "Nouvel iPhone"
    }
    result = api.post("/api/v1/recovery/redeem", json=data)
    assert result.status_code == 200, result.text
    recovered = result.json()
    assert recovered["profileId"] == original["profileId"]
    assert recovered["deviceId"] != original["deviceId"]
    assert recovered["token"] != original["token"]
    assert recovered["recovery"]["secret"] != original["recovery"]["secret"]
    assert api.get("/api/v1/devices", headers=headers(recovered)).status_code == 200


def test_recovery_rejects_wrong_secret_other_profile_and_revoked_key(clients):
    adm, api = clients
    first = enrolled(clients, "A")
    second = enrolled(clients, "B")
    body = {"profileId": first["profileId"], "keyId": first["recovery"]["keyId"],
            "secret": second["recovery"]["secret"], "label": "Intrus"}
    assert api.post("/api/v1/recovery/redeem", json=body).status_code == 401
    body["secret"] = first["recovery"]["secret"]
    body["profileId"] = second["profileId"]
    assert api.post("/api/v1/recovery/redeem", json=body).status_code == 401
    keys = api.get("/api/v1/recovery/keys", headers=headers(first))
    assert keys.status_code == 200 and len(keys.json()["keys"]) == 1
    assert "secret" not in str(keys.json())
    body["profileId"] = first["profileId"]
    assert api.post("/api/v1/recovery/keys/" + first["recovery"]["keyId"] + "/revoke",
                    headers=headers(first)).status_code == 200
    assert api.post("/api/v1/recovery/redeem", json=body).status_code == 401


def test_recovery_requires_valid_secret_and_auth_on_management(clients):
    adm, api = clients
    first = enrolled(clients)
    assert api.get("/api/v1/recovery/keys").status_code == 401
    assert api.post("/api/v1/recovery/keys/" + first["recovery"]["keyId"] + "/revoke").status_code == 401
    assert api.post("/api/v1/recovery/redeem", json={
        "profileId": first["profileId"], "keyId": first["recovery"]["keyId"],
        "secret": "wrong" * 15, "label": "Attacker"
    }).status_code == 401


def test_public_first_profile_no_admin_and_new_recovery_key(clients):
    adm, api = clients
    request = {"profileName":"Coupeur autonome", "deviceName":"iPhone initial"}
    response = api.post("/api/v1/profiles/create",json=request)
    assert response.status_code == 200, response.text
    created = response.json()
    assert created["profileName"] == "Coupeur autonome"
    assert created["token"] and created["recovery"]["keyId"]
    assert api.get("/api/v1/devices",headers=headers(created)).status_code == 200
    key = created["recovery"]
    backup_recover = api.post("/api/v1/recovery/redeem",json={
        "profileId":created["profileId"],"keyId":key["keyId"],
        "secret":key["secret"],"label":"Nouvel appareil"
    })
    assert backup_recover.status_code == 200
    assert backup_recover.json()["profileId"] == created["profileId"]


def test_public_profile_creation_is_limited_without_admin(clients,monkeypatch):
    adm, api = clients
    monkeypatch.setenv("RS_MAX_PROFILES","2")
    for i in range(2):
        result=api.post("/api/v1/profiles/create",json={"profileName":"Test", "deviceName":f"iPhone {i}"})
        assert result.status_code == 200, result.text
    blocked=api.post("/api/v1/profiles/create",json={"profileName":"Overflow", "deviceName":"Other"})
    assert blocked.status_code==429
    assert api.get("/admin/profiles").status_code==404
