"""Per-device Web Push helpers. All keys remain on the ResurGo NAS volume.

Never use AlphaTerminal's keys. No user-entered URL can become an HTTP target:
browser push endpoints are allowlisted before sending to prevent SSRF.
"""
from __future__ import annotations

import base64
import fcntl
import json
import os
from pathlib import Path
from urllib.parse import urlsplit

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from pywebpush import webpush

PUSH_HOSTS = {"web.push.apple.com", "fcm.googleapis.com",
              "updates.push.services.mozilla.com", "push.services.mozilla.com"}
DEFAULT_SUBJECT = "https://sicho95.github.io/ResurGo_Fitness/"


def ensure_schema(db):
    db.executescript("""
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      device_id TEXT PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
      subscription_json TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'Europe/Paris',
      reminder_time TEXT NOT NULL DEFAULT '08:00',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS push_deliveries (
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL,
      session_date TEXT NOT NULL,
      delivered_at INTEGER NOT NULL,
      PRIMARY KEY(device_id,session_id,session_date)
    );
    CREATE INDEX IF NOT EXISTS push_deliveries_date ON push_deliveries(session_date);
    """)


def _keyfile(db_path: Path) -> Path:
    return db_path.with_name(".resurgo-vapid-private.pem")


def _read_or_create_private(db_path: Path):
    path = _keyfile(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    lock_path = path.with_suffix(".lock")
    with open(lock_path, "a+b") as lock:
        fcntl.flock(lock.fileno(), fcntl.LOCK_EX)
        try:
            if not path.exists():
                key = ec.generate_private_key(ec.SECP256R1())
                pem = key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.TraditionalOpenSSL,
                    encryption_algorithm=serialization.NoEncryption())
                fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
                try:
                    with os.fdopen(fd, "wb") as file:
                        file.write(pem)
                except BaseException:
                    path.unlink(missing_ok=True)
                    raise
            if (path.stat().st_mode & 0o077):
                raise RuntimeError("Private VAPID key permissions are too permissive")
            return serialization.load_pem_private_key(path.read_bytes(), password=None)
        finally:
            fcntl.flock(lock.fileno(), fcntl.LOCK_UN)


def public_key(db_path: Path) -> str:
    key = _read_or_create_private(db_path)
    uncompressed = key.public_key().public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint)
    return base64.urlsafe_b64encode(uncompressed).rstrip(b"=").decode("ascii")


def validate_subscription(subscription: dict) -> dict:
    if not isinstance(subscription, dict):
        raise ValueError("invalid_subscription")
    endpoint = subscription.get("endpoint")
    keys = subscription.get("keys")
    if not isinstance(endpoint, str) or not 20 < len(endpoint) <= 3000:
        raise ValueError("invalid_push_endpoint")
    try:
        u = urlsplit(endpoint)
        host = (u.hostname or "").lower().rstrip(".")
        if (u.scheme != "https" or u.username or u.password or u.fragment or
                u.port not in (None, 443) or host not in PUSH_HOSTS):
            raise ValueError("push_endpoint_not_allowed")
    except ValueError:
        raise ValueError("invalid_push_endpoint") from None
    if not isinstance(keys, dict) or not all(isinstance(keys.get(k), str) and
            12 <= len(keys[k]) <= 256 for k in ("p256dh", "auth")):
        raise ValueError("invalid_subscription_keys")
    return {"endpoint": endpoint, "keys": {"p256dh":keys["p256dh"],
                                          "auth":keys["auth"]}}


def send(db_path: Path, subscription: dict, payload: dict):
    # Validate AGAIN before any worker delivery, even when data came from SQLite.
    safe = validate_subscription(subscription)
    _read_or_create_private(db_path)
    subject = os.getenv("RS_VAPID_SUBJECT", DEFAULT_SUBJECT)
    if not subject.startswith(("mailto:", "https://")):
        raise RuntimeError("VAPID subject invalid")
    return webpush(
        subscription_info=safe,
        data=json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        vapid_private_key=str(_keyfile(db_path)),
        vapid_claims={"sub":subject}, ttl=3600)
