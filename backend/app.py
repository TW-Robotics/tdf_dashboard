"""Digital Factory Lab: shared inventory, people register and device availability."""
import hmac
import json
import os
import re
import sqlite3
from datetime import date
from pathlib import Path

from flask import Flask, abort, jsonify, redirect, request, send_from_directory
from werkzeug.exceptions import HTTPException

from storage import Store, name_key, new_id, now_ms

BASE = Path(__file__).resolve().parent
ROOT = BASE.parent
FRONTEND = ROOT / "frontend"
ADMIN = ROOT / "admin"
LEGACY_FILE = Path(os.environ.get("LAB_DATA_FILE", BASE / "data" / "status.json"))
DB_FILE = Path(os.environ.get("LAB_DB_FILE", LEGACY_FILE.with_name("lab.sqlite3")))
DEFAULT_TOKEN = "fhtw-admin"
ADMIN_TOKEN = os.environ.get("LAB_ADMIN_TOKEN") or os.environ.get("LAB_EDIT_TOKEN") or DEFAULT_TOKEN
PUBLIC_EDIT = os.environ.get("LAB_PUBLIC_EDIT", "0") == "1"
DEV_MODE = os.environ.get("LAB_DEV_MODE", "0") == "1"
MODEL_FIELDS = ("name", "maker", "type", "payload", "reach", "repeat", "ctrl", "sw", "sdk", "docFile", "image", "art")

app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024
store = Store(DB_FILE, LEGACY_FILE, BASE / "data" / "catalog.seed.json")
store.initialize()


@app.errorhandler(HTTPException)
def http_error(error):
    if request.path.startswith("/api/"):
        return jsonify(error=error.description), error.code
    return error


@app.errorhandler(sqlite3.Error)
def database_error(error):
    app.logger.exception("Database operation failed")
    return jsonify(error="The shared inventory is unavailable. Please try again."), 503


@app.after_request
def api_headers(response):
    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


def is_admin():
    return DEV_MODE or hmac.compare_digest(request.headers.get("X-Lab-Token", "").encode(), ADMIN_TOKEN.encode())


def require_admin():
    if not is_admin():
        abort(403, "An admin token is required.")


def body_json():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        abort(400, "A JSON object is required.")
    return body


def text(body, field, limit=120, required=False):
    value = body.get(field, "")
    if not isinstance(value, str):
        abort(400, f"{field} must be text.")
    value = value.strip()
    if len(value) > limit or (required and not value):
        abort(400, f"{field} is required and must be at most {limit} characters." if required
              else f"{field} must be at most {limit} characters.")
    return value


def active_value(body):
    value = body.get("active", True)
    if not isinstance(value, bool):
        abort(400, "active must be true or false.")
    return value


def check_version(body, current, key="version"):
    version = body.get(key)
    if isinstance(version, bool) or not isinstance(version, int):
        abort(400, f"{key} is required. Reload the latest record before saving.")
    if version != current:
        abort(409, "This record has changed. Reload it and review your changes before saving again.")


def get_row(db, table, record_id):
    # The table name is always a constant supplied by the routes below.
    if isinstance(record_id, bool) or not isinstance(record_id, (str, int)):
        abort(400, "Invalid record ID.")
    row = db.execute(f"SELECT * FROM {table} WHERE id = ?", (record_id,)).fetchone()
    if row is None:
        abort(404, "Record not found.")
    return row


def asset_path(value, directory, suffix):
    if Path(value).is_absolute() or "\\" in value:
        abort(400, "Use a relative asset path.")
    path = (FRONTEND / value).resolve()
    allowed = (FRONTEND / directory).resolve()
    if not path.is_relative_to(allowed) or path.suffix != suffix or not path.is_file():
        abort(400, f"Select an existing {directory} file.")
    return path.relative_to(FRONTEND).as_posix()


@app.get("/api/health")
def health():
    with store.transaction() as db:
        db.execute("SELECT 1 FROM metadata LIMIT 1").fetchone()
    return jsonify(ok=True)


@app.get("/api/config")
def config():
    with store.transaction() as db:
        staff = [{"id": row["id"], "name": row["name"]} for row in db.execute(
            "SELECT id, name FROM people WHERE role = 'staff' AND active = 1 ORDER BY name")]
    return jsonify(publicEdit=PUBLIC_EDIT, devMode=DEV_MODE, responsiblePeople=staff)


@app.get("/api/fleet")
def fleet():
    with store.transaction() as db:
        return jsonify(store.snapshot(db))


@app.get("/api/models")
def models():
    with store.transaction() as db:
        return jsonify(store.snapshot(db)["models"])


@app.get("/api/instances")
def instances():
    with store.transaction() as db:
        return jsonify(store.snapshot(db)["instances"])


@app.get("/api/status")
def status():
    with store.transaction() as db:
        return jsonify({device["id"]: {
            **device["status"], "migrationPending": device["migrationPending"],
            "state": "unknown" if device["migrationPending"] else device["status"]["state"]
        } for device in store.snapshot(db)["instances"]})


@app.post("/api/admin/login")
def login():
    require_admin()
    return jsonify(ok=True)


@app.get("/api/admin/snapshot")
def admin_snapshot():
    require_admin()
    with store.transaction() as db:
        result = store.snapshot(db, admin=True)
    result["resources"] = {
        "docs": [p.relative_to(FRONTEND).as_posix() for p in sorted((FRONTEND / "docs").glob("*.md")) if p.name != "_TEMPLATE.md"],
        "images": [p.relative_to(FRONTEND).as_posix() for p in sorted((FRONTEND / "assets/robots").glob("*.png"))]}
    return jsonify(result)


@app.post("/api/admin/models")
@app.put("/api/admin/models/<model_id>")
def save_model(model_id=None):
    require_admin()
    body = body_json()
    creating = model_id is None
    if creating:
        model_id = text(body, "id", 40, required=True)
        if not re.fullmatch(r"[a-z][a-z0-9_]{0,39}", model_id):
            abort(400, "Model ID must start with a letter and use lowercase letters, digits or underscores.")
    data = {key: text(body, key, 240, required=key in {"name", "maker", "docFile", "image"}) for key in MODEL_FIELDS}
    data["id"] = model_id
    axes = body.get("axes", 0)
    if isinstance(axes, bool) or not isinstance(axes, int) or not 0 <= axes <= 200:
        abort(400, "axes must be a whole number between 0 and 200.")
    data["axes"] = axes
    data["docFile"] = asset_path(data["docFile"], "docs", ".md")
    data["image"] = asset_path(data["image"], "assets/robots", ".png")
    active = active_value(body)
    with store.transaction(write=True) as db:
        if creating:
            if db.execute("SELECT 1 FROM models WHERE id = ?", (model_id,)).fetchone():
                abort(409, "This model ID already exists.")
            db.execute("INSERT INTO models(id, data, active) VALUES (?, ?, ?)",
                       (model_id, json.dumps(data, ensure_ascii=False), active))
        else:
            previous = get_row(db, "models", model_id)
            check_version(body, previous["version"])
            if not active and db.execute("SELECT 1 FROM instances WHERE model_id = ? AND active = 1", (model_id,)).fetchone():
                abort(409, "Deactivate this model's devices first.")
            db.execute("UPDATE models SET data = ?, active = ?, version = version + 1 WHERE id = ?",
                       (json.dumps(data, ensure_ascii=False), active, model_id))
        store.bump(db)
    return jsonify(ok=True, id=model_id), 201 if creating else 200


@app.post("/api/admin/instances")
@app.put("/api/admin/instances/<instance_id>")
def save_instance(instance_id=None):
    require_admin()
    body = body_json()
    creating = instance_id is None
    inventory_id = text(body, "inventoryId", 40, required=True).upper()
    if not re.fullmatch(r"[A-Z0-9][A-Z0-9_-]{0,39}", inventory_id):
        abort(400, "Inventory ID may contain letters, digits, underscores and hyphens.")
    model_id = text(body, "modelId", 40, required=True)
    location = text(body, "location", 80)
    ip = text(body, "ip", 120)
    connection_notes = text(body, "connectionNotes", 400)
    active = active_value(body)
    with store.transaction(write=True) as db:
        model = get_row(db, "models", model_id)
        if active and not model["active"]:
            abort(409, "Activate this model before adding active devices.")
        duplicate = db.execute("SELECT id FROM instances WHERE inventory_id = ?", (inventory_id,)).fetchone()
        if duplicate and duplicate["id"] != instance_id:
            abort(409, "This inventory ID already exists.")
        if creating:
            instance_id = new_id()
            db.execute("""INSERT INTO instances(id, inventory_id, model_id, location, ip, connection_notes, active)
                          VALUES (?, ?, ?, ?, ?, ?, ?)""",
                       (instance_id, inventory_id, model_id, location, ip, connection_notes, active))
            db.execute("INSERT INTO statuses(instance_id) VALUES (?)", (instance_id,))
        else:
            previous = get_row(db, "instances", instance_id)
            check_version(body, previous["version"])
            if not active or model_id != previous["model_id"]:
                state = db.execute("SELECT state FROM statuses WHERE instance_id = ?", (instance_id,)).fetchone()["state"]
                if state != "free":
                    abort(409, "Release the device before deactivating it or changing its model.")
                if db.execute("SELECT 1 FROM migration_issues WHERE legacy_key = ? AND resolved_at IS NULL", (previous["model_id"],)).fetchone():
                    abort(409, "Resolve the previous model's imported assignment first.")
            db.execute("""UPDATE instances SET inventory_id = ?, model_id = ?, location = ?, ip = ?,
                          connection_notes = ?, active = ?, version = version + 1 WHERE id = ?""",
                       (inventory_id, model_id, location, ip, connection_notes, active, instance_id))
        store.bump(db)
    return jsonify(ok=True, id=instance_id), 201 if creating else 200


@app.post("/api/admin/people")
@app.put("/api/admin/people/<person_id>")
def save_person(person_id=None):
    require_admin()
    body = body_json()
    creating = person_id is None
    name = text(body, "name", 120, required=True)
    role = text(body, "role", 10, required=True)
    if role not in {"student", "staff"}:
        abort(400, "Role must be student or staff.")
    active = active_value(body)
    with store.transaction(write=True) as db:
        if creating:
            person_id = new_id()
            db.execute("INSERT INTO people(id, name, name_key, role, active) VALUES (?, ?, ?, ?, ?)",
                       (person_id, name, name_key(name), role, active))
        else:
            previous = get_row(db, "people", person_id)
            check_version(body, previous["version"])
            assigned = db.execute("SELECT 1 FROM statuses WHERE state != 'free' AND (used_by_id = ? OR responsible_id = ?)",
                                  (person_id, person_id)).fetchone()
            if assigned and (not active or role != previous["role"]):
                abort(409, "Release or reassign this person's devices before changing their role or deactivating them.")
            db.execute("UPDATE people SET name = ?, name_key = ?, role = ?, active = ?, version = version + 1 WHERE id = ?",
                       (name, name_key(name), role, active, person_id))
        store.bump(db)
    return jsonify(ok=True, id=person_id), 201 if creating else 200


def selected_person(db, person_id, role=None):
    if not isinstance(person_id, str) or not person_id:
        abort(400, "Select a person from the register.")
    row = get_row(db, "people", person_id)
    if not row["active"] or (role and row["role"] != role):
        abort(400, "Select an active person with the appropriate role.")
    return person_id


def write_status(instance_id, public=False):
    body = body_json()
    with store.transaction(write=True) as db:
        instance = get_row(db, "instances", instance_id)
        model = get_row(db, "models", instance["model_id"])
        if not instance["active"] or not model["active"]:
            abort(409, "This device is inactive.")
        if db.execute("SELECT 1 FROM migration_issues WHERE legacy_key = ? AND resolved_at IS NULL", (instance["model_id"],)).fetchone():
            abort(409, "An imported assignment must be matched to a device by the admin first.")
        previous = db.execute("SELECT * FROM statuses WHERE instance_id = ?", (instance_id,)).fetchone()
        check_version(body, previous["version"])
        check_version(body, instance["version"], "instanceVersion")
        state = body.get("state")
        if not isinstance(state, str) or state not in {"free", "use", "occ"}:
            abort(400, "State must be free, use or occ.")
        if public and not ((previous["state"] == "free" and state == "use") or
                           (previous["state"] == "use" and state == "free")):
            abort(409, "Public booking can only book a free device or release a device in use.")
        used_by = responsible = None
        note = until = ""
        if state != "free":
            note = text(body, "note", 240, required=state == "occ")
            until = text(body, "date", 10)
            if until:
                try:
                    if date.fromisoformat(until).isoformat() != until:
                        raise ValueError()
                except ValueError:
                    abort(400, "End date must use YYYY-MM-DD.")
            responsible_id = body.get("responsibleId")
            if responsible_id:
                responsible = selected_person(db, responsible_id, role="staff")
            elif state == "occ":
                abort(400, "A responsible staff member is required for an occupied device.")
            if state == "use":
                if body.get("usedById") and not public:
                    used_by = selected_person(db, body["usedById"])
                else:
                    name = text(body, "usedByName", 120, required=True)
                    matches = db.execute("SELECT id FROM people WHERE name_key = ? AND role = 'student' AND active = 1", (name_key(name),)).fetchall()
                    if len(matches) > 1:
                        abort(409, "Several students share this name. Ask the admin to select the correct person.")
                    used_by = matches[0]["id"] if matches else new_id()
                    if not matches:
                        db.execute("INSERT INTO people(id, name, name_key, role) VALUES (?, ?, ?, 'student')",
                                   (used_by, name, name_key(name)))
        same_assignment = (previous["state"] == state and previous["used_by_id"] == used_by and
                           previous["responsible_id"] == responsible)
        since = None if state == "free" else previous["since"] if same_assignment and previous["since"] else now_ms()
        db.execute("""UPDATE statuses SET state = ?, used_by_id = ?, responsible_id = ?, note = ?,
                      until_date = ?, since = ?, legacy_person = '', version = version + 1 WHERE instance_id = ?""",
                   (state, used_by, responsible, note, until, since, instance_id))
        store.bump(db)
        result = next(device["status"] for device in store.snapshot(db)["instances"] if device["id"] == instance_id)
    return jsonify(result)


@app.put("/api/status/<instance_id>")
def set_status(instance_id):
    require_admin()
    return write_status(instance_id)


@app.post("/api/instances/<instance_id>/booking")
def public_booking(instance_id):
    if not PUBLIC_EDIT:
        require_admin()
    return write_status(instance_id, public=True)


@app.post("/api/admin/reset")
def reset():
    require_admin()
    body = body_json()
    with store.transaction(write=True) as db:
        revision = int(db.execute("SELECT value FROM metadata WHERE key = 'revision'").fetchone()[0])
        check_version(body, revision, "revision")
        db.execute("""UPDATE statuses SET state = 'free', used_by_id = NULL, responsible_id = NULL,
                      note = '', until_date = '', since = NULL, legacy_person = '', version = version + 1
                      WHERE state != 'free' OR legacy_person != ''""")
        store.bump(db)
    return jsonify(ok=True)


@app.post("/api/admin/migration/<int:issue_id>/resolve")
def resolve_import(issue_id):
    require_admin()
    body = body_json()
    with store.transaction(write=True) as db:
        issue = get_row(db, "migration_issues", issue_id)
        if issue["resolved_at"]:
            abort(409, "This import has already been resolved.")
        resolution = text(body, "resolution", 240)
        instance_id = body.get("instanceId")
        if instance_id:
            instance = get_row(db, "instances", instance_id)
            check_version(body, instance["version"], "instanceVersion")
            previous = db.execute("SELECT * FROM statuses WHERE instance_id = ?", (instance_id,)).fetchone()
            check_version(body, previous["version"])
            if not instance["active"] or previous["state"] != "free":
                abort(409, "Select an active, free device for this imported assignment.")
            known_model = db.execute("SELECT 1 FROM models WHERE id = ?", (issue["legacy_key"],)).fetchone()
            if known_model and instance["model_id"] != issue["legacy_key"]:
                abort(400, "Select a device of the imported model.")
            entry = json.loads(issue["data"])
            if not isinstance(entry, dict) or not isinstance(entry.get("state"), str) or entry["state"] not in {"use", "occ"}:
                abort(400, "This invalid entry must be archived with an explanation.")
            store.import_status(db, instance_id, entry)
        elif not resolution:
            abort(400, "Select a device or explain why the old entry should be archived.")
        db.execute("UPDATE migration_issues SET resolved_at = ?, instance_id = ?, resolution = ? WHERE id = ?",
                   (now_ms(), instance_id, resolution, issue_id))
        store.bump(db)
    return jsonify(ok=True)


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


if __name__ == "__main__":
    if "LAB_DEV_MODE" not in os.environ:
        DEV_MODE = True
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), debug=False)
elif not DEV_MODE and ADMIN_TOKEN == DEFAULT_TOKEN:
    app.logger.warning("Set LAB_ADMIN_TOKEN before using the admin panel in production.")
