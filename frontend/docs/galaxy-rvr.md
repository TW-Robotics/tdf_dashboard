# Galaxy RVR Mars Rover Setup Guide

The Galaxy RVR is a six-wheel Mars-rover-style robot from SunFounder, kept in the FLOOR area of the Digital Factory Lab. This guide covers power-up, Wi-Fi connection, app and script tests, and shutdown.

> **Note:** Lab-specific values (IP, frames, credentials) below are defaults. Check them against the robot before use.

---

## 1. Robot Data & Network Addressing

| Parameter | Value |
| :--- | :--- |
| **Controller** | Arduino Uno R3-compatible board + ESP32-CAM (verify) |
| **Software** | SunFounder Galaxy RVR Arduino firmware |
| **Drive** | 6 wheels (rocker-bogie) |
| **Payload / speed** | Not specified – do not load the rover |
| **Robot IP** | `192.168.10.52` (lab Wi-Fi) – AP mode usually `192.168.4.1` |

---

## 2. Safety Checks

> **Warning:** The rover can drive off immediately when it receives commands. Always start it on the floor, never on a desk.

- Battery charged and connected.
- Wheels free of cables and debris.
- Camera module and ESP32-CAM ribbon cable seated.
- Clear driving area of at least 2 × 2 m.

---

## 3. Power-Up Procedure

### 3.1 Start the Controller
1. Place the rover on the floor.
2. Switch on the power switch.
3. Wait for the ESP32-CAM to start (status LED) and the Wi-Fi network/connection to appear.

*Expected result: The rover's Wi-Fi access point is visible, or the rover has joined the lab Wi-Fi.*

---

## 4. Network Configuration

```bash
sudo ip addr add 192.168.10.200/24 dev eth0
ping -c 3 192.168.10.52
```

If the rover runs in AP mode, connect the PC/tablet to the rover's Wi-Fi instead and use `192.168.4.1`.

---

## 5. Software Installation (Remote PC)

- Install the **SunFounder Controller** app (iOS/Android) for manual driving.
- For scripted tests:

```bash
pip install websockets
```

To change the firmware, use the Arduino IDE with the SunFounder Galaxy RVR library.

---

## 6. Verification & Health Checks

```bash
nc -zv 192.168.10.52 8765
```
*Expected output: Connection succeeded.* (Port 8765 is the usual SunFounder Controller WebSocket port – verify.)

---

## 7. Test Script

```python
# minimal connection test – opens the WebSocket used by the SunFounder Controller
import asyncio, websockets

ROBOT_IP = "192.168.10.52"
PORT = 8765  # verify

async def main():
    async with websockets.connect(f"ws://{ROBOT_IP}:{PORT}", open_timeout=5) as ws:
        msg = await asyncio.wait_for(ws.recv(), timeout=5)
        print("Connected, first message:", msg[:200])

asyncio.run(main())
```

*Expected behavior: Prints `Connected` and a status message from the rover. Test driving with the SunFounder Controller app.*

---

## 8. Shutdown

1. Stop the rover in the app and close the app.
2. Switch the power off.
3. Charge the battery if needed (USB-C / charging port).
4. Release the robot on the Availability tab.

---

## 9. Troubleshooting

| Symptom | What to do |
| :--- | :--- |
| Wheels do not turn | Check battery charge and motor cables. |
| No camera image | Reseat the ESP32-CAM ribbon cable; restart. |
| App cannot connect | Make sure the device is on the rover's Wi-Fi / same network. |
| Upload in Arduino IDE fails | Switch the upload/run switch to upload mode (if present) and retry. |
