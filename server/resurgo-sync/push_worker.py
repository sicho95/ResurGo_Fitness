"""ResurGo scheduled reminders: no port, no new QNAP network, no admin API.

One opt-in subscription per paired browser. Send only due sessions, never weight,
diagnosis, pain or health measurements in the Web Push payload.
"""
from __future__ import annotations

import json
import logging
import time
import uuid
from contextlib import closing
from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app import DB_PATH, connect, init_db, transaction
from push_service import send

log = logging.getLogger("resurgo.push")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def due_sessions(plans, local_day):
    """Pure filtering for the current local calendar day."""
    eligible = []
    for item in plans:
        try:
            session = json.loads(item["payload"])
        except (ValueError, TypeError):
            continue
        if not isinstance(session, dict):
            continue
        if (str(session.get("date") or "") != local_day or
                session.get("completedAt") or not session.get("profileId")):
            continue
        eligible.append((item["entity_id"], session))
    return eligible


def tick(now_utc=None, deliver=send):
    """Exactly one scheduler process is expected; IDs are persistent dedupe keys."""
    if now_utc is None:
        from datetime import timezone
        now_utc = datetime.now(timezone.utc)
    with closing(connect()) as db:
        devices = db.execute("""
            SELECT ps.device_id,ps.subscription_json,ps.timezone,ps.reminder_time,
                   d.profile_id AS account_id
            FROM push_subscriptions AS ps JOIN devices AS d ON d.id=ps.device_id
            WHERE d.revoked_at IS NULL
        """).fetchall()
    sent = 0
    for device in devices:
        try:
            local = now_utc.astimezone(ZoneInfo(device["timezone"]))
        except (ValueError, ZoneInfoNotFoundError):
            log.warning("Invalid timezone for a push subscription")
            continue
        date = local.date().isoformat()
        if local.strftime("%H:%M") < device["reminder_time"]:
            continue
        with closing(connect()) as db:
            plans = db.execute(
                "SELECT entity_id,payload FROM entity_heads "
                "WHERE profile_id=? AND kind='plan' AND deleted=0",
                (device["account_id"],)).fetchall()
            already = {r["session_id"] for r in db.execute(
                "SELECT session_id FROM push_deliveries WHERE device_id=? AND session_date=?",
                (device["device_id"],date)).fetchall()}
        due = [(session_id,obj) for session_id,obj in due_sessions(plans,date)
               if session_id not in already]
        # Bound every device to at most three reminder notifications per day.
        if len(already) >= 3:
            continue
        for session_id, session in due[:3-len(already)]:
            payload = {
                "id":"session-"+session_id+"-"+date,
                "title":"ResurGo — séance prévue",
                "body":"Ta séance du jour est prête dans ResurGo.",
                "sessionId":session_id,
                "profileId":str(session.get("profileId",""))[:100]
            }
            try:
                deliver(DB_PATH,json.loads(device["subscription_json"]),payload)
                with transaction() as db:
                    db.execute("INSERT OR IGNORE INTO push_deliveries "
                               "(device_id,session_id,session_date,delivered_at) "
                               "VALUES(?,?,?,?)",(device["device_id"],session_id,date,int(time.time())))
                sent += 1
            except Exception as exc:
                log.warning("Push failed (device omitted): %s", type(exc).__name__)
    return sent


def main():
    init_db()
    log.info("ResurGo worker started (schedule cadence: 60 seconds)")
    while True:
        try:
            count = tick()
            if count:
                log.info("Push delivered: %s", count)
            with transaction() as db:
                db.execute("DELETE FROM push_deliveries WHERE delivered_at<?",
                           (int(time.time())-60*86400,))
        except Exception as exc:
            log.error("Push scheduler cycle failed: %s", type(exc).__name__)
        time.sleep(60)


if __name__=="__main__":
    main()
