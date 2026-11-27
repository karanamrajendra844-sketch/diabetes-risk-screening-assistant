"""
Database management module with Fernet field-level encryption, parameterized SQLite queries,
consent verification before persistence, and complete account/data deletion.
"""

from __future__ import annotations

import json
import os
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

from cryptography.fernet import Fernet

DB_PATH = Path(os.getenv("SCREENING_DB_PATH", Path(__file__).resolve().parent.parent / "data" / "screening.db"))


def _get_cipher() -> Fernet:
    key = os.getenv("DATA_ENCRYPTION_KEY")
    if key:
        return Fernet(key.encode("utf-8"))
    # Persistent local key file for development only (set DATA_ENCRYPTION_KEY in production)
    key_file = DB_PATH.parent / ".dev_fernet.key"
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if key_file.exists():
        return Fernet(key_file.read_bytes().strip())
    generated = Fernet.generate_key()
    key_file.write_bytes(generated)
    os.chmod(key_file, 0o600)
    return Fernet(generated)


class DatabaseManager:
    def __init__(self, db_path: Path = DB_PATH) -> None:
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.cipher = _get_cipher()
        self._init_schema()

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def _init_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    uid TEXT PRIMARY KEY,
                    encrypted_contact TEXT NOT NULL,
                    password_hash TEXT,
                    save_history_consent INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL
                );
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS screenings (
                    id TEXT PRIMARY KEY,
                    uid TEXT NOT NULL,
                    encrypted_payload TEXT NOT NULL,
                    risk_category TEXT NOT NULL,
                    model_name TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (uid) REFERENCES users(uid) ON DELETE CASCADE
                );
                """
            )

    def upsert_user_consent(self, uid: str, contact: str, consent: bool) -> None:
        encrypted_contact = self.cipher.encrypt(contact.encode("utf-8")).decode("utf-8")
        now = datetime.now(timezone.utc).isoformat()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO users (uid, encrypted_contact, save_history_consent, created_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(uid) DO UPDATE SET
                    encrypted_contact = excluded.encrypted_contact,
                    save_history_consent = excluded.save_history_consent;
                """,
                (uid, encrypted_contact, 1 if consent else 0, now),
            )

    def save_screening(self, uid: str, payload: dict[str, Any]) -> str | None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT save_history_consent FROM users WHERE uid = ?",
                (uid,),
            ).fetchone()
            if row is None or int(row["save_history_consent"]) != 1:
                return None

            screening_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            encrypted_payload = self.cipher.encrypt(json.dumps(payload).encode("utf-8")).decode("utf-8")
            conn.execute(
                """
                INSERT INTO screenings (id, uid, encrypted_payload, risk_category, model_name, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    screening_id,
                    uid,
                    encrypted_payload,
                    payload["riskCategory"],
                    payload["modelName"],
                    now,
                ),
            )
            return screening_id

    def get_user_history(self, uid: str) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT id, encrypted_payload, created_at FROM screenings WHERE uid = ? ORDER BY created_at DESC",
                (uid,),
            ).fetchall()
            results: list[dict[str, Any]] = []
            for row in rows:
                decrypted = json.loads(self.cipher.decrypt(row["encrypted_payload"].encode("utf-8")).decode("utf-8"))
                decrypted["id"] = row["id"]
                decrypted["createdAt"] = row["created_at"]
                results.append(decrypted)
            return results

    def delete_user_and_data(self, uid: str) -> None:
        with self._connect() as conn:
            conn.execute("DELETE FROM screenings WHERE uid = ?", (uid,))
            conn.execute("DELETE FROM users WHERE uid = ?", (uid,))
