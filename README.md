# S-Shaped E-Peg Board

This repo has three pieces:

- `backend/`: FastAPI WebSocket backend with SQLite session storage.
- `frontend/`: React app created with Create React App.
- `rpi/`: Raspberry Pi GPIO sensor client that streams peg events to the backend.

## Network Setup

- Laptop/backend IP: `10.172.94.13`
- Raspberry Pi IP: `10.172.94.74`
- Backend WebSocket port: `8000`
- Frontend dev/static port: `3000`

## Backend Setup

From the repo root on Windows:

```powershell
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
backend\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

If you need to recreate the virtual environment:

```powershell
py -3.11 -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

## Frontend Setup

Node.js LTS is required. On this machine Node is installed at `C:\Program Files\nodejs`; if `node` or `npm` is not found, add that directory to `PATH` or run commands with this temporary PATH:

```powershell
$env:PATH = "C:\Program Files\nodejs;$env:PATH"
cd frontend
npm ci
npm start
```

## Raspberry Pi Setup

Run this on the Raspberry Pi, not on Windows:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r rpi/requirements.txt
python rpi/sensor.py
```

Before starting the Pi client, confirm `LAPTOP_IP` in `rpi/sensor.py` still matches the backend machine's local network IP address.
The current configured backend target is `ws://10.172.94.13:8000/ws/rpi`.

