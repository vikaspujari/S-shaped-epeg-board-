# S-Shaped E-Peg Board — Upper Limb Rehabilitation System

> A Raspberry Pi-based smart rehabilitation device that guides stroke and orthopaedic patients through peg-board exercises using real-time sensor feedback and AI coaching.



![Platform](https://img.shields.io/badge/Platform-Raspberry%20Pi%203B%2B-red)




![Backend](https://img.shields.io/badge/Backend-FastAPI%20%2B%20WebSocket-orange)




![Frontend](https://img.shields.io/badge/Frontend-React-61DAFB)




![AI](https://img.shields.io/badge/AI-Gemini%201.5-yellow)




![Accuracy](https://img.shields.io/badge/Sensor%20Accuracy-98.75%25-brightgreen)




![Latency](https://img.shields.io/badge/WebSocket%20Latency-~17ms-blue)



---

## What It Does

The S-Shaped E-Peg Board replaces passive, unmonitored peg-board therapy with an instrumented, AI-guided session. A patient moves magnetic pegs across an S-shaped board; hall-effect sensors beneath each hole detect placement in real time. The system logs every move, classifies exercise difficulty automatically, and delivers voice coaching through a Gemini AI model — all running on a single Raspberry Pi with no cloud dependency for the core loop.

---

## System Architecture
[S-Board + Hall Sensors] ──I2C──▶ [Raspberry Pi 3B+]
│
┌──────────────┼──────────────┐
▼              ▼               ▼
[FastAPI Backend] [HDMI Display] [3.5mm Speaker]
│
┌──────────┴──────────┐
▼                     ▼
[React Dashboard]     [Gemini AI Coach]
(Real-time UI)        (Voice Feedback)
---

## Key Metrics

| Metric | Value |
|---|---|
| Sensor Detection Accuracy | **98.75 %** |
| Mean WebSocket Latency | **~17 ms** |
| Difficulty Classification Accuracy | **100 %** |
| Peg Positions Monitored | **8** |
| Total BOM Cost | **₹ 4,978** |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Hardware | Raspberry Pi 3B+, SS49E Hall-Effect Sensors × 8, TCA9548A I2C Mux, N52 NdFeB Magnets |
| Sensor Client | Python, RPi.GPIO, smbus2 |
| Backend | FastAPI, WebSocket, SQLite, Uvicorn |
| Frontend | React, WebSocket API, Recharts |
| AI Coaching | Google Gemini 1.5 API, gTTS |
| OS | Raspbian Lite |

---

## Repository Structure
S-shaped-epeg-board-/
├── rpi/                  # Raspberry Pi sensor client
│   ├── sensor.py         # Hall-effect polling + WebSocket stream
│   └── requirements.txt
├── backend/              # FastAPI WebSocket server
│   ├── main.py           # WS endpoint, session logic, Gemini integration
│   ├── models.py         # Pydantic schemas
│   └── requirements.txt
├── frontend/             # React dashboard
│   ├── src/
│   │   ├── App.js        # Real-time peg visualisation
│   │   └── components/
│   └── package.json
└── README.md
---

## Quick Start

### 1. Backend (run on laptop or RPi)

cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
### 2. Frontend
cd frontend
npm ci
npm start          # Opens at http://localhost:3000
### 3. Raspberry Pi Sensor Client
cd rpi
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Edit sensor.py → set LAPTOP_IP to your backend machine's IP
python sensor.py
Hardware Setup
Sensors: 8× SS49E linear hall-effect sensors wired to TCA9548A I2C multiplexer (address 0x70)
Multiplexer: Connected to RPi GPIO 2 (SDA) and GPIO 3 (SCL)
Magnets: N52 NdFeB disc magnets (Ø 6 mm) embedded in each peg
Power: 5V / 2.5A MicroUSB adapter → RPi, 3.3V rail via AMS1117 for sensors
Project Context
Final-year capstone project, B.E. Electronics & Instrumentation Engineering,
Ramaiah Institute of Technology, Bengaluru — 2026.
Team: Vikas Pujari · Gagan Deep G · Sumith R · Manjunath R
Guide: Dr. Elavaar Kuzhali S
