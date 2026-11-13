# MiR with UR5

Autonomous mobile robot (AMR) from Mobile Industrial Robots with a Universal Robots UR5 arm mounted on top.

| | |
|---|---|
| **ID** | `mir` |
| **Maker** | Mobile Industrial Robots (MiR) |
| **Type** | Mobile manipulator (AMR + UR5 arm) |
| **Location** | FLOOR |
| **MiR model** | MODEL – check the type plate (e.g. MiR100 / MiR200 / MiR250) |
| **Platform payload** | PAYLOAD (depends on MiR model) |
| **Arm** | UR5 – 6 axes, 5 kg, 850 mm reach, ±0.1 mm repeatability (see [UR5](#doc-ur5)) |
| **Controller** | MiR onboard PC + UR controller (verify) |
| **IP address** | 192.168.10.59 |
| **Software** | MiR Robot software (web interface) + PolyScope on the UR |
| **SDK** | MiR REST API (HTTP, port 80) + URScript / RTDE (port 30004) |

## Software & SDK

- **MiR:** web interface in a browser at the robot's IP. Missions, maps and positions are set up there. The REST API (`http://<ip>/api/v2.0.0/`) allows starting missions from external code; it needs an authorization header generated in the web interface (verify for this software version).
- **UR5:** programmed with PolyScope on the teach pendant; external control via URScript, RTDE, Dashboard server (port 29999) or Modbus TCP.
- Fleet use: MiR Fleet for central management of several robots.

## Getting started

1. Charge the MiR (charging station or cable) and power on both MiR and UR controller.
2. Open the MiR web interface, check the map, localize the robot.
3. Run a short test mission without the arm moving.
4. Only move the arm while the platform is stopped, unless a tested combined program exists.

## Safety

- The MiR has laser scanners and protective fields; never disable or mute them.
- The UR5 is collaborative only after a risk assessment of the full mobile manipulator. Treat the combination as non-collaborative until that is done.
- Secure the arm in a transport pose before driving.

## Open points

- [ ] Exact MiR model, software version and payload
- [ ] UR controller generation (CB3 / e-Series)
- [ ] Mounting / top module and its documentation

## Links

- MiR robots: https://mobile-industrial-robots.com/de/produkte/roboter
- UR5 datasheet: https://www.universal-robots.com/media/50582/ur5_de.pdf
