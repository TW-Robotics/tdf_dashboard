# Robotis Dynamixel Hexapod MKII

Six-legged walking robot built from DYNAMIXEL servos (Interbotix PhantomX hexapod family).

| | |
|---|---|
| **ID** | `hexapod` |
| **Maker** | Interbotix / ROBOTIS |
| **Type** | Legged robot (hexapod) |
| **Location** | FLOOR |
| **Joints** | 18 (3 per leg) |
| **Servos** | DYNAMIXEL AX-12A (standard) or AX-18A (faster) – check which are fitted |
| **Controller** | ArbotiX-M Robocontroller (Arduino-compatible) |
| **Battery** | LiPo, 4500 mAh (bottom-loading tray) |
| **Frame** | Aluminium servo brackets and body plates; top deck for arm / camera / computer |
| **Payload** | PAYLOAD |
| **IP address** | 192.168.10.56 (only if a networked computer is mounted on the top deck) |

> The manufacturer page now describes the **Mark III**. This lab unit is labelled **MKII** – servo type and controller may differ slightly. Check before ordering spare parts.

## Software & SDK

- Firmware: open-source Interbotix hexapod firmware with an inverse-kinematics gait engine (six walking gaits).
- Programming: Arduino IDE with the ArbotiX libraries; servo bus uses DYNAMIXEL Protocol 1.0.
- Remote control: wireless via XBee (ArbotiX Commander handheld or PC).

## Getting started

1. Charge the LiPo with a balance charger only; never leave it charging unattended.
2. Place the robot on a stand (legs free) before power-on so it cannot walk off the table.
3. Power on, pair the XBee Commander, and test standing and walking at low speed on the floor.
4. To reflash: connect the ArbotiX via FTDI cable and upload from the Arduino IDE.

## Safety

- Servos can pinch fingers between leg links. Keep hands clear while powered.
- Disconnect the battery after use; store LiPo batteries in a fire-safe bag.

## Open points

- [ ] Confirm servo type (AX-12A / AX-18A) and controller revision
- [ ] Payload of the top deck

## Links

- Manufacturer: https://www.interbotix.com/Robotic-Hexapod
