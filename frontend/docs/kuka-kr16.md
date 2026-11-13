# KUKA KR 16-2

6-axis industrial robot for medium payloads (KR CYBERTECH family).

| | |
|---|---|
| **ID** | `kr16` |
| **Maker** | KUKA |
| **Type** | Industrial robotic arm (6-axis) |
| **Location** | CELL |
| **Rated payload** | 16 kg (max. 20 kg) |
| **Max. reach** | 1612 mm |
| **Repeatability** | ±0.04 mm (ISO 9283) |
| **Mounting** | Floor, ceiling, wall, any angle |
| **Weight** | approx. 255 kg (without controller) |
| **Controller** | KR C4 (verify – older KR 16-2 units can have KR C2) |
| **Teach pendant** | KUKA smartPAD |
| **IP address** | 192.168.10.62 |
| **Software** | KUKA System Software (KSS) 8.x (verify) |
| **SDK** | KRL; KUKA.EthernetKRL / KUKA.RSI (options – check if licensed) |

> The link in the robot list points to the **KR 16 R1610-2**. Data above is for that model. Check the type plate: an older "KR 16-2" has almost the same values (16 kg, approx. 1611 mm).

### Axis ranges (KR 16 R1610-2)

| Axis | Range |
|---|---|
| A1 | ±185° |
| A2 | −185° / +65° |
| A3 | −138° / +175° |
| A4 | ±350° |
| A5 | ±130° |
| A6 | ±350° |

## Getting started

1. Only trained users may operate the robot. Check the cell's safety fence / door switches.
2. Switch on the KR C4 and wait for the smartPAD to boot.
3. Use mode **T1** (reduced speed, max. 250 mm/s) with the enabling switch for jogging and teaching.
4. Test new programs in T1 step by step before running in AUT.

## Safety

- Industrial robot – **not collaborative.** Nobody inside the cell while it moves in automatic mode.
- Check emergency stop and door interlocks at the start of each session.

## Open points

- [ ] Exact type (KR 16-2 vs. KR 16 R1610-2) and controller from type plate
- [ ] Installed options (EthernetKRL, RSI, SafeOperation)
- [ ] Gripper / tool data

## Links

- myKUKA product page: https://my.kuka.com/s/product/kr-16-r16102/01t58000005QGKBAA4?language=de
- KUKA KR 16 overview: https://www.kuka.com/en-de/products/robot-systems/industrial-robots/kr-16
