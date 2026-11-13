# FANUC M-6iB

6-axis industrial robot for handling and arc welding (older FANUC generation).

| | |
|---|---|
| **ID** | `m6ib` |
| **Maker** | FANUC |
| **Type** | Industrial robotic arm (6-axis) |
| **Location** | CELL |
| **Payload** | 6 kg |
| **Reach** | 1373 mm |
| **Repeatability** | ±0.08 mm |
| **Weight** | approx. 138 kg |
| **Controller** | R-30iA (verify – could also be R-J3iC) |
| **Teach pendant** | iPendant / teach pendant |
| **IP address** | 192.168.10.67 |
| **Software** | HandlingTool (verify) |
| **SDK** | TP programs / KAREL; socket messaging and PC interface (options – check if licensed) |

## Getting started

1. Check the cell guarding and emergency stop.
2. Power on the controller; check that no alarms are active (reset if needed).
3. Jog and teach in **T1** (max. 250 mm/s) with the deadman switch.
4. Run new programs in step mode first.

## Safety

- Industrial robot – **not collaborative.** Nobody inside the cell while it moves in AUTO.
- Older controller: check that the batteries for the encoder data are changed regularly (otherwise mastering is lost).

## Open points

- [ ] Controller generation and software options
- [ ] Encoder battery change date

## Links

- RoboDK model and specs: https://robodk.com/robot/de/Fanuc/M-6iB
