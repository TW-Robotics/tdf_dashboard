# WAVEGO EX Bionic Dog Setup Guide

The WAVEGO EX is a 12-servo quadruped robot from Waveshare, kept in the FLOOR area of the Digital Factory Lab. This guide covers power-up, Wi-Fi connection, a reachability test and safe shutdown.

> **Note:** Lab-specific values (IP, frames, credentials) below are defaults. Check them against the robot before use.

---

## 1. Robot Data & Network Addressing

| Parameter | Value |
| :--- | :--- |
| **Controller** | ESP32 (verify on the board) |
| **Software** | Waveshare factory firmware with web control |
| **Axes** | 12 (3 servos per leg) |
| **Payload / speed** | Not specified – do not load the robot |
| **Robot IP** | `192.168.10.51` (lab Wi-Fi) – factory AP mode usually `192.168.4.1` |

---

## 2. Safety Checks

> **Warning:** The legs move suddenly on power-up. Place the robot on the floor (never on a table edge) and keep fingers away from the leg joints.

- Check the battery is charged and seated correctly.
- Check all 12 legs/servo horns are tight and nothing is blocking a joint.
- Clear at least 1 m around the robot.
- Have the power switch within reach at all times.

---

## 3. Power-Up Procedure

### 3.1 Start the Controller
1. Place the robot on the floor in its resting (lying) position.
2. Switch the power switch on.
3. Wait until the legs move into the standing/default pose and the display (if fitted) shows the IP address.

*Expected result: The robot stands up and shows its IP address or opens its Wi-Fi access point.*

---

## 4. Network Configuration

The robot is Wi-Fi only. Either join its access point (factory default) or configure it to join the lab Wi-Fi with a reserved IP.

```bash
# Remote PC on the lab network
sudo ip addr add 192.168.10.200/24 dev eth0
ping -c 3 192.168.10.51
```

---

## 5. Software Installation (Remote PC)

No SDK is needed for web control. For scripted tests:

```bash
pip install requests
```

---

## 6. Verification & Health Checks

```bash
nc -zv 192.168.10.51 80
```
*Expected output: Connection succeeded.*

Open `http://192.168.10.51` in a browser – the WAVEGO control page should load.

---

## 7. Test Script

```python
# minimal connection test – checks that the web control page answers
import requests

ROBOT_IP = "192.168.10.51"
r = requests.get(f"http://{ROBOT_IP}/", timeout=5)
print("HTTP status:", r.status_code)
print("Web UI reachable" if r.ok else "Web UI NOT reachable")
```

*Expected behavior: Prints `HTTP status: 200` and `Web UI reachable`. Test motion (e.g. a short forward step) from the web UI, not from a script.*

---

## 8. Shutdown

1. Use the web UI to stop all motion and put the robot into its resting pose.
2. Hold the robot gently and switch the power off.
3. Put the battery on charge if it is low.
4. Release the robot on the Availability tab.

---

## 9. Troubleshooting

| Symptom | What to do |
| :--- | :--- |
| Robot does not stand up | Charge the battery; check that the battery connector is seated. |
| One leg twitches or hangs | Switch off immediately; check the servo cable and servo horn screw. |
| No Wi-Fi / IP not shown | Restart the robot; connect to its access point and reconfigure Wi-Fi. |
| Web UI does not load | Check the PC is on the same network; `ping 192.168.10.51`. |
