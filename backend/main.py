import time
import json
import asyncio
from typing import List, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from . import database

app = FastAPI(title="Rehabilitation Pegboard Backend")

# State Management
class SessionState:
    def __init__(self):
        self.reset()
    
    def reset(self):
        self.start_time = None
        self.last_trigger_time = None
        self.completed_holes = []  # List of {"hole_id": int, "time_taken": float}
        self.is_active = False

session = SessionState()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.rpi_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket, client_type: str):
        await websocket.accept()
        if client_type == "frontend":
            self.active_connections.append(websocket)
        elif client_type == "rpi":
            self.rpi_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.rpi_connections:
            self.rpi_connections.remove(websocket)

    async def broadcast_frontend(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

def calculate_difficulty(avg_time: float) -> str:
    if avg_time > 8:
        return "Easy"
    elif 4 <= avg_time <= 8:
        return "Medium"
    else:
        return "Hard"

def suggest_difficulty(avg_time: float) -> str:
    # Basic logic: if they are doing Hard in < 3s, maybe add more challenge (not applicable here, but following prompt)
    if avg_time < 4:
        return "Expert / More Reps"
    elif avg_time < 8:
        return "Hard"
    else:
        return "Medium"

@app.websocket("/ws/frontend")
async def websocket_frontend(websocket: WebSocket):
    await manager.connect(websocket, "frontend")
    try:
        # Send current state if any?
        while True:
            await websocket.receive_text() # Keep alive
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.websocket("/ws/rpi")
async def websocket_rpi(websocket: WebSocket):
    await manager.connect(websocket, "rpi")
    try:
        while True:
            data = await websocket.receive_json()
            # Expecting {"hole_id": int, "timestamp": float}
            await process_rpi_event(data)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"Error in RPi websocket: {e}")
        manager.disconnect(websocket)

async def process_rpi_event(data: dict):
    global session
    hole_id = data.get("hole_id")
    current_time = data.get("timestamp", time.time())
    
    if not session.is_active:
        session.reset()
        session.is_active = True
        session.start_time = current_time
        session.last_trigger_time = current_time
    
    # Check if hole is already done in this session (avoid double triggers)
    if any(h["hole_id"] == hole_id for h in session.completed_holes):
        return

    time_taken = current_time - session.last_trigger_time
    session.last_trigger_time = current_time
    
    session.completed_holes.append({
        "hole_id": hole_id,
        "time_taken": round(time_taken, 2)
    })
    
    holes_done = len(session.completed_holes)
    total_time_so_far = current_time - session.start_time
    
    # Broadcast live update
    await manager.broadcast_frontend({
        "type": "LIVE_UPDATE",
        "data": {
            "hole_id": hole_id,
            "time_taken": round(time_taken, 2),
            "holes_done": holes_done,
            "total_time": round(total_time_so_far, 2)
        }
    })
    
    # Session Completion
    if holes_done == 8:
        await finalize_session(total_time_so_far)

async def finalize_session(total_time: float):
    avg_time = total_time / 8
    slowest_event = max(session.completed_holes, key=lambda x: x["time_taken"])
    difficulty = calculate_difficulty(avg_time)
    
    # Get last session for improvement
    last_session = database.get_last_session()
    improvement = 0.0
    if last_session and last_session["avg_time_per_hole"]:
        improvement = last_session["avg_time_per_hole"] - avg_time

    session_summary = {
        "total_time": round(total_time, 2),
        "avg_time": round(avg_time, 2),
        "slowest_hole": slowest_event["hole_id"],
        "difficulty": difficulty,
        "suggested_difficulty": suggest_difficulty(avg_time),
        "improvement_vs_last": round(improvement, 2),
        "events": session.completed_holes
    }
    
    # Save to DB
    database.save_session(session_summary)
    
    # Broadcast Post Session Summary
    await manager.broadcast_frontend({
        "type": "SESSION_SUMMARY",
        "data": session_summary
    })
    
    # Reset for next person
    session.reset()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
