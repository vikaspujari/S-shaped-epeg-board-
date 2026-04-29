import RPi.GPIO as GPIO
import asyncio
import websockets
import json
import time

# --- CONFIGURATION ---
# Network addresses for this setup.
LAPTOP_IP = "10.172.94.13"
RPI_IP = "10.172.94.74"
WS_URL = f"ws://{LAPTOP_IP}:8000/ws/rpi"

# Sensors GPIO pins (BCM numbering)
SENSOR_PINS = [4, 17, 27, 22, 5, 6, 13, 19]

# Mapping GPIO to Hole ID (1 to 8)
PIN_TO_HOLE = {pin: i+1 for i, pin in enumerate(SENSOR_PINS)}

# --- GPIO SETUP ---
GPIO.setmode(GPIO.BCM)
for pin in SENSOR_PINS:
    # Assuming Hall sensors pull low when active (Internal pull-up)
    GPIO.setup(pin, GPIO.IN, pull_up_down=GPIO.PUD_UP)

# Queue for sensor events to be sent via WebSocket
event_queue = asyncio.Queue()

def sensor_callback(pin):
    """Callback for GPIO event detection."""
    # Note: Hall sensors might flicker, add additional checks if needed
    hole_id = PIN_TO_HOLE.get(pin)
    timestamp = time.time()
    
    # Put event in queue for async processing
    # Use call_soon_threadsafe because GPIO callbacks run in separate threads
    loop.call_soon_threadsafe(event_queue.put_nowait, {
        "hole_id": hole_id,
        "timestamp": timestamp
    })

# Add event detection to all pins with 50ms debounce
for pin in SENSOR_PINS:
    # Detect falling edge (sensor triggered / magnet present)
    GPIO.add_event_detect(pin, GPIO.FALLING, callback=sensor_callback, bouncetime=50)

async def send_events():
    """WebSocket client with auto-reconnect."""
    while True:
        try:
            print(f"Connecting to {WS_URL}...")
            async with websockets.connect(WS_URL) as websocket:
                print("Connected to backend!")
                while True:
                    # Wait for an event from the queue
                    event = await event_queue.get()
                    
                    try:
                        # Send to backend
                        await websocket.send(json.dumps(event))
                        print(f"Sent: Hole {event['hole_id']} at {event['timestamp']}")
                        event_queue.task_done()
                    except (websockets.ConnectionClosed, Exception) as e:
                        print(f"Send failed, re-queueing event: {e}")
                        # If send fails, put it back or handle accordingly
                        # For simplicity, we just log and try to reconnect
                        await event_queue.put(event)
                        raise # Break to outer reconnect loop
        except (websockets.ConnectionClosed, ConnectionRefusedError, Exception) as e:
            print(f"WebSocket Error: {e}. Retrying in 5 seconds...")
            await asyncio.sleep(5)

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    try:
        print("Pegboard Sensor Script Started.")
        print(f"Raspberry Pi IP: {RPI_IP}")
        print(f"Monitoring GPIOs: {SENSOR_PINS}")
        loop.run_until_complete(send_events())
    except KeyboardInterrupt:
        print("Shutting down...")
    finally:
        GPIO.cleanup()
        loop.close()

