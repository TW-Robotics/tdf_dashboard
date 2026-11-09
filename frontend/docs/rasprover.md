# RaspRover (Tracked, with Robotic Arm) Setup Guide

The RaspRover is a tracked Waveshare mobile robot with a robotic arm and an NVIDIA Jetson as host computer, kept in the FLOOR area of the Digital Factory Lab. This guide covers power-up, network access to the Jetson, the web UI and a minimal drive/stop test.

> **Note:** Lab-specific values (IP, frames, credentials) below are defaults. Check them against the robot before use.

---

## 1. Robot Data & Network Addressing

| Parameter | Value |
| :--- | :--- |
| **Controller** | NVIDIA Jetson (host) + ESP32 general driver board (motors, arm) |
| **Software** | Ubuntu / JetPack + Waveshare UGV application |
| **Arm** | 4-axis arm (verify model and payload on the arm label) |
| **Payload / speed** | Verify in the Waveshare spec sheet – do not exceed |
| **Robot IP** | `192.168.10.53` (Jetson) |
| **Login** | `jetson` / lab password (verify) |

---

## 2. Safety Checks

> **Warning:** Tracks and arm move as soon as commands arrive. Keep the arm folded while driving and keep hands clear of the gripper.

- Battery pack charged (check voltage on the display, if fitted).
- Tracks tensioned, nothing caught in them.
- Arm in folded/home position before power-up.
- Clear driving area of at least 2 × 2 m.

---

## 3. Power-Up Procedure

### 3.1 Start the Controller
1. Place the robot on the floor with the arm folded.
2. Switch on the main power switch.
3. Wait 1–2 minutes for the Jetson to boot; the OLED (if fitted) shows the IP address.

*Expected result: OLED shows the IP; the Jetson answers to ping and SSH.*

---

## 4. Network Configuration

```bash
sudo ip addr add 192.168.10.200/24 dev eth0
ping -c 3 192.168.10.53
ssh jetson@192.168.10.53
```

---

## 5. Software Installation (Remote PC)

Nothing is required for the web UI. For scripted tests over SSH:

```bash
pip install paramiko
```

On the Jetson (normally pre-installed):

```bash
pip install pyserial
```

---

## 6. Verification & Health Checks

```bash
nc -zv 192.168.10.53 22     # SSH
nc -zv 192.168.10.53 5000   # Waveshare web UI (verify)
nc -zv 192.168.10.53 8888   # JupyterLab (verify)
```
*Expected output: Connection succeeded.*

---

## 7. Test Script

Run on the Jetson (stop the Waveshare app first so the serial port is free):

```python
# minimal motion test – short slow forward motion, then stop
import serial, json, time

PORT = "/dev/ttyTHS0"   # verify: UART between Jetson and ESP32
ser = serial.Serial(PORT, 115200, timeout=1)

def send(cmd):
    ser.write((json.dumps(cmd) + "\n").encode())

send({"T": 1, "L": 0.1, "R": 0.1})   # both tracks slow forward
time.sleep(1.0)
send({"T": 1, "L": 0, "R": 0})       # stop
print(ser.read_all().decode(errors="ignore"))
```

*Expected behavior: The robot drives forward slowly for about 1 s and stops. If the JSON format differs, check the Waveshare JSON command list for your firmware.*

---

## 8. Shutdown

1. Stop all motion and fold the arm.
2. Shut down the Jetson cleanly: `sudo shutdown -h now`.
3. Wait until the Jetson is off, then switch off the main power.
4. Charge the battery if needed.
5. Release the robot on the Availability tab.

---

## 9. Troubleshooting

| Symptom | What to do |
| :--- | :--- |
| No IP on the OLED | Wait longer; connect HDMI/keyboard and check Wi-Fi. |
| Serial port busy | Stop the Waveshare app/service before running your own script. |
| Tracks do not move | Check battery voltage and the ESP32 board power. |
| Arm jerks or stalls | Stop, fold the arm manually with power off, check cables. |
