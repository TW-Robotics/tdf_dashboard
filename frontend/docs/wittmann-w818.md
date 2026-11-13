# Wittmann W818-2058

Cartesian (linear gantry) CNC robot, typically used for removing parts from injection-moulding machines.

| | |
|---|---|
| **ID** | `w818` |
| **Maker** | WITTMANN |
| **Type** | Cartesian gantry robot (3-axis) |
| **Location** | CELL |
| **Payload** | 6 kg |
| **Axes** | 3 servo main axes (X, Y, Z); optional rotary axes |
| **Z stroke (horizontal)** | 1250–2500 mm (depends on configuration) |
| **X stroke (demoulding)** | 420–620 mm, rigid X axis |
| **Y stroke (vertical)** | 800–1200 mm, single Y axis |
| **Controller** | WITTMANN R8 with TeachBox touch screen (verify – newer units use R9) |
| **IP address** | 192.168.10.63 |
| **Interfaces** | Ethernet, USB (programs), external I/O via bus cable or CAN bus, VNC mirroring of the TeachBox, R8 CLI for ERP connection |
| **Machine interface** | Euromap 67 to the moulding machine (verify) |

> The suffix "-2058" is probably the stroke configuration. Check the exact strokes on the type plate.

## Getting started

1. Switch on the robot together with (or after) the moulding machine.
2. Home all axes from the TeachBox.
3. Teach positions in manual mode at reduced speed.
4. Run new programs in single-step mode first.

## Safety

- The gantry moves fast above the machine. Keep out of the protected area while it is in automatic mode.
- Check the safety guarding and the machine interlock before each session.

## Open points

- [ ] Exact strokes and controller (R8 / R9) from type plate
- [ ] Connected machine and interface (Euromap 67 / 12)

## Links

- Brochure (CNC robots, PDF): https://www.wittmann-group.com/sites/default/files/2020-10/cnc-roboter_deutsch_2020-10_lowres.pdf
