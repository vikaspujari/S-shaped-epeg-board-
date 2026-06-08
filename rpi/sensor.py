import asyncio
import json
import sys
import time
from queue import Empty, Queue

import websockets
from gpiozero import Button, Device
from gpiozero.pins.lgpio import LGPIOFactory


Device.pin_factory = LGPIOFactory()

WINDOWS_IP = "10.78.18.13"
RPI_IP = "10.78.18.74"
WS_URL = f"ws://{WINDOWS_IP}:8000/ws/rpi"

# BCM pin: hole_id
PEG_PINS = {
    4: 1,
    17: 2,
    27: 3,
    22: 4,
    23: 5,
    24: 6,
    25: 7,
    5: 8,
}

peg_events = Queue()
buttons = {}
last_sent_by_hole = {}


def queue_event(hole_id, source):
    timestamp = time.time()
    last_sent = last_sent_by_hole.get(hole_id, 0)
    if timestamp - last_sent < 0.25:
        return

    last_sent_by_hole[hole_id] = timestamp
    event = {
        "hole_id": hole_id,
        "timestamp": timestamp,
        "source": source,
    }
    peg_events.put(event)
    print(f"Hole {hole_id} triggered via {source}", flush=True)


def make_callback(hole_id):
    def cb():
        queue_event(hole_id, "gpiozero")

    return cb


for bcm_pin, hole_id in PEG_PINS.items():
    try:
        button = Button(bcm_pin, pull_up=True, bounce_time=0.2)
        button.when_pressed = make_callback(hole_id)
        buttons[bcm_pin] = button
        initial_state = "active" if button.is_pressed else "inactive"
        print(f"OK: hole {hole_id} on BCM {bcm_pin} ({initial_state})", flush=True)
    except Exception as exc:
        print(f"WARN: hole {hole_id} BCM {bcm_pin} skipped: {exc}", flush=True)

if not buttons:
    print("WARN: no GPIO buttons were initialized.", flush=True)
    print("Stop any other peg sender/sensor process using these GPIO pins, then restart this script.", flush=True)
    sys.exit(1)


async def send_events():
    while True:
        try:
            print(f"Connecting to {WS_URL}...")
            async with websockets.connect(WS_URL) as websocket:
                print(f"Connected to {WS_URL}")
                while True:
                    try:
                        event = peg_events.get_nowait()
                    except Empty:
                        await asyncio.sleep(0.03)
                        continue

                    try:
                        await websocket.send(json.dumps(event))
                        print(f"Sent: {event}")
                    except Exception:
                        peg_events.put(event)
                        raise
        except Exception as exc:
            print(f"Connection failed: {exc}. Retrying in 3s...")
            await asyncio.sleep(3)


async def poll_sensors():
    previous_states = {pin: button.is_pressed for pin, button in buttons.items()}
    while True:
        for pin, button in buttons.items():
            is_pressed = button.is_pressed
            if is_pressed != previous_states[pin]:
                state = "active" if is_pressed else "inactive"
                print(f"BCM {pin} / hole {PEG_PINS[pin]} changed to {state}", flush=True)
                if is_pressed:
                    queue_event(PEG_PINS[pin], "poll")
            previous_states[pin] = is_pressed
        await asyncio.sleep(0.05)


async def main():
    await asyncio.gather(send_events(), poll_sensors())


if __name__ == "__main__":
    print("Pegboard Sensor Script Started.")
    print(f"Raspberry Pi IP: {RPI_IP}")
    print(f"Backend WebSocket: {WS_URL}")
    print(f"Monitoring GPIOs: {sorted(PEG_PINS)}")
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Stopped.")
