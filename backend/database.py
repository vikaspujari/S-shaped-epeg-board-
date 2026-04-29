import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "sessions.db")

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
            events TEXT
        )
    ''')
    conn.commit()
    conn.close()

def save_session(summary: dict):
    init_db()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        INSERT INTO sessions
        (total_time, avg_time_per_hole, slowest_hole, difficulty, suggested_difficulty, improvement_vs_last, events)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        summary["total_time"],
        summary["avg_time"],
        summary["slowest_hole"],
        summary["difficulty"],
        summary["suggested_difficulty"],
        summary["improvement_vs_last"],
        json.dumps(summary["events"])
    ))
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
        "events": json.loads(row[8]) if row[8] else []
    }
