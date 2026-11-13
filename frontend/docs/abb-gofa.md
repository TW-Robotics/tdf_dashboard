# ABB CRB 15000-5/0.95 (GoFa)

6-axis collaborative robot with a torque sensor in every joint.

| | |
|---|---|
| **ID** | `gofa` |
| **Maker** | ABB |
| **Type** | Collaborative robotic arm (6-axis) |
| **Location** | CELL |
| **Payload** | 5 kg |
| **Reach** | 950 mm |
| **Repeatability** | ±0.05 mm (verify on datasheet) |
| **Max. TCP speed** | 2.2 m/s |
| **Joint sensors** | Torque sensor in each of the 6 joints |
| **Safety** | Category 3, PL d |
| **Controller** | OmniCore C30 |
| **IP address** | 192.168.10.65 |
| **Software** | RobotWare 7 |
| **SDK** | RAPID; Robot Web Services (REST) / EGM |

## Software & SDK

- **FlexPendant apps:** graphical programming and Wizard Easy Programming.
- **Lead-through:** move the arm by hand to teach positions.
- **RobotStudio:** offline programming and simulation, also for connecting to the real controller.
- **RAPID:** ABB's robot language.
- **Robot Web Services (RWS):** REST API over HTTPS for reading data and controlling programs from outside.
- **EGM (Externally Guided Motion):** high-rate external motion control (option).
- Safety settings are configured with **SafeMove** on the FlexPendant.

## Getting started

1. Power on the OmniCore controller and wait for the FlexPendant.
2. Check the tool data (tooldata) and payload (loaddata).
3. Teach with lead-through or Wizard; run in manual reduced speed first.
4. Connect RobotStudio over the management/service port for offline work.

## Safety

- Collaborative only within a risk assessment for the actual task and tool.
- Do not change the SafeMove configuration without the lab responsible.

## Open points

- [ ] RobotWare version and installed options (RWS, EGM)

## Links

- ABB product page: https://new.abb.com/products/robotics/de/roboter/kollaborative-roboter/crb-15000
