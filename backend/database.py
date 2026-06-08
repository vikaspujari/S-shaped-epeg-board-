import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "sessions.db")

def _column_exists(cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table})")
    return any(row[1] == column for row in cursor.fetchall())

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
            total_time REAL,
            avg_time_per_hole REAL,
            slowest_hole INTEGER,
            difficulty TEXT,
            suggested_difficulty TEXT,
            improvement_vs_last REAL,
            events TEXT,
            ai_recommendation TEXT
        )
    ''')
    if not _column_exists(c, "sessions", "ai_recommendation"):
        c.execute("ALTER TABLE sessions ADD COLUMN ai_recommendation TEXT")
    conn.commit()
    conn.close()

def save_session(summary: dict) -> int:
    init_db()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        INSERT INTO sessions
        (total_time, avg_time_per_hole, slowest_hole, difficulty, suggested_difficulty, improvement_vs_last, events, ai_recommendation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        summary["total_time"],
        summary["avg_time"],
        summary["slowest_hole"],
        summary["difficulty"],
        summary["suggested_difficulty"],
        summary["improvement_vs_last"],
        json.dumps(summary["events"]),
        summary.get("ai_recommendation")
    ))
    session_id = c.lastrowid
    conn.commit()
    conn.close()
    return session_id

def update_session_ai_recommendation(session_id: int, ai_recommendation: str):
    init_db()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "UPDATE sessions SET ai_recommendation = ? WHERE id = ?",
        (ai_recommendation, session_id)
    )
    conn.commit()
    conn.close()

def get_last_session() -> dict | None:
    init_db()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT * FROM sessions ORDER BY id DESC LIMIT 1')
    row = c.fetchone()
    conn.close()
    if not row:
        return None
    return {
        "id": row[0],
        "timestamp": row[1],
        "total_time": row[2],
        "avg_time_per_hole": row[3],
        "slowest_hole": row[4],
        "difficulty": row[5],
        "suggested_difficulty": row[6],
        "improvement_vs_last": row[7],
        "events": json.loads(row[8]) if row[8] else [],
        "ai_recommendation": row[9] if len(row) > 9 else None
    }
