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
    PUT  /api/status/<robot>    -> body {"state": "free|use|occ", "person": "", "note": ""}
    POST /api/admin/reset       -> sets every robot to free

Environment
    LAB_ADMIN_TOKEN   admin password for the admin panel (default: "fhtw-admin" – change it!)
    LAB_PUBLIC_EDIT   "1" lets everyone change the status from the main dashboard
    LAB_DATA_FILE     where status.json is stored
    LAB_DEV_MODE      "1" = development mode: no admin token needed.
                      Default: on when started with `python app.py`,
                      off under gunicorn / Docker.
"""
import hmac
import json
import os
import shutil
import threading
import time
from pathlib import Path

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


def _is_admin() -> bool:
    if DEV_MODE:
        return True
    token = request.headers.get("X-Lab-Token", "")
    return hmac.compare_digest(token.encode(), ADMIN_TOKEN.encode())


def _require_admin():
    if not _is_admin():
        abort(403)


# ---------- public API ----------
@app.get("/api/health")
def health():
    return jsonify(ok=True)


@app.get("/api/config")
def config():
    return jsonify(publicEdit=PUBLIC_EDIT, devMode=DEV_MODE)


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
    person = _clean(body.get("person"), 60)
    if state == "use" and not person:
        abort(400, "person is required when the robot is busy")

    with _lock:
        data = _load()
        prev = data.get(robot_id, {})
        unchanged = prev.get("state") == state and prev.get("person", "") == (person if state == "use" else "")
        entry = {
            "state": state,
            "person": person if state == "use" else "",
            "note": _clean(body.get("note"), 80) if state != "free" else "",
            # keep the original start time when only the note changes
            "since": prev.get("since") if unchanged and prev.get("since") else int(time.time() * 1000),
        }
        if state == "free":
            data.pop(robot_id, None)
        else:
            data[robot_id] = entry
        _save(data)
    return jsonify(entry if state != "free" else {"state": "free"})


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
