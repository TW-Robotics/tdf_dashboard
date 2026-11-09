# Mini Wheeled-Legged Robot Setup Guide

The StackForce Mini Wheeled-Legged Robot is a small self-balancing robot with wheels on adjustable legs, kept in the FLOOR area of the Digital Factory Lab. This guide covers power-up, balancing start, connection check and shutdown.

> **Note:** Lab-specific values (IP, frames, credentials) below are defaults. Check them against the robot before use.

---

## 1. Robot Data & Network Addressing

| Parameter | Value |
| :--- | :--- |
| **Controller** | ESP32 (verify) |
| **Software** | StackForce factory firmware |
| **Actuators** | 2 wheel motors + leg servos (verify count) |
| **Payload / speed** | Not specified – do not load the robot |
| **Robot IP** | `192.168.10.57` (if Wi-Fi is used – verify) |

---

## 2. Safety Checks

> **Warning:** The robot balances actively and can roll away quickly if it falls or loses balance. Hold it upright when switching on, and catch it before switching off.

- Battery charged.
- Wheels and leg joints free.
- Flat, non-slippery floor with at least 1 m free space.

---

## 3. Power-Up Procedure

### 3.1 Start the Controller
1. Hold the robot upright on the floor.
2. Switch on the power.
3. Wait until it balances on its own, then let go slowly.

*Expected result: The robot stands and balances without drifting.*

---

## 4. Network Configuration

Connect with the vendor app/remote as described by StackForce. If Wi-Fi is configured:

```bash
ping -c 3 192.168.10.57
```

---

## 5. Software Installation (Remote PC)

Install the StackForce app or tools from the vendor documentation. For firmware changes: Arduino IDE / PlatformIO with ESP32 support (verify).

---

## 6. Verification & Health Checks

```bash
nc -zv 192.168.10.57 80
```
*Expected output: Connection succeeded (only if the firmware runs a web server – verify).*

---

## 7. Test Script

```python
# minimal reachability test (no motion)
import subprocess
ROBOT_IP = "192.168.10.57"
ok = subprocess.call(["ping", "-c", "3", ROBOT_IP]) == 0
print("Robot reachable" if ok else "Robot NOT reachable")
```

*Expected behavior: Prints `Robot reachable`. Test motion with the vendor remote/app.*

---

## 8. Shutdown

1. Stop all motion and hold the robot upright.
2. Switch off the power while holding it.
3. Lay it down and charge the battery if needed.
4. Release the robot on the Availability tab.

---

## 9. Troubleshooting

| Symptom | What to do |
| :--- | :--- |
| Robot falls over at start | Start on a flat surface; recalibrate the IMU (vendor docs). |
| Oscillates/shakes | Battery low – charge; check wheel and leg screws. |
| No connection | Restart robot and app; check pairing/Wi-Fi settings. |
