"""
Digital Factory Lab – robot availability server.

Serves the dashboard (../frontend), the admin panel (../admin) and a small
JSON API that stores the free / busy / occupied status of each robot in
data/status.json.

Public
    GET  /api/status            -> {"ur5e": {"state": "use", "person": "...", ...}, ...}
    GET  /api/config            -> {"publicEdit": false}
    GET  /api/health            -> {"ok": true}

Admin (header "X-Lab-Token: <LAB_ADMIN_TOKEN>")
    POST /api/admin/login       -> 200 if the token is valid, else 403
    PUT  /api/status/<robot>    -> body {"state": "free|use|occ", "person": "", "date": "", "note": ""}
                                   (person is required for use and occ)
    POST /api/admin/reset       -> sets every robot to free

Slot bookings ("Book a slot" tab, stored in data/bookings.json; open to everyone)
    GET    /api/bookings?from=&to=&robot=&person=   -> list (dates YYYY-MM-DD)
    POST   /api/bookings          body {"robot", "person", "date", "start", "end", "note"}
                                  start/end are whole hours; 409 if the slot is taken or
                                  the robot is Busy/Occupied on the availability board
    PUT    /api/bookings/<id>     body {"person", "date", "start", "end", "note"}
    DELETE /api/bookings/<id>?person=...                -> marks it cancelled
    Change and cancel need the same person name (or the admin token).

Environment
    LAB_ADMIN_TOKEN   admin password for the admin panel (default: "fhtw-admin" – change it!)
    LAB_PUBLIC_EDIT   "1" lets everyone change the status from the main dashboard
    LAB_DATA_FILE     where status.json is stored
    LAB_DEV_MODE      "1" = development mode: no admin token needed.
                      Default: on when started with `python app.py`,
                      off under gunicorn / Docker.
    LAB_BOOKINGS_FILE where bookings.json is stored (default: next to status.json)
    LAB_HOURS         bookable hours, default "8-18"
    LAB_MAX_HOURS     longest booking in hours, default 4
    LAB_OPEN_DAYS     bookable weekdays, 1 = Monday, default "1-5"
    LAB_WEEKS_AHEAD   how far ahead people can book, default 4
    LAB_TZ            time zone for "today" and past slots, default "Europe/Vienna"
"""
import hmac
import json
import os
import secrets
import threading
import time
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from flask import Flask, abort, jsonify, redirect, request, send_from_directory

BASE = Path(__file__).resolve().parent
ROOT = (BASE / "..").resolve()
FRONTEND = ROOT / "frontend"
ADMIN = ROOT / "admin"
DATA_FILE = Path(os.environ.get("LAB_DATA_FILE", BASE / "data" / "status.json"))
SEED_FILE = BASE / "data" / "status.seed.json"
DEFAULT_TOKEN = "fhtw-admin"
ADMIN_TOKEN = os.environ.get("LAB_ADMIN_TOKEN") or os.environ.get("LAB_EDIT_TOKEN") or DEFAULT_TOKEN
PUBLIC_EDIT = os.environ.get("LAB_PUBLIC_EDIT", "0") == "1"
DEV_MODE = os.environ.get("LAB_DEV_MODE", "0") == "1"
VALID_STATES = {"free", "use", "occ"}

# Slot bookings ("Book a slot" tab)
BOOKINGS_FILE = Path(os.environ.get("LAB_BOOKINGS_FILE", DATA_FILE.parent / "bookings.json"))
TZ_NAME = os.environ.get("LAB_TZ", "Europe/Vienna")
TZ = ZoneInfo(TZ_NAME)
OPEN_FROM, OPEN_TO = (int(h) for h in os.environ.get("LAB_HOURS", "8-18").split("-"))
MAX_HOURS = int(os.environ.get("LAB_MAX_HOURS", "4"))
_d1, _d2 = (int(d) for d in os.environ.get("LAB_OPEN_DAYS", "1-5").split("-"))  # 1 = Monday
OPEN_DAYS = set(range(_d1, _d2 + 1))
WEEKS_AHEAD = int(os.environ.get("LAB_WEEKS_AHEAD", "4"))

app = Flask(__name__, static_folder=None)
_lock = threading.Lock()


# ---------- storage ----------
def _load() -> dict:
    if not DATA_FILE.exists():
        return {}
    try:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def _save(data: dict) -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = DATA_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    tmp.replace(DATA_FILE)  # atomic on the same filesystem


def _seed() -> None:
    """On first start, copy the starting status (some robots busy) into place."""
    if not DATA_FILE.exists() and SEED_FILE.exists():
        DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
        seed = json.loads(SEED_FILE.read_text(encoding="utf-8"))
        now = int(time.time() * 1000)
        for entry in seed.values():
            entry.setdefault("since", now)
        _save(seed)


def _clean(text, limit):
    return str(text or "").strip()[:limit]


def _now() -> datetime:
    return datetime.now(TZ)


# ---------- slot bookings ----------
def _load_bookings() -> list:
    if not BOOKINGS_FILE.exists():
        return []
    try:
        data = json.loads(BOOKINGS_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def _save_bookings(items: list) -> None:
    BOOKINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = BOOKINGS_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(items, indent=2, ensure_ascii=False), encoding="utf-8")
    tmp.replace(BOOKINGS_FILE)


def _new_booking_id(items: list) -> str:
    taken = {b["id"] for b in items}
    while True:
        bid = "B-" + "".join(secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(6))
        if bid not in taken:
            return bid


def _slot_from(body: dict):
    """Validate date / start / end (whole hours) against opening hours and the booking window."""
    date_val = _clean(body.get("date"), 10)
    try:
        day = date.fromisoformat(date_val)
        start, end = int(body.get("start")), int(body.get("end"))
    except (TypeError, ValueError):
        abort(400, "date must be YYYY-MM-DD, start and end whole hours")
    now = _now()
    if not (OPEN_FROM <= start < end <= OPEN_TO):
        abort(400, f"bookings are possible between {OPEN_FROM}:00 and {OPEN_TO}:00")
    if end - start > MAX_HOURS:
        abort(400, f"a booking can be at most {MAX_HOURS} hours")
    if day.isoweekday() not in OPEN_DAYS:
        abort(400, "the lab is closed on that day")
    if day < now.date() or (day == now.date() and start < now.hour):
        abort(400, "that time has already passed")
    if (day - now.date()).days > WEEKS_AHEAD * 7:
        abort(400, f"bookings are possible up to {WEEKS_AHEAD} weeks ahead")
    return date_val, start, end


def _check_slot(robot, date_val, start, end, items, ignore=None):
    """409 if the robot is blocked on the availability board or the slot overlaps another booking."""
    entry = _load().get(robot)
    if entry and entry.get("state") in ("use", "occ"):
        until = entry.get("date") or ""
        if not until or date_val <= until:
            what = "out of service" if entry["state"] == "occ" else "assigned to " + (entry.get("person") or "someone")
            abort(409, f"this robot is {what}" + (f" until {until}" if until else ""))
    for b in items:
        if (b["robot"] == robot and b["date"] == date_val and b["status"] != "cancelled"
                and b["id"] != ignore and start < b["end"] and b["start"] < end):
            abort(409, f"already booked {b['start']:02d}:00–{b['end']:02d}:00 by {b['person']}")


def _own_booking(items, booking_id, person):
    booking = next((b for b in items if b["id"] == booking_id), None)
    if not booking:
        abort(404, "booking not found")
    if not _is_admin() and _clean(person, 60) != booking["person"]:
        abort(403, "only the person who booked (or the lab admin) can change this booking")
    return booking


def _is_admin() -> bool:
    if DEV_MODE:
        return True
    token = request.headers.get("X-Lab-Token", "")
    return hmac.compare_digest(token.encode(), ADMIN_TOKEN.encode())


def _require_admin():
    if not _is_admin():
        abort(403)


@app.errorhandler(400)
@app.errorhandler(403)
@app.errorhandler(404)
@app.errorhandler(409)
def api_error(err):
    """API errors as JSON {"error": "..."} so the dashboard can show the reason."""
    if request.path.startswith("/api/"):
        return jsonify(error=err.description), err.code
    return err


# ---------- public API ----------
@app.get("/api/health")
def health():
    return jsonify(ok=True)


@app.get("/api/config")
def config():
    now = _now()
    return jsonify(publicEdit=PUBLIC_EDIT, devMode=DEV_MODE,
                   booking={"open": OPEN_FROM, "close": OPEN_TO, "maxHours": MAX_HOURS,
                            "days": sorted(OPEN_DAYS), "weeksAhead": WEEKS_AHEAD,
                            "today": now.date().isoformat(), "hour": now.hour, "tz": TZ_NAME})


@app.get("/api/status")
def get_status():
    with _lock:
        return jsonify(_load())


# ---------- admin API ----------
@app.post("/api/admin/login")
def admin_login():
    _require_admin()
    return jsonify(ok=True)


@app.put("/api/status/<robot_id>")
def put_status(robot_id: str):
    if not PUBLIC_EDIT:
        _require_admin()
    if not robot_id.isidentifier() or len(robot_id) > 40:
        abort(400, "invalid robot id")

    body = request.get_json(silent=True) or {}
    state = body.get("state")
    if state not in VALID_STATES:
        abort(400, "state must be free, use or occ")
    # Busy and Occupied both need a responsible person; Free clears everything
    has_person = state in ("use", "occ")
    person = _clean(body.get("person"), 60) if has_person else ""
    if has_person and not person:
        abort(400, "person is required when the robot is busy or occupied")

    # Clean and capture the date field (YYYY-MM-DD from date input)
    date_val = _clean(body.get("date"), 10) if has_person else ""

    with _lock:
        data = _load()
        prev = data.get(robot_id, {})
        unchanged = (
            prev.get("state") == state and
            prev.get("person", "") == person and
            prev.get("date", "") == date_val
        )
        entry = {
            "state": state,
            "person": person,
            "date": date_val,
            "note": _clean(body.get("note"), 80) if state != "free" else "",
            # keep the original start time when only the note/date changes
            "since": prev.get("since") if unchanged and prev.get("since") else int(time.time() * 1000),
        }
        if state == "free":
            data.pop(robot_id, None)
        else:
            data[robot_id] = entry
        _save(data)
    return jsonify(entry if state != "free" else {"state": "free"})


@app.get("/api/bookings")
def list_bookings():
    """Bookings overlapping [from, to] (dates YYYY-MM-DD); optional robot / person filter."""
    d_from = request.args.get("from", "")
    d_to = request.args.get("to", "9999-12-31")
    robot = request.args.get("robot", "")
    person = request.args.get("person", "")
    with _lock:
        items = _load_bookings()
    out = [b for b in items
           if d_from <= b["date"] <= d_to
           and (not robot or b["robot"] == robot)
           and (not person or b["person"] == person)]
    out.sort(key=lambda b: (b["date"], b["start"], b["robot"]))
    return jsonify(out)


@app.post("/api/bookings")
def create_booking():
    body = request.get_json(silent=True) or {}
    robot = _clean(body.get("robot"), 40)
    person = _clean(body.get("person"), 60)
    if not robot.isidentifier():
        abort(400, "invalid robot id")
    if not person:
        abort(400, "choose who is booking")
    date_val, start, end = _slot_from(body)
    with _lock:
        items = _load_bookings()
        _check_slot(robot, date_val, start, end, items)
        booking = {
            "id": _new_booking_id(items),
            "robot": robot, "person": person,
            "date": date_val, "start": start, "end": end,
            "note": _clean(body.get("note"), 80),
            "status": "confirmed",
            "created": int(time.time() * 1000),
        }
        items.append(booking)
        _save_bookings(items)
    return jsonify(booking), 201


@app.put("/api/bookings/<booking_id>")
def change_booking(booking_id: str):
    body = request.get_json(silent=True) or {}
    date_val, start, end = _slot_from(body)
    with _lock:
        items = _load_bookings()
        booking = _own_booking(items, booking_id, body.get("person"))
        _check_slot(booking["robot"], date_val, start, end, items, ignore=booking_id)
        booking.update(date=date_val, start=start, end=end,
                       note=_clean(body.get("note", booking.get("note")), 80),
                       changed=int(time.time() * 1000))
        _save_bookings(items)
    return jsonify(booking)


@app.delete("/api/bookings/<booking_id>")
def cancel_booking(booking_id: str):
    with _lock:
        items = _load_bookings()
        booking = _own_booking(items, booking_id, request.args.get("person"))
        if booking["status"] != "cancelled":
            booking["status"] = "cancelled"
            booking["cancelled"] = int(time.time() * 1000)
            _save_bookings(items)
    return jsonify(booking)


@app.post("/api/admin/reset")
def admin_reset():
    _require_admin()
    with _lock:
        _save({})
    return jsonify(ok=True)


# ---------- pages ----------
@app.get("/admin")
def admin_redirect():
    return redirect("/admin/", code=301)


@app.get("/admin/")
def admin_index():
    return send_from_directory(ADMIN, "index.html")


@app.get("/admin/<path:path>")
def admin_files(path):
    return send_from_directory(ADMIN, path)


@app.get("/")
def index():
    return send_from_directory(FRONTEND, "index.html")


@app.get("/<path:path>")
def static_files(path):
    return send_from_directory(FRONTEND, path)


_seed()
if not DEV_MODE and ADMIN_TOKEN == DEFAULT_TOKEN and __name__ != "__main__":
    print(f"WARNING: using the default admin token '{DEFAULT_TOKEN}'. Set LAB_ADMIN_TOKEN to change it.")

if __name__ == "__main__":
    # `python app.py` is the development server: skip the token unless told otherwise
    if "LAB_DEV_MODE" not in os.environ:
        DEV_MODE = True
    if DEV_MODE:
        print("DEVELOPMENT MODE: the admin token is not checked. Set LAB_DEV_MODE=0 to require it.")
    elif ADMIN_TOKEN == DEFAULT_TOKEN:
        print(f"WARNING: using the default admin token '{DEFAULT_TOKEN}'. Set LAB_ADMIN_TOKEN to change it.")
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=False)