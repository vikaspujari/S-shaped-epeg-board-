import time
import random
from typing import Dict, List, Optional, Tuple
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

try:
    from . import database
except ImportError:
    import database

app = FastAPI(title="Rehabilitation Pegboard Backend")

SHAPE_HOLES = {
    "circle": {"holes": [1, 8], "positions": {1: "left", 8: "right"}},
    "rectangle": {"holes": [2, 7], "positions": {2: "left", 7: "right"}},
    "square": {"holes": [3, 5], "positions": {3: "left", 5: "right"}},
    "triangle": {"holes": [4, 6], "positions": {4: "left", 6: "right"}},
}


def difficulty_from_total_time(total_time: float) -> Tuple[str, str]:
    if total_time < 60:
        return "Hard", "Increase difficulty for the next session"
    if total_time < 90:
        return "Medium", "Keep the current difficulty"
    return "Easy", "Reduce difficulty for the next session"


class GameStateMachine:
    def __init__(self):
        self.remaining_rounds: List[Tuple[str, int, str]] = []
        self.current_shape: Optional[str] = None
        self.current_hole: Optional[int] = None
        self.current_side: Optional[str] = None
        self.shapes_completed = 0
        self.total_rounds = 8
        self.round_start_time = 0.0
        self.wrong_attempts = 0
        self.per_round_stats: List[Dict] = []
        self.state = "IDLE"

    def start_game(self) -> dict:
        rounds: List[Tuple[str, int, str]] = []
        for shape, config in SHAPE_HOLES.items():
            for hole_id in config["holes"]:
                rounds.append((shape, hole_id, config["positions"][hole_id]))

        random.shuffle(rounds)
        self.remaining_rounds = rounds
        self.current_shape = None
        self.current_hole = None
        self.current_side = None
        self.shapes_completed = 0
        self.total_rounds = len(rounds)
        self.round_start_time = 0.0
        self.wrong_attempts = 0
        self.per_round_stats = []
        self.state = "IDLE"
        return self._advance_round()

    def _show_shape_payload(self) -> dict:
        return {
            "type": "show_shape",
            "shape": self.current_shape,
            "target_hole": self.current_hole,
            "side": self.current_side,
            "shapes_completed": self.shapes_completed,
            "total_shapes": self.total_rounds,
        }

    def _advance_round(self) -> dict:
        if not self.remaining_rounds:
            self.state = "GAME_OVER"
            return self._game_over_payload()

        shape, hole_id, side = self.remaining_rounds.pop()
        self.current_shape = shape
        self.current_hole = hole_id
        self.current_side = side
        self.wrong_attempts = 0
        self.round_start_time = time.time()
        self.state = "AWAITING_PEG"
        return self._show_shape_payload()

    def evaluate_peg(self, hole_id: int) -> List[dict]:
        if self.state != "AWAITING_PEG":
            return [{"type": "ignored"}]

        shape = self.current_shape
        side = self.current_side
        expected_hole = self.current_hole

        if hole_id == expected_hole:
            time_taken = time.time() - self.round_start_time
            self.per_round_stats.append({
                "shape": shape,
                "side": side,
                "hole_id": hole_id,
                "time_taken": round(time_taken, 3),
                "wrong_attempts": self.wrong_attempts,
            })
            self.shapes_completed += 1

            peg_result = {
                "type": "peg_result",
                "correct": True,
                "hole_id": hole_id,
                "shape": shape,
                "side": side,
                "shapes_completed": self.shapes_completed,
                "total_shapes": self.total_rounds,
            }

            if not self.remaining_rounds:
                self.state = "GAME_OVER"
                return [peg_result, self._game_over_payload()]

            next_shape = self._advance_round()
            return [peg_result, next_shape]

        self.wrong_attempts += 1
        return [{
            "type": "peg_result",
            "correct": False,
            "hole_id": hole_id,
            "shape": shape,
            "side": side,
            "expected_hole": expected_hole,
            "shapes_completed": self.shapes_completed,
            "total_shapes": self.total_rounds,
        }]

    def _game_over_payload(self) -> dict:
        return {"type": "game_over", "analytics": self.analytics()}

    def analytics(self) -> dict:
        if not self.per_round_stats:
            return {
                "total_rounds": self.total_rounds,
                "per_round": [],
                "total_time": 0.0,
                "avg_time_per_round": 0.0,
                "current_level": "Easy",
                "difficulty_recommendation": "Reduce difficulty for the next session",
                "hardest_shape": None,
                "fastest_round": None,
                "slowest_round": None,
            }

        total_time = sum(round_data["time_taken"] for round_data in self.per_round_stats)
        current_level, difficulty_recommendation = difficulty_from_total_time(total_time)
        wrong_by_shape: Dict[str, int] = {shape: 0 for shape in SHAPE_HOLES}
        for round_data in self.per_round_stats:
            wrong_by_shape[round_data["shape"]] += round_data["wrong_attempts"]

        fastest = min(self.per_round_stats, key=lambda item: item["time_taken"])
        slowest = max(self.per_round_stats, key=lambda item: item["time_taken"])
        hardest_shape = max(wrong_by_shape.items(), key=lambda item: item[1])[0]

        return {
            "total_rounds": self.total_rounds,
            "per_round": self.per_round_stats,
            "total_time": round(total_time, 3),
            "avg_time_per_round": round(total_time / len(self.per_round_stats), 3),
            "current_level": current_level,
            "difficulty_recommendation": difficulty_recommendation,
            "hardest_shape": hardest_shape,
            "fastest_round": {
                "shape": fastest["shape"],
                "side": fastest["side"],
                "time_taken": fastest["time_taken"],
            },
            "slowest_round": {
                "shape": slowest["shape"],
                "side": slowest["side"],
                "time_taken": slowest["time_taken"],
            },
        }

    def database_summary(self) -> dict:
        analytics = self.analytics()
        per_round = analytics["per_round"]
        total_time = sum(round_data["time_taken"] for round_data in per_round)
        slowest_round = max(per_round, key=lambda item: item["time_taken"], default=None)
        return {
            "total_time": round(total_time, 3),
            "avg_time": analytics["avg_time_per_round"],
            "slowest_hole": slowest_round["hole_id"] if slowest_round else 0,
            "difficulty": analytics["current_level"],
            "suggested_difficulty": analytics["difficulty_recommendation"],
            "improvement_vs_last": 0.0,
            "events": per_round,
        }


game = GameStateMachine()


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
        disconnected: List[WebSocket] = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)

        for connection in disconnected:
            self.disconnect(connection)


manager = ConnectionManager()


@app.post("/start")
async def start_game():
    first_payload = game.start_game()
    await manager.broadcast_frontend(first_payload)
    return {
        "status": "started",
        "first_shape": first_payload["shape"],
        "first_side": first_payload["side"],
        "target_hole": first_payload["target_hole"],
    }


@app.websocket("/ws/frontend")
async def websocket_frontend(websocket: WebSocket):
    await manager.connect(websocket, "frontend")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.websocket("/ws/rpi")
async def websocket_rpi(websocket: WebSocket):
    await manager.connect(websocket, "rpi")
    try:
        while True:
            data = await websocket.receive_json()
            await process_rpi_event(data)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as exc:
        print(f"Error in RPi websocket: {exc}")
        manager.disconnect(websocket)


async def process_rpi_event(data: dict):
    hole_id = data.get("hole_id")
    if hole_id is None:
        return

    broadcasts = game.evaluate_peg(int(hole_id))
    for message in broadcasts:
        if message.get("type") == "ignored":
            continue

        await manager.broadcast_frontend(message)

        if message.get("type") == "game_over":
            database.save_session(game.database_summary())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
