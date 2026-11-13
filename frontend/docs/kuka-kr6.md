# KUKA KR 6 R900 sixx (KR AGILUS)

Small, fast 6-axis industrial robot from the KR AGILUS family.

| | |
|---|---|
| **ID** | `kr6` |
| **Maker** | KUKA |
| **Type** | Industrial robotic arm (6-axis) |
| **Location** | CELL |
| **Max. payload** | 6 kg |
| **Max. reach** | 901 mm |
| **Repeatability** | ±0.03 mm (ISO 9283) |
| **Mounting** | Floor, ceiling, wall |
| **Footprint** | 320 × 320 mm |
| **Weight** | approx. 52 kg |
| **Ambient temperature** | +5 °C to +45 °C |
| **Controller** | KR C4 compact |
| **Teach pendant** | KUKA smartPAD |
| **IP address** | 192.168.10.66 |
| **Software** | KUKA System Software 8.x (verify) |
| **SDK** | KRL; KUKA.EthernetKRL / KUKA.RSI (options – check if licensed) |

The arm has an integrated energy supply (air lines and signals through the arm) for grippers.

## Getting started

1. Check the cell guarding and emergency stop.
2. Switch on the KR C4 compact and wait for the smartPAD.
3. Jog and teach in **T1** (max. 250 mm/s) with the enabling switch.
4. Test new programs step by step in T1 before AUT.

## Safety

- Industrial robot – **not collaborative.** Very fast in automatic mode. Nobody inside the cell while it moves.

## Open points

- [ ] KSS version and installed options
- [ ] Gripper / tool data

## Links

- myKUKA product page: https://my.kuka.com/s/product/kr-6-r900-sixx/01t58000003eVQqAAM?language=de
