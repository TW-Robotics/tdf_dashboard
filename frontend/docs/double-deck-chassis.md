# Double-Deck Robot Chassis Setup Guide

The BerryBase Double-Deck Robot Chassis is a two-level wheeled platform kept on the BENCH of the Digital Factory Lab, intended as a base for student builds. This guide assumes a Raspberry Pi and a motor driver are fitted; adapt pins and IP to the actual build.

> **Note:** Lab-specific values (IP, frames, credentials) below are defaults. Check them against the robot before use.

---

## 1. Robot Data & Network Addressing

| Parameter | Value |
| :--- | :--- |
| **Controller** | None by default – e.g. Raspberry Pi + L298N / TB6612 motor driver |
| **Software** | Raspberry Pi OS + Python (if fitted) |
| **Drive** | 2 DC gear motors + caster (verify) |
| **Payload / speed** | Not specified |
| **Robot IP** | `192.168.10.54` (Raspberry Pi, if fitted) |

---

## 2. Safety Checks

> **Warning:** Test new wiring with the wheels lifted off the bench – a wrong pin can make the chassis drive off the table.

- Check motor driver wiring and polarity before connecting the battery.
- Use separate supplies (or a proper regulator) for motors and Raspberry Pi.
- Lift the chassis onto a stand for first tests.

---

## 3. Power-Up Procedure

### 3.1 Start the Controller
1. Put the chassis on a stand (wheels free).
2. Connect the motor battery.
3. Power the Raspberry Pi and wait about 1 minute for boot.

*Expected result: The Pi answers to ping/SSH; motors do not move.*

---

## 4. Network Configuration

```bash
sudo ip addr add 192.168.10.200/24 dev eth0
ping -c 3 192.168.10.54
ssh pi@192.168.10.54
```

---

## 5. Software Installation (Raspberry Pi)

```bash
sudo apt install -y python3-gpiozero
```

---

## 6. Verification & Health Checks

```bash
nc -zv 192.168.10.54 22
```
*Expected output: Connection succeeded.*

---

## 7. Test Script

Run on the Raspberry Pi:

```python
# minimal motion test – wheels lifted! adjust GPIO pins to your wiring
from gpiozero import Robot
from time import sleep

bot = Robot(left=(17, 18), right=(22, 23))   # verify pins
bot.forward(0.4); sleep(1)
bot.backward(0.4); sleep(1)
bot.stop()
```

*Expected behavior: Both wheels turn forward for 1 s, backward for 1 s, then stop. If one wheel runs the wrong way, swap that motor's pins.*

---

## 8. Shutdown

1. Stop the motors.
2. `sudo shutdown -h now` on the Pi, wait for the green LED to stop.
3. Disconnect the motor battery.
4. Release the robot on the Availability tab.

---

## 9. Troubleshooting

| Symptom | What to do |
| :--- | :--- |
| Pi reboots when motors start | Motors draw too much current – use a separate motor supply. |
| One wheel does not turn | Check driver wiring and enable pins; swap channels to test. |
| Wheel turns the wrong way | Swap the two motor wires or the two GPIO pins. |
