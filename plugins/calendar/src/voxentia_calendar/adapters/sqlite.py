import os
import sqlite3
from typing import Any, Dict, List


class SQLiteCalendarAdapter:
    def __init__(self, db_path: str = "data/calendar.db"):
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS events (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    start_time TEXT NOT NULL,
                    end_time TEXT NOT NULL,
                    location TEXT,
                    user_id TEXT
                )
            """)
            conn.commit()

    def get_events(self, limit: int = 50) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM events ORDER BY start_time ASC LIMIT ?", (limit,))
            return [dict(row) for row in cursor.fetchall()]

    def add_event(self, event_data: Dict[str, Any]):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO events (id, title, start_time, end_time, location, user_id)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                event_data.get("id"),
                event_data.get("title"),
                event_data.get("start_time"),
                event_data.get("end_time"),
                event_data.get("location"),
                event_data.get("user_id", "default")
            ))
            conn.commit()
