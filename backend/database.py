import sqlite3
from datetime import datetime
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "pegboard.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create sessions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            session_id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            total_time REAL,
            avg_time_per_hole REAL,
            slowest_hole INTEGER,
            difficulty_level TEXT
        )
    ''')
    
    # Create hole_events table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS hole_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER,
            hole_id INTEGER,
            time_taken REAL,
            FOREIGN KEY (session_id) REFERENCES sessions (session_id)
        )
    ''')
    
    conn.commit()
    conn.close()

def save_session(session_data):
    """
    session_data: {
        "total_time": float,
        "avg_time": float,
        "slowest_hole": int,
        "difficulty": str,
        "events": [{"hole_id": int, "time_taken": float}, ...]
    }
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Insert session summary
        cursor.execute('''
            INSERT INTO sessions (date, total_time, avg_time_per_hole, slowest_hole, difficulty_level)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            datetime.now().isoformat(),
            session_data["total_time"],
            session_data["avg_time"],
            session_data["slowest_hole"],
            session_data["difficulty"]
        ))
        
        session_id = cursor.lastrowid
        
        # Insert hole events
        for event in session_data["events"]:
            cursor.execute('''
                INSERT INTO hole_events (session_id, hole_id, time_taken)
                VALUES (?, ?, ?)
            ''', (session_id, event["hole_id"], event["time_taken"]))
        
        conn.commit()
        return session_id
    except Exception as e:
        conn.rollback()
        print(f"Error saving session: {e}")
        return None
    finally:
        conn.close()

def get_last_session():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM sessions ORDER BY session_id DESC LIMIT 1')
    row = cursor.fetchone()
    conn.close()
    
    return dict(row) if row else None

def get_all_sessions():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM sessions ORDER BY session_id DESC')
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

# Initialize DB on import
init_db()
