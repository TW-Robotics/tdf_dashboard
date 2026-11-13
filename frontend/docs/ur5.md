# Universal Robots UR5

6-axis collaborative robot arm.

| | |
|---|---|
| **ID** | `ur5` |
| **Maker** | Universal Robots |
| **Type** | Collaborative robotic arm (6-axis) |
| **Location** | CELL |
| **Payload** | 5 kg |
| **Reach** | 850 mm |
| **Repeatability** | ±0.1 mm |
| **Joint range** | ±360° on all joints |
| **Joint speed** | max. 180°/s; tool approx. 1 m/s |
| **Weight** | 18.4 kg; base Ø149 mm |
| **IP rating** | IP54 |
| **Controller** | UR CB3 (verify; e-Series if UR5e) |
| **I/O (controller)** | 16 DI, 16 DO, 2 AI, 2 AO |
| **I/O (tool)** | 2 DI, 2 DO, 2 AI |
| **Power** | 100–240 VAC, approx. 200 W |
| **IP address** | 192.168.10.64 |
| **Software** | PolyScope (12" touch pendant) |
| **SDK** | URScript, RTDE (port 30004), Dashboard server (port 29999), Modbus TCP |

## Software & SDK

| Port | Use |
|---|---|
| 29999 | Dashboard server (load / play / stop programs) |
| 30001 / 30002 | Primary / secondary interface (send URScript) |
| 30003 | Real-time interface |
| 30004 | RTDE (recommended for data exchange) |
| 502 | Modbus TCP |

Also usable with ROS / ROS 2 (`Universal_Robots_ROS2_Driver`) and Python (`ur_rtde`).

## Getting started

1. Power on the controller, initialize the robot on the pendant (release brakes).
2. Check the payload and TCP settings for the mounted tool.
3. Teach waypoints in PolyScope; run at reduced speed first.
4. For external control: enable remote control on the pendant and connect via RTDE.

## Safety

- 15 configurable safety functions; certified PL d (EN ISO 13849).
- "Collaborative" only within a risk assessment for the actual application and tool. Do not change the safety configuration without the lab responsible.

## Links

- Datasheet (PDF, DE): https://www.universal-robots.com/media/50582/ur5_de.pdf
