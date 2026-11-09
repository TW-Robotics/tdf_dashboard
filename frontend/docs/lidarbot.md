# LiDAR Bot AGV with Mecanum Wheels Setup Guide

The M5Stack LiDAR Bot is a small mecanum-wheel AGV with a 360° LiDAR and an M5Stack Core (ESP32) controller, kept in the FLOOR area of the Digital Factory Lab. This guide covers power-up, USB connection, a LiDAR data check and shutdown.

> **Note:** Lab-specific values (IP, frames, credentials) below are defaults. Check them against the robot before use.

---

## 1. Robot Data & Network Addressing

| Parameter | Value |
| :--- | :--- |
| **Controller** | M5Stack Core (ESP32) |
| **Software** | M5Stack LidarBot firmware (Arduino) / UIFlow |
| **Drive** | 4 mecanum wheels (omnidirectional) |
| **Sensor** | 360° LiDAR |
| **Payload / speed** | Not specified |
| **Robot IP** | `192.168.10.55` – only with custom Wi-Fi firmware; default is USB / ESP-NOW remote |

---

## 2. Safety Checks

> **Warning:** Mecanum wheels can move sideways – keep the area around the robot clear in all directions, not only in front.

- Battery charged.
- LiDAR rotor free to spin, lens clean.
- Wheels free of hair and debris.

---

## 3. Power-Up Procedure

### 3.1 Start the Controller
1. Place the robot on the floor.
2. Press the power button on the M5Stack Core.
3. Wait until the screen shows the LiDAR map/status.

*Expected result: The LiDAR spins and the screen shows scan points.*

---

## 4. Network Configuration

Default connection is USB-C to the M5Stack Core:

```bash
ls /dev/ttyUSB* /dev/ttyACM*
```

With custom Wi-Fi firmware:

```bash
ping -c 3 192.168.10.55
```

---

## 5. Software Installation (Remote PC)

```bash
pip install pyserial
```

For firmware changes: Arduino IDE with the M5Stack board package, or UIFlow.

---

## 6. Verification & Health Checks

```bash
python -m serial.tools.list_ports
```
*Expected output: A CP210x / CH9102 USB serial device is listed.*

---

## 7. Test Script

```python
# minimal connection test – reads serial output from the M5Stack Core
import serial, time

PORT = "/dev/ttyUSB0"   # verify (COMx on Windows)
with serial.Serial(PORT, 115200, timeout=1) as ser:
    t0 = time.time()
    while time.time() - t0 < 5:
        line = ser.readline().decode(errors="ignore").strip()
        if line:
            print(line)
```

*Expected behavior: Debug/status lines from the firmware are printed. Test driving with the M5Stack remote controller (ESP-NOW).*

---

## 8. Shutdown

1. Stop driving.
2. Double-press the power button on the M5Stack Core (or hold until off).
3. Charge if needed.
4. Release the robot on the Availability tab.

---

## 9. Troubleshooting

| Symptom | What to do |
| :--- | :--- |
| LiDAR does not spin | Check the LiDAR cable; restart the robot. |
| Robot drifts sideways | Check that all mecanum wheels are mounted in the correct orientation (X pattern). |
| No serial port on PC | Install the CP210x/CH9102 USB driver; try another cable. |
| Remote has no control | Re-pair the remote (see M5Stack docs). |
