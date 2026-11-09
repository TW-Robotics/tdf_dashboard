# <Robot name> Setup Guide

One or two sentences: what the robot is, where it stands in the lab, and what this guide covers.

> **Note:** Lab-specific values (IP, frames, credentials) below are defaults. Check them against the robot before use.

---

## 1. Robot Data & Network Addressing

| Parameter | Value |
| :--- | :--- |
| **Controller** | … |
| **Software** | … |
| **Payload / reach** | … |
| **Robot IP** | `192.168.10.xx` |

---

## 2. Safety Checks

> **Warning:** The most important safety rule for this robot.

- …

---

## 3. Power-Up Procedure

### 3.1 Start the Controller
1. …

*Expected result: …*

---

## 4. Network Configuration

```bash
sudo ip addr add 192.168.10.200/24 dev eth0
ping -c 3 192.168.10.xx
```

---

## 5. Software Installation (Remote PC)

```bash
pip install …
```

---

## 6. Verification & Health Checks

```bash
nc -zv 192.168.10.xx <port>
```
*Expected output: Connection succeeded.*

---

## 7. Test Script

```python
# minimal connection / motion test
```

*Expected behavior: …*

---

## 8. Shutdown

1. …
2. Release the robot on the Availability tab.

---

## 9. Troubleshooting

| Symptom | What to do |
| :--- | :--- |
| … | … |
