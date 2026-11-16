"""SQLite storage and one-time import of the former JSON status file."""
import json
import shutil
import sqlite3
import time
import unicodedata
import uuid
from contextlib import contextmanager
from pathlib import Path

SCHEMA_VERSION = 1
DEMO_NOTES = {
    "kr6": "Pick-and-place exercise",
    "fr3": "Force control tests",
    "tb3": "TCP/IP motion test",
}
SCHEMA = """
CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY, data TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
    version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS people (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, name_key TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('student', 'staff')),
    active INTEGER NOT NULL DEFAULT 1, version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS people_names ON people(name_key, role);
CREATE TABLE IF NOT EXISTS instances (
    id TEXT PRIMARY KEY, inventory_id TEXT NOT NULL UNIQUE,
    model_id TEXT NOT NULL REFERENCES models(id), location TEXT NOT NULL DEFAULT '',
    ip TEXT NOT NULL DEFAULT '', connection_notes TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1, version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS statuses (
    instance_id TEXT PRIMARY KEY REFERENCES instances(id),
    state TEXT NOT NULL DEFAULT 'free' CHECK(state IN ('free', 'use', 'occ')),
    used_by_id TEXT REFERENCES people(id), responsible_id TEXT REFERENCES people(id),
    note TEXT NOT NULL DEFAULT '', until_date TEXT NOT NULL DEFAULT '',
    since INTEGER, legacy_person TEXT NOT NULL DEFAULT '', version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS migration_issues (
    id INTEGER PRIMARY KEY, legacy_key TEXT NOT NULL, data TEXT NOT NULL,
    reason TEXT NOT NULL, resolved_at INTEGER, instance_id TEXT REFERENCES instances(id),
    resolution TEXT NOT NULL DEFAULT ''
);
"""


def now_ms():
    return int(time.time() * 1000)


def new_id():
    return uuid.uuid4().hex


def name_key(name):
    return " ".join(unicodedata.normalize("NFKC", name).casefold().split())


class Store:
    def __init__(self, path, legacy_path, seed_path):
        self.path = Path(path)
        self.legacy_path = Path(legacy_path)
        self.seed_path = Path(seed_path)

    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA foreign_keys = ON")
        db.execute("PRAGMA busy_timeout = 10000")
        return db

    @contextmanager
    def transaction(self, write=False):
        db = self.connect()
        try:
            db.execute("BEGIN IMMEDIATE" if write else "BEGIN")
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def initialize(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        db = self.connect()
        try:
            db.execute("PRAGMA journal_mode = WAL")
            version = db.execute("PRAGMA user_version").fetchone()[0]
            if version > SCHEMA_VERSION:
                raise RuntimeError("This database requires a newer application version.")
            db.executescript(SCHEMA)
        finally:
            db.close()
        with self.transaction(write=True) as db:
            if db.execute("SELECT 1 FROM metadata WHERE key = 'initialized'").fetchone():
                if self._archive_demo_entries(db):
                    self.bump(db)
                return
            # An unreadable source must never become an apparently free lab.
            legacy = None
            if self.legacy_path.exists():
                legacy = json.loads(self.legacy_path.read_text(encoding="utf-8"))
                if not isinstance(legacy, dict):
                    raise ValueError("The legacy status file must contain an object.")
                backup = self.legacy_path.with_name(
                    self.legacy_path.stem + ".pre-sqlite-" + str(now_ms()) + ".json")
                shutil.copy2(self.legacy_path, backup)
                db.execute("INSERT INTO metadata VALUES ('legacyBackup', ?)", (str(backup),))
            seed = json.loads(self.seed_path.read_text(encoding="utf-8"))
            for model in seed["models"]:
                db.execute("INSERT INTO models(id, data) VALUES (?, ?)",
                           (model["id"], json.dumps(model, ensure_ascii=False)))
                for number in range(1, seed["instanceCounts"].get(model["id"], 1) + 1):
                    instance_id = new_id()
                    # Additional devices have no confirmed network address yet.
                    db.execute(
                        "INSERT INTO instances(id, inventory_id, model_id, location, ip) VALUES (?, ?, ?, ?, ?)",
                        (instance_id, f'{model["id"].upper()}-{number:03d}', model["id"],
                         model.get("cell", ""), model.get("ip", "") if number == 1 else ""))
                    db.execute("INSERT INTO statuses(instance_id) VALUES (?)", (instance_id,))
            for name in seed["staff"]:
                db.execute("INSERT INTO people(id, name, name_key, role) VALUES (?, ?, ?, 'staff')",
                           (new_id(), name, name_key(name)))
            if legacy is not None:
                self._import_legacy(db, legacy)
            # status.seed.json contains demo names, not live assignments.
            db.execute("INSERT INTO metadata VALUES ('revision', '1')")
            db.execute("INSERT INTO metadata VALUES ('initialized', '1')")
            db.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")

    def _import_legacy(self, db, entries):
        for key, value in entries.items():
            if self._is_demo_entry(key, value):
                continue
            devices = db.execute("SELECT id FROM instances WHERE model_id = ?", (key,)).fetchall()
            valid = (isinstance(value, dict) and isinstance(value.get("state"), str)
                     and value["state"] in {"free", "use", "occ"})
            if valid and value["state"] == "free":
                continue
            if valid and len(devices) == 1:
                self.import_status(db, devices[0]["id"], value)
            else:
                reason = ("Invalid legacy status" if not valid else
                          "Multiple devices: select the device used" if devices else
                          "Model is no longer in the catalogue")
                db.execute("INSERT INTO migration_issues(legacy_key, data, reason) VALUES (?, ?, ?)",
                           (str(key), json.dumps(value, ensure_ascii=False), reason))

    @staticmethod
    def _is_demo_entry(model_id, entry):
        # Match only the original bundled example, including its exact note.
        # A changed name, date, note or any additional field is preserved.
        return (
            model_id in DEMO_NOTES
            and isinstance(entry, dict)
            and set(entry) <= {"state", "person", "note", "since", "date"}
            and entry.get("state") == "use"
            and entry.get("person") == "Person XYZ"
            and entry.get("note") == DEMO_NOTES[model_id]
            and entry.get("date", "") == ""
        )

    def _archive_demo_entries(self, db):
        """Retire demo bookings imported by the first SQLite release, once."""
        changed = False
        resolution = "Archived original Person XYZ demo assignment automatically."
        for issue in list(db.execute(
                "SELECT id, legacy_key, data FROM migration_issues WHERE resolved_at IS NULL")):
            try:
                entry = json.loads(issue["data"])
            except json.JSONDecodeError:
                continue
            if self._is_demo_entry(issue["legacy_key"], entry):
                db.execute("UPDATE migration_issues SET resolved_at = ?, resolution = ? WHERE id = ?",
                           (now_ms(), resolution, issue["id"]))
                changed = True
        rows = db.execute("""
            SELECT s.*, i.model_id FROM statuses s JOIN instances i ON i.id = s.instance_id
            WHERE s.legacy_person = 'Person XYZ' AND s.used_by_id IS NULL AND s.responsible_id IS NULL
        """)
        for row in list(rows):
            entry = {"state": row["state"], "person": row["legacy_person"], "note": row["note"],
                     "since": row["since"], "date": row["until_date"]}
            if not self._is_demo_entry(row["model_id"], entry):
                continue
            db.execute("""INSERT INTO migration_issues
                          (legacy_key, data, reason, resolved_at, instance_id, resolution)
                          VALUES (?, ?, ?, ?, ?, ?)""",
                       (row["model_id"], json.dumps(entry, ensure_ascii=False), "Original demo assignment",
                        now_ms(), row["instance_id"], resolution))
            db.execute("""UPDATE statuses SET state = 'free', used_by_id = NULL, responsible_id = NULL,
                          note = '', until_date = '', since = NULL, legacy_person = '', version = version + 1
                          WHERE instance_id = ?""", (row["instance_id"],))
            changed = True
        return changed

    @staticmethod
    def import_status(db, instance_id, entry):
        since = entry.get("since")
        if not isinstance(since, int) or isinstance(since, bool) or since <= 0:
            since = now_ms()
        db.execute(
            """UPDATE statuses SET state = ?, legacy_person = ?, note = ?,
               until_date = ?, since = ?, version = version + 1 WHERE instance_id = ?""",
            (entry["state"], str(entry.get("person") or ""), str(entry.get("note") or ""),
             str(entry.get("date") or ""), since, instance_id))

    @staticmethod
    def bump(db):
        db.execute("UPDATE metadata SET value = CAST(value AS INTEGER) + 1 WHERE key = 'revision'")

    @staticmethod
    def person(row):
        return {"id": row["id"], "name": row["name"], "role": row["role"],
                "active": bool(row["active"]), "version": row["version"]}

    def snapshot(self, db, admin=False):
        models = []
        for row in db.execute("SELECT * FROM models ORDER BY rowid"):
            if admin or row["active"]:
                models.append({**json.loads(row["data"]), "id": row["id"],
                               "active": bool(row["active"]), "version": row["version"]})
        issues = [dict(row) for row in db.execute(
            "SELECT * FROM migration_issues WHERE resolved_at IS NULL ORDER BY id")]
        pending_models = {issue["legacy_key"] for issue in issues}
        instances = []
        rows = db.execute("""
            SELECT i.*, s.state, s.used_by_id, s.responsible_id, s.note, s.until_date,
                   s.since, s.legacy_person, s.version AS status_version,
                   u.name AS used_by_name, r.name AS responsible_name, m.active AS model_active
            FROM instances i JOIN statuses s ON s.instance_id = i.id
            JOIN models m ON m.id = i.model_id
            LEFT JOIN people u ON u.id = s.used_by_id
            LEFT JOIN people r ON r.id = s.responsible_id
            ORDER BY i.inventory_id
        """)
        for row in rows:
            if not admin and (not row["active"] or not row["model_active"]):
                continue
            instances.append({
                "id": row["id"], "inventoryId": row["inventory_id"], "modelId": row["model_id"],
                "location": row["location"], "ip": row["ip"], "connectionNotes": row["connection_notes"],
                "active": bool(row["active"]), "version": row["version"],
                "migrationPending": row["model_id"] in pending_models,
                "status": {
                    "state": row["state"], "version": row["status_version"],
                    "usedById": row["used_by_id"], "usedByName": row["used_by_name"] or "",
                    "responsibleId": row["responsible_id"], "responsibleName": row["responsible_name"] or "",
                    "note": row["note"], "date": row["until_date"], "since": row["since"],
                    "legacyPerson": row["legacy_person"],
                    "needsReview": bool(row["legacy_person"] or
                                        (row["state"] == "use" and not row["used_by_id"]) or
                                        (row["state"] == "occ" and (not row["responsible_id"] or not row["note"])))}})
        result = {
            "revision": int(db.execute("SELECT value FROM metadata WHERE key = 'revision'").fetchone()[0]),
            "models": models, "instances": instances}
        if admin:
            result["people"] = [self.person(row) for row in db.execute("SELECT * FROM people ORDER BY name")]
            result["migrationIssues"] = [
                {"id": issue["id"], "modelId": issue["legacy_key"], "data": json.loads(issue["data"]),
                 "reason": issue["reason"]} for issue in issues]
        return result
