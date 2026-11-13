# Unitree G1 EDU U2 Advanced (29 DoF)

Bipedal humanoid robot for research and teaching, with 7-DoF arms and a 3-DoF waist.

| | |
|---|---|
| **ID** | `g1` |
| **Maker** | Unitree Robotics |
| **Type** | Humanoid robot (bipedal) |
| **Location** | FLOOR |
| **Degrees of freedom** | 29 = legs 2 × 6 + waist 3 + arms 2 × 7 |
| **Hands** | None functional (U2 has no dexterous hands) |
| **Height / weight** | approx. 1.32 m / approx. 35 kg |
| **Max. arm payload** | approx. 3 kg |
| **Compute** | 8-core CPU (motion control) + NVIDIA Jetson Orin NX 16 GB (100 TOPS) for development |
| **Sensors** | 3D LiDAR (Livox MID-360), depth camera (Intel RealSense D435i), 4-mic array, speaker |
| **Battery** | 9000 mAh quick-release, approx. 2 h runtime; charger 54 V / 5 A |
| **Connectivity** | Wi-Fi 6, Bluetooth 5.2, Ethernet |
| **IP address** | 192.168.10.60 (lab network) – internal robot network is usually 192.168.123.x (verify) |
| **SDK** | unitree_sdk2 (C++ / Python, DDS) and ROS 2 (`unitree_ros2`) |

## Software & SDK

- High-level control (walk, stand, gestures) and low-level joint control through **unitree_sdk2**.
- ROS 2 integration via `unitree_ros2`.
- Typical research workflow: train policies in simulation (Isaac Sim / MuJoCo with the G1 URDF), then deploy to the Jetson Orin via unitree_sdk2.
- OTA updates through the Unitree app.

## Getting started

1. Charge and insert the battery; check that the robot is hanging in or next to its lifting frame.
2. Power on and use the handheld controller to stand up and walk in a cleared area.
3. Connect a laptop to the robot by Ethernet to use the SDK; follow the network setup in the Unitree developer docs.
4. Try SDK examples first in high-level mode before using low-level joint control.

## Safety

- The robot can fall. Always keep at least 2 m clearance and a person ready with the remote stop.
- **Low-level control / new code:** run with the robot suspended in its lifting frame (gantry) first.
- Do not leave the robot standing unattended; put it into a safe resting pose and power off.

## Open points

- [ ] Robot-internal IP addresses and lab network bridging
- [ ] Firmware / SDK versions installed

## Links

- Dealer page (G1 Basic): https://terra-robotics.de/products/unitree-g1-basic-humanoider-roboter
- Developer docs: https://support.unitree.com/home/en/G1_developer
- SDK: https://github.com/unitreerobotics/unitree_sdk2
