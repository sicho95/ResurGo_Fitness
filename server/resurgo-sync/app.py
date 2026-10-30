"""ResurGo Sync: public API and entirely separate, private administration app.

Candidate implementation; not deployed or approved for real health data.
"""
from __future__ import annotations

import fcntl
import hashlib
import hmac
import json
import os
import secrets
import sqlite3
import time
import uuid
from contextlib import contextmanager, closing
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse
from pydantic import BaseModel, Field

VERSION = "0.1.0-candidate"
DB_PATH = Path(os.environ.get("RS_DB_PATH", "/data/resurgo.sqlite3"))
ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
ENTITY_TYPES = {"profile_settings", "plan", "activity", "measurement",
                "feedback", "record", "recovery", "exercise_override"}
MAX_PAYLOAD_BYTES = 16384


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    c = sqlite3.connect(str(DB_PATH), timeout=15)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA busy_timeout=15000")
    c.execute("PRAGMA foreign_keys=ON")
    # WAL is configured once under a cross-process startup lock in init_db().
    # Re-setting journal_mode on every request can lock the other service.
    return c


def init_db() -> None:
    # The public and admin containers may start simultaneously over the same
    # bind-mounted SQLite file. A process-shared OS file lock serializes schema
    # creation and WAL activation. Never lock the ordinary API request path.
    DB_PATH.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    with open(DB_PATH.with_name(DB_PATH.name + ".init.lock"), "a+b") as lock_file:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
        try:
            _init_db_locked()
        finally:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)


def _init_db_locked() -> None:
    with closing(connect()) as c:
        c.execute("PRAGMA journal_mode=WAL")
        c.executescript("""
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY, label TEXT NOT NULL, created_at INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS devices (
            id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES profiles(id),
            label TEXT NOT NULL, token_hash TEXT UNIQUE NOT NULL,
            revoked_at INTEGER, created_at INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS pair_codes (
            hash TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES profiles(id),
            expires_at INTEGER NOT NULL, used_at INTEGER, attempts INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE IF NOT EXISTS recovery_keys (
            key_id TEXT PRIMARY KEY,
            profile_id TEXT NOT NULL REFERENCES profiles(id),
            device_id TEXT NOT NULL REFERENCES devices(id),
            secret_hash TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            revoked_at INTEGER
        );
        CREATE INDEX IF NOT EXISTS recovery_by_profile ON recovery_keys(profile_id);
        CREATE TABLE IF NOT EXISTS entity_heads (
            profile_id TEXT NOT NULL REFERENCES profiles(id), kind TEXT NOT NULL,
            entity_id TEXT NOT NULL, revision INTEGER NOT NULL,
            deleted INTEGER NOT NULL, payload TEXT NOT NULL,
            PRIMARY KEY (profile_id, kind, entity_id));
        CREATE TABLE IF NOT EXISTS events (
            sequence INTEGER PRIMARY KEY AUTOINCREMENT,
            profile_id TEXT NOT NULL REFERENCES profiles(id),
            device_id TEXT NOT NULL REFERENCES devices(id),
            operation_id TEXT NOT NULL, kind TEXT NOT NULL,
            entity_id TEXT NOT NULL, revision INTEGER NOT NULL,
            deleted INTEGER NOT NULL, payload TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            UNIQUE(profile_id, operation_id));
        CREATE INDEX IF NOT EXISTS idx_events_profile_seq
            ON events(profile_id, sequence);
        CREATE TABLE IF NOT EXISTS rate_buckets (
            bucket TEXT PRIMARY KEY, window_start INTEGER NOT NULL, hits INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS profile_signups (
            profile_id TEXT PRIMARY KEY REFERENCES profiles(id),
            origin_hash TEXT NOT NULL, created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_signups_created ON profile_signups(created_at);
        CREATE INDEX IF NOT EXISTS idx_signups_origin ON profile_signups(origin_hash,created_at);
        """)


@contextmanager
def transaction():
    c = connect()
    try:
        c.execute("BEGIN IMMEDIATE")
        yield c
        c.commit()
    except BaseException:
        c.rollback()
        raise
    finally:
        c.close()


def digest(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def pairing_digest(code: str) -> str:
    pepper = os.environ.get("RS_PAIR_PEPPER", "")
    if len(pepper) < 32:
        raise HTTPException(status_code=503, detail="pairing_not_configured")
    return hmac.new(pepper.encode(), code.strip().upper().encode(), hashlib.sha256).hexdigest()


def random_code() -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(12))


def create_recovery_key(c: sqlite3.Connection, profile_id: str, device_id: str) -> dict:
    """One independent 384-bit recovery capability per enrollment.
    Only the hashed capability is retained server-side; the client must encrypt
    the original in its password-protected JSON backup.
    """
    key_id = str(uuid.uuid4())
    secret = secrets.token_urlsafe(48)
    c.execute(
        "INSERT INTO recovery_keys(key_id,profile_id,device_id,secret_hash,created_at) "
        "VALUES(?,?,?,?,?)",
        (key_id, profile_id, device_id, digest(secret), int(time.time()))
    )
    return {"keyId": key_id, "secret": secret}


def pair_code(c: sqlite3.Connection, profile_id: str) -> tuple[str, int]:
    code, expiry = random_code(), int(time.time()) + 600
    c.execute("INSERT INTO pair_codes(hash,profile_id,expires_at) VALUES(?,?,?)",
              (pairing_digest(code), profile_id, expiry))
    return code, expiry


def throttle(c: sqlite3.Connection, name: str, limit: int) -> None:
    """Global cap; add reverse proxy limits and a security review before public exposure."""
    now = int(time.time())
    row = c.execute("SELECT window_start,hits FROM rate_buckets WHERE bucket=?", (name,)).fetchone()
    if row is None or row["window_start"] < now - 60:
        c.execute("INSERT INTO rate_buckets(bucket,window_start,hits) VALUES(?,?,1) "
                  "ON CONFLICT(bucket) DO UPDATE SET window_start=excluded.window_start,hits=1",
                  (name, now))
    elif row["hits"] >= limit:
        raise HTTPException(status_code=429, detail="rate_limit")
    else:
        c.execute("UPDATE rate_buckets SET hits=hits+1 WHERE bucket=?", (name,))


def current_device(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="authentication_required")
    raw = authorization.removeprefix("Bearer ").strip()
    if len(raw) < 32 or len(raw) > 256:
        raise HTTPException(status_code=401, detail="invalid_token")
    with closing(connect()) as c:
        row = c.execute("SELECT id, profile_id, label FROM devices "
                        "WHERE token_hash=? AND revoked_at IS NULL",
                        (digest(raw),)).fetchone()
    if row is None:
        raise HTTPException(status_code=401, detail="invalid_token")
    return dict(row)


def require_admin(authorization: str | None = Header(default=None)) -> None:
    expected = os.environ.get("RS_ADMIN_TOKEN", "")
    supplied = (authorization or "").removeprefix("Bearer ").strip()
    if len(expected) < 32 or not hmac.compare_digest(expected, supplied):
        raise HTTPException(status_code=401, detail="admin_auth_required")


class DeviceRequest(BaseModel):
    label: str = Field(min_length=1, max_length=80)


class RedeemRequest(DeviceRequest):
    code: str = Field(min_length=8, max_length=32)


class CreateProfileRequest(BaseModel):
    label: str = Field(min_length=1, max_length=80)


class PublicCreateProfile(BaseModel):
    profileName: str = Field(min_length=1, max_length=80)
    deviceName: str = Field(min_length=1, max_length=80)


class RecoverRequest(DeviceRequest):
    profileId: str = Field(min_length=8, max_length=100)
    keyId: str = Field(min_length=8, max_length=100)
    secret: str = Field(min_length=40, max_length=256)


class Operation(BaseModel):
    operationId: str = Field(min_length=8, max_length=100)
    entityType: str = Field(min_length=1, max_length=64)
    entityId: str = Field(min_length=1, max_length=120)
    expectedRevision: int = Field(ge=0)
    payload: dict[str, Any] = Field(default_factory=dict)
    deleted: bool = False


class PushRequest(BaseModel):
    operations: list[Operation] = Field(min_length=1, max_length=100)


public = FastAPI(title="ResurGo public synchronization API", version=VERSION,
                 docs_url=None, redoc_url=None, openapi_url=None)
origins = [a.strip() for a in os.environ.get(
    "RS_CORS_ORIGINS", "https://sicho95.github.io").split(",") if a.strip()]
public.add_middleware(CORSMiddleware, allow_origins=origins,
                      allow_methods=["GET", "POST"], allow_headers=["Authorization", "Content-Type"],
                      allow_credentials=False)

admin = FastAPI(title="ResurGo PRIVATE administration API", version=VERSION,
                docs_url=None, redoc_url=None, openapi_url=None)


@public.on_event("startup")
def startup_public():
    init_db()
    # Fail closed even for unprotected endpoints if pairing secret is unset.
    if len(os.environ.get("RS_PAIR_PEPPER", "")) < 32:
        raise RuntimeError("RS_PAIR_PEPPER missing or shorter than 32 characters")


@admin.on_event("startup")
def startup_admin():
    init_db()
    if len(os.environ.get("RS_ADMIN_TOKEN", "")) < 32:
        raise RuntimeError("RS_ADMIN_TOKEN missing or shorter than 32 characters")
    if len(os.environ.get("RS_PAIR_PEPPER", "")) < 32:
        raise RuntimeError("RS_PAIR_PEPPER missing or shorter than 32 characters")


@public.middleware("http")
async def restrict_request_body(request: Request, call_next):
    if request.method in {"POST", "PUT", "PATCH"}:
        header = request.headers.get("content-length")
        # Public Funnel API rejects unbounded streaming bodies.
        if header is None or not header.isdecimal() or int(header) > 2_000_000:
            return JSONResponse({"error": "invalid_content_length"}, status_code=413)
    return await call_next(request)


@public.get("/health")
def health():
    return {"ok": True, "service": "resurgo-sync-public", "version": VERSION}


@admin.get("/", response_class=HTMLResponse)
def private_admin_page():
    # Login view only: no data and no embedded secrets. All admin API calls require bearer auth.
    response = HTMLResponse(Path(__file__).with_name("admin.html").read_text(encoding="utf-8"))
    response.headers["Content-Security-Policy"] = ("default-src 'none'; style-src 'unsafe-inline'; "
        "script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'")
    response.headers["Cache-Control"] = "no-store"
    return response


@admin.get("/admin.js")
def private_admin_script():
    response = FileResponse(Path(__file__).with_name("admin.js"), media_type="text/javascript")
    response.headers["Cache-Control"] = "no-store"
    return response


@admin.get("/health")
def admin_health(_: None = Depends(require_admin)):
    return {"ok": True, "service": "resurgo-sync-admin", "version": VERSION}


@admin.post("/admin/profiles")
def create_profile(req: CreateProfileRequest, _: None = Depends(require_admin)):
    profile_id = str(uuid.uuid4())
    with transaction() as c:
        c.execute("INSERT INTO profiles(id,label,created_at) VALUES(?,?,?)",
                  (profile_id, req.label.strip(), int(time.time())))
        code, expiry = pair_code(c, profile_id)
    return {"profileId": profile_id, "enrollmentCode": code, "expiresAt": expiry}


@admin.get("/admin/profiles")
def list_profiles(_: None = Depends(require_admin)):
    with closing(connect()) as c:
        return {"profiles": [dict(r) for r in c.execute(
            "SELECT p.id,p.label,p.created_at,COUNT(d.id) AS devices "
            "FROM profiles p LEFT JOIN devices d ON d.profile_id=p.id "
            "AND d.revoked_at IS NULL GROUP BY p.id ORDER BY p.created_at DESC")]}


@admin.get("/admin/profiles/{profile_id}/devices")
def admin_list_profile_devices(profile_id: str, _: None = Depends(require_admin)):
    with closing(connect()) as c:
        found = c.execute("SELECT id FROM profiles WHERE id=?", (profile_id,)).fetchone()
        if not found:
            raise HTTPException(status_code=404, detail="profile_not_found")
        rows = c.execute("SELECT id,label,created_at,revoked_at FROM devices "
                         "WHERE profile_id=? ORDER BY created_at", (profile_id,)).fetchall()
    return {"devices": [dict(r) for r in rows]}


@admin.post("/admin/devices/{device_id}/revoke")
def revoke_device(device_id: str, _: None = Depends(require_admin)):
    with transaction() as c:
        n = c.execute("UPDATE devices SET revoked_at=? WHERE id=? AND revoked_at IS NULL",
                      (int(time.time()), device_id)).rowcount
    if not n:
        raise HTTPException(status_code=404, detail="device_not_found")
    return {"ok": True}


@public.post("/api/v1/profiles/create")
def create_public_profile(req: PublicCreateProfile, request: Request):
    """First device registers without an administrator, as in AlphaTerminal.

    Apply hard global caps even when Funnel masks client IP; do not trust
    X-Forwarded-For as an arbitrary user-supplied header.
    """
    now = int(time.time())
    ip = request.client.host if request.client else "unknown"
    origin_hash = digest(ip + os.environ["RS_PAIR_PEPPER"])
    max_profiles = max(1, int(os.getenv("RS_MAX_PROFILES", "60")))
    daily_limit = max(1, int(os.getenv("RS_MAX_SIGNUPS_DAY", "20")))
    origin_daily = max(1, int(os.getenv("RS_MAX_SIGNUPS_ORIGIN_DAY", "5")))
    with transaction() as c:
        throttle(c, "profiles_create_global", 3)
        total = c.execute("SELECT COUNT(*) FROM profiles").fetchone()[0]
        global_today = c.execute("SELECT COUNT(*) FROM profile_signups "
                                 "WHERE created_at >= ?", (now-86400,)).fetchone()[0]
        from_origin = c.execute("SELECT COUNT(*) FROM profile_signups "
                                "WHERE created_at>=? AND origin_hash=?",
                                (now-86400, origin_hash)).fetchone()[0]
        if total >= max_profiles or global_today >= daily_limit or from_origin >= origin_daily:
            raise HTTPException(status_code=429, detail="signup_capacity_reached")
        profile_id, device_id = str(uuid.uuid4()), str(uuid.uuid4())
        token = secrets.token_urlsafe(32)
        c.execute("INSERT INTO profiles(id,label,created_at) VALUES(?,?,?)",
                  (profile_id, req.profileName.strip(), now))
        c.execute("INSERT INTO devices(id,profile_id,label,token_hash,created_at) "
                  "VALUES(?,?,?,?,?)",
                  (device_id, profile_id, req.deviceName.strip(), digest(token), now))
        recovery = create_recovery_key(c, profile_id, device_id)
        c.execute("INSERT INTO profile_signups(profile_id,origin_hash,created_at) VALUES(?,?,?)",
                  (profile_id, origin_hash, now))
    return {"profileId": profile_id, "profileName": req.profileName.strip(),
            "deviceId": device_id, "token": token, "recovery": recovery}


@public.post("/api/v1/pair/redeem")
def redeem(req: RedeemRequest):
    # Throttling commits separately, including for invalid codes.
    with transaction() as c:
        throttle(c, "pair_redeem_global", 40)
    with transaction() as c:
        row = c.execute("SELECT hash,profile_id,expires_at,used_at,attempts FROM pair_codes "
                        "WHERE hash=?", (pairing_digest(req.code),)).fetchone()
        now = int(time.time())
        if not row or row["expires_at"] < now or row["used_at"] is not None or row["attempts"] >= 5:
            raise HTTPException(status_code=400, detail="invalid_or_expired_code")
        device_id, secret = str(uuid.uuid4()), secrets.token_urlsafe(32)
        c.execute("INSERT INTO devices(id,profile_id,label,token_hash,created_at) "
                  "VALUES(?,?,?,?,?)",
                  (device_id, row["profile_id"], req.label.strip(), digest(secret), now))
        c.execute("UPDATE pair_codes SET used_at=? WHERE hash=?", (now, row["hash"]))
        recovery = create_recovery_key(c, row["profile_id"], device_id)
    return {"profileId": row["profile_id"], "deviceId": device_id, "token": secret,
            "recovery": recovery}


@public.post("/api/v1/recovery/redeem")
def recover_with_backup(req: RecoverRequest):
    """Re-enroll from an encrypted export, without admin or an old device.

    The backup passphrase never reaches this API. The client decrypts locally
    and sends only the independent, high-entropy recovery capability.
    """
    with transaction() as c:
        throttle(c, "recovery_redeem_global", 30)
    with transaction() as c:
        row = c.execute("SELECT profile_id,secret_hash FROM recovery_keys "
                        "WHERE profile_id=? AND key_id=? AND revoked_at IS NULL",
                        (req.profileId, req.keyId)).fetchone()
        if row is None or not hmac.compare_digest(row["secret_hash"], digest(req.secret)):
            raise HTTPException(status_code=401, detail="invalid_recovery_credential")
        device_id, token = str(uuid.uuid4()), secrets.token_urlsafe(32)
        c.execute("INSERT INTO devices(id,profile_id,label,token_hash,created_at) "
                  "VALUES(?,?,?,?,?)",
                  (device_id, req.profileId, req.label.strip(), digest(token), int(time.time())))
        replacement = create_recovery_key(c, req.profileId, device_id)
    return {"profileId": req.profileId, "deviceId": device_id,
            "token": token, "recovery": replacement}


@public.get("/api/v1/recovery/keys")
def list_my_recovery_keys(user: dict = Depends(current_device)):
    with closing(connect()) as c:
        rows = c.execute("SELECT key_id,device_id,created_at,revoked_at "
                         "FROM recovery_keys WHERE profile_id=? ORDER BY created_at DESC",
                         (user["profile_id"],)).fetchall()
    return {"keys": [{"keyId": r["key_id"], "deviceId": r["device_id"],
                      "createdAt": r["created_at"],
                      "revoked": r["revoked_at"] is not None} for r in rows]}


@public.post("/api/v1/recovery/keys/{key_id}/revoke")
def revoke_recovery_key(key_id: str, user: dict = Depends(current_device)):
    with transaction() as c:
        n = c.execute("UPDATE recovery_keys SET revoked_at=? WHERE key_id=? "
                      "AND profile_id=? AND revoked_at IS NULL",
                      (int(time.time()), key_id, user["profile_id"])).rowcount
    if not n:
        raise HTTPException(status_code=404, detail="recovery_key_not_found")
    return {"ok": True}


@public.post("/api/v1/pair/start")
def start_pair(req: DeviceRequest, user: dict = Depends(current_device)):
    # The approving device deliberately generates a code for another device.
    with transaction() as c:
        code, expiry = pair_code(c, user["profile_id"])
    return {"code": code, "expiresAt": expiry, "purpose": "pair_another_device"}


@public.get("/api/v1/devices")
def list_my_devices(user: dict = Depends(current_device)):
    with closing(connect()) as c:
        rows = c.execute("SELECT id,label,created_at,revoked_at FROM devices "
                         "WHERE profile_id=? ORDER BY created_at", (user["profile_id"],))
        return {"devices": [dict(r) for r in rows], "currentDeviceId": user["id"]}


@public.post("/api/v1/devices/{device_id}/revoke")
def revoke_my_device(device_id: str, user: dict = Depends(current_device)):
    with transaction() as c:
        n = c.execute("UPDATE devices SET revoked_at=? "
                      "WHERE id=? AND profile_id=? AND revoked_at IS NULL",
                      (int(time.time()), device_id, user["profile_id"])).rowcount
    if not n:
        raise HTTPException(status_code=404, detail="device_not_found")
    return {"ok": True}


@public.post("/api/v1/sync/push")
def push(req: PushRequest, user: dict = Depends(current_device)):
    results = []
    with transaction() as c:
        for op in req.operations:
            if op.entityType not in ENTITY_TYPES:
                results.append({"operationId": op.operationId, "status": "invalid_entity_type"})
                continue
            payload = json.dumps(op.payload, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
            if len(payload.encode("utf-8")) > MAX_PAYLOAD_BYTES:
                results.append({"operationId": op.operationId, "status": "payload_too_large"})
                continue
            duplicate = c.execute("SELECT revision,sequence FROM events "
                                  "WHERE profile_id=? AND operation_id=?",
                                  (user["profile_id"], op.operationId)).fetchone()
            if duplicate:
                results.append({"operationId": op.operationId, "status": "duplicate",
                                "revision": duplicate["revision"],
                                "sequence": duplicate["sequence"]})
                continue
            head = c.execute("SELECT revision FROM entity_heads WHERE profile_id=? "
                             "AND kind=? AND entity_id=?",
                             (user["profile_id"], op.entityType, op.entityId)).fetchone()
            current = int(head["revision"]) if head else 0
            if op.expectedRevision != current:
                results.append({"operationId": op.operationId, "status": "conflict",
                                "currentRevision": current})
                continue
            revision = current + 1
            c.execute("INSERT INTO entity_heads(profile_id,kind,entity_id,revision,deleted,payload) "
                      "VALUES(?,?,?,?,?,?) ON CONFLICT(profile_id,kind,entity_id) "
                      "DO UPDATE SET revision=excluded.revision,deleted=excluded.deleted,"
                      "payload=excluded.payload",
                      (user["profile_id"], op.entityType, op.entityId, revision, int(op.deleted), payload))
            cur = c.execute("INSERT INTO events(profile_id,device_id,operation_id,kind,"
                            "entity_id,revision,deleted,payload,created_at)"
                            " VALUES(?,?,?,?,?,?,?,?,?)",
                            (user["profile_id"], user["id"], op.operationId,
                             op.entityType, op.entityId, revision, int(op.deleted), payload,
                             int(time.time())))
            results.append({"operationId": op.operationId, "status": "applied",
                            "revision": revision, "sequence": cur.lastrowid})
    return {"results": results}


@public.get("/api/v1/sync/pull")
def pull(cursor: int = Query(default=0, ge=0),
         limit: int = Query(default=100, ge=1, le=200),
         user: dict = Depends(current_device)):
    with closing(connect()) as c:
        rows = c.execute("SELECT sequence,operation_id,kind,entity_id,revision,"
                         "deleted,payload,device_id,created_at FROM events "
                         "WHERE profile_id=? AND sequence>? ORDER BY sequence LIMIT ?",
                         (user["profile_id"], cursor, limit + 1)).fetchall()
    more = len(rows) > limit
    events = [dict(r) for r in rows[:limit]]
    for event in events:
        event["payload"] = json.loads(event["payload"])
        event["deleted"] = bool(event["deleted"])
    return {"events": events, "nextCursor": events[-1]["sequence"] if events else cursor,
            "hasMore": more}
