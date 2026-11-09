# SO-ARM101 Setup Guide

The SO-ARM101 is an open-source 6-axis desktop arm (5 joints + gripper) built with Feetech STS3215 bus servos, mounted on the TABLE in the Digital Factory Lab. This guide covers power-up, USB connection with LeRobot, a servo read test and shutdown.

> **Note:** Lab-specific values (IP, frames, credentials) below are defaults. Check them against the robot before use.

---

## 1. Robot Data & Network Addressing

| Parameter | Value |
| :--- | :--- |
| **Controller** | Feetech STS3215 serial bus servos + USB bus-servo adapter |
| **Software** | LeRobot (Python) |
| **Axes** | 6 (5 joints + gripper), servo IDs 1–6 |
| **Payload / reach** | Small objects only – verify in the SO-ARM101 docs |
| **Robot IP** | None – USB serial to host PC (e.g. `/dev/ttyACM0`) |

---

## 2. Safety Checks

> **Warning:** The arm holds torque once enabled and can snap to a new position. Keep hands out of the workspace while torque is on.

- Base clamped firmly to the table.
- Servo cables connected in a daisy chain, no loose plugs.
- Correct power supply for the servos (verify voltage on the adapter label).
- If a leader arm is used: only the follower moves – keep both arms clear.

---

## 3. Power-Up Procedure

### 3.1 Start the Controller
1. Put the arm in its rest pose.
2. Connect the servo power supply to the adapter board.
3. Connect the adapter to the PC via USB.

*Expected result: A new serial port appears on the PC; the arm stays limp until torque is enabled.*

---

## 4. Network Configuration

No network – USB only.

```bash
python -m lerobot.find_port   # unplug/replug when asked (command name may differ by LeRobot version)
sudo chmod 666 /dev/ttyACM0    # Linux: give access to the port
```

---

## 5. Software Installation (Remote PC)

```bash
pip install lerobot feetech-servo-sdk
```

Run the LeRobot calibration for SO-101 before the first motion task (see LeRobot SO-101 docs).

---

## 6. Verification & Health Checks

```bash
python -m serial.tools.list_ports
```
*Expected output: The USB servo adapter is listed.*

---

## 7. Test Script

```python
# minimal connection test – reads present position of all 6 servos (no motion)
from scservo_sdk import PortHandler, PacketHandler

PORT = "/dev/ttyACM0"   # verify
PRESENT_POSITION = 56   # STS3215 register

port = PortHandler(PORT)
packet = PacketHandler(0)
port.openPort(); port.setBaudRate(1000000)

for sid in range(1, 7):
    pos, res, err = packet.read2ByteTxRx(port, sid, PRESENT_POSITION)
    print(f"Servo {sid}: position={pos} ok={res == 0}")
port.closePort()
```

*Expected behavior: Six lines with positions (0–4095). Move a joint by hand and run again – the value changes.*

---

## 8. Shutdown

1. Move the arm to the rest pose and disable torque.
2. Disconnect USB.
3. Unplug the servo power supply.
4. Release the robot on the Availability tab.

---

## 9. Troubleshooting

| Symptom | What to do |
| :--- | :--- |
| Port not found / permission denied | Check USB cable; `sudo chmod 666 /dev/ttyACM0` or add user to `dialout`. |
| A servo does not answer | Check daisy-chain cable and that servo IDs are unique (1–6). |
| Arm moves to wrong positions | Re-run LeRobot calibration. |
| Servo hot or buzzing | Disable torque, reduce load, check for mechanical blocking. |
