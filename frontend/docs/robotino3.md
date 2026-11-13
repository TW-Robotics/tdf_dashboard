# Festo Robotino 3

Educational mobile robot with a holonomic (omnidirectional) drive using three omni-wheels.

| | |
|---|---|
| **ID** | `robotino3` |
| **Maker** | Festo (Festo Didactic) |
| **Type** | Educational robot (holonomic, omni-wheels) |
| **Location** | FLOOR |
| **Payload** | approx. 30 kg (verify on type plate) |
| **Own weight** | approx. 20 kg |
| **Controller** | Embedded PC (Intel Core i5), Linux |
| **Sensors** | Distance sensors, odometry, gyroscope; optional laser scanner, 3D / USB camera |
| **IP address** | 192.168.10.61 |
| **Software** | Robotino OS + Robotino View (graphical programming) |
| **SDK** | Robotino REST API / API2 (C++, Python) / ROS (verify) |

## Software & SDK

- **Robotino View:** graphical programming on a PC, connects over Wi-Fi or Ethernet.
- **API2:** C++ / Python / other language bindings to the robot's sensors and drives.
- **REST API:** HTTP access to sensor and drive data on newer software versions (verify).
- **ROS:** supported for navigation and research use.

## Getting started

1. Charge the batteries, power on, wait for the robot to boot.
2. Connect to the Robotino's Wi-Fi access point or the lab network.
3. Open Robotino View, enter the IP, and test driving in manual mode.
4. Use the API or ROS once manual driving works.

## Safety

- Drive only on the floor with the bumper working. Never on tables.
- Check the bumper / emergency stop before each session.

## Open points

- [ ] Installed sensors (laser scanner? camera?) and software version
- [ ] Network: own access point or lab network

## Links

- Festo Didactic product page: _to be added_
- Reference specs (FAU FAPS lab): https://www.faps.tf.fau.de/2017/06/27/mobile-roboterplattform-robotino3/
