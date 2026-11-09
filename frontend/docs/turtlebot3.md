# TurtleBot3 TCP/IP & ROS Setup Guide

A complete setup guide for provisioning TurtleBot3 units, configuring persistent networking and Wi-Fi autoconnect, deploying the Docker container service, and testing remote control over TCP/IP.

---

## 1. Robot Credentials & Network Addressing

Replace `X` with the assigned robot number across all commands and configurations (e.g., TurtleBot 0 uses `X = 0`, IP `192.168.100.50`, and Wi-Fi `Turtlebot0`).

| Parameter | Value | Example (TurtleBot 0) |
| :--- | :--- | :--- |
| **Username** | `ubuntu` | `ubuntu` |
| **Password** | `MRE_turtlebotX` | `MRE_turtlebot0` |
| **Wi-Fi SSID** | `TurtlebotX` | `Turtlebot0` |
| **Static IP (Fritz!Box)** | `192.168.100.5X` | `192.168.100.50` |

> **Note:** Configure the router/Fritz!Box DHCP reservation so the MAC address maps permanently to `192.168.100.5X`.

---

## 2. Initial Setup on TurtleBot

Access the TurtleBot directly or via your preliminary network connection to perform initial updates and Docker installation.

### 2.1 Update System Packages
```bash
sudo apt update && sudo apt upgrade -y
```

### 2.2 Install Docker Engine
```bash
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -

# Add the stable repository for Ubuntu 18.04 (bionic)
echo "deb [arch=$(dpkg --print-architecture)] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list

# Install the engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

sudo usermod -aG docker $USER
newgrp docker
sudo systemctl enable docker
```

Verify the Docker engine is running:
```bash
docker run --rm hello-world
```
*Expected output: `Hello from Docker!`*

### 2.3 Install ROS Melodic

Configure the ROS repositories, install ROS Melodic along with the required TurtleBot3 packages, and initialize `rosdep`:

```bash
# Add ROS repository
sudo sh -c 'echo "deb http://packages.ros.org/ros/ubuntu $(lsb_release -sc) main" > /etc/apt/sources.list.d/ros-latest.list'

# Set up ROS apt key
sudo apt install -y curl
curl -s https://raw.githubusercontent.com/ros/rosdistro/master/ros.asc | sudo apt-key add -

# Update and install ROS packages
sudo apt update
sudo apt install -y \
    ros-melodic-ros-base \
    ros-melodic-turtlebot3 \
    ros-melodic-turtlebot3-bringup \
    ros-melodic-turtlebot3-msgs \
    ros-melodic-hlds-lfcd-lds \
    ros-melodic-rosserial-python \
    ros-melodic-rospy-message-converter \
    python-rosdep \
    python-rosinstall \
    python-rosinstall-generator \
    python-wstool \
    build-essential

# Initialize rosdep
sudo rosdep init
rosdep update
```

### 2.4 Create and Build Catkin Workspace

Set up the workspace and build:

```bash
# Create workspace structure
mkdir -p /home/ubuntu/catkin_ws/src
cd /home/ubuntu/catkin_ws/src

# Source base ROS environment
source /opt/ros/melodic/setup.bash

# Initialize workspace and create tcp_ip_server package
catkin_init_workspace

# Build workspace
cd /home/ubuntu/catkin_ws
catkin_make
```

### 2.5 Configure Environment Variables

Append OpenCR, dynamic network assignment, ROS environment variables, and auto-tmux behavior to `~/.bashrc`:

```bash
cat << 'EOF' >> ~/.bashrc

# Turtlebot
export OPENCR_PORT=/dev/ttyACM0
export OPENCR_MODEL=burger

# ROS dynamic IP resolution
if ip addr show eth0 | grep "inet " &>/dev/null; then
    ip_addr="$(ip addr show eth0 | grep "inet " | awk '{print $2}')"
elif ip addr show wlan0 | grep "inet " &>/dev/null; then
    ip_addr="$(ip addr show wlan0 | grep "inet " | awk '{print $2}')"
fi
ip_addr="${ip_addr::-3}"

export ROS_MASTER_URI="http://$ip_addr:11311"
export ROS_IP="$ip_addr"
export ROS_HOSTNAME="$ip_addr"
echo "ROS_MASTER_URI=>$ROS_MASTER_URI<"
echo "ROS_HOSTNAME=>$ROS_HOSTNAME<"
echo "ROS_IP=>$ROS_IP<"
export TURTLEBOT3_MODEL="burger"

# Source workspaces
source /opt/ros/melodic/setup.bash
source $HOME/catkin_ws/devel/setup.bash

# Automatically attach/create tmux session on SSH login
if [[ -n "$PS1" ]] && [[ -z "$TMUX" ]] && [[ -n "$SSH_CONNECTION" ]]; then
    tmux attach-session -t ssh_tmux || tmux new-session -s ssh_tmux
fi
EOF

# Reload bashrc to apply changes
source ~/.bashrc
```

---

## 3. Transfer Repository (from Remote PC)

Transfer the `tcp_ip_ros_example` repository from your host development machine / Remote PC to the TurtleBot.

```bash
# Option A: Secure Copy from host
scp -r tcp_ip_ros_example ubuntu@192.168.100.5X:~/git/

# Option B: Clone directly via Git on the TurtleBot
# git clone <repository-url> ~/git/tcp_ip_ros_example
```

---

## 4. Service & Container Configuration (on TurtleBot)

### 4.1 Run the Installer
Run the installation script to build the Docker image and register the systemd service. Connect the robot to the internet before running this step.

```bash
cd ~/git/tcp_ip_ros_example
bash install.sh
```
## !!! Grab a cup of Coffee ; This will take a while

### 4.2 Verify Systemd Service Configuration
Verify that `/etc/systemd/system/tcp_ip.service` contains the correct executable target:

```ini
ExecStart=/bin/bash /home/ubuntu/git/tcp_ip_ros_example/docker/run_docker_service.sh
```

### 4.3 Configure Application IP
Edit the application configuration file to match the robot's static IP address:

```bash
nano ~/git/tcp_ip_ros_example/classes/config.py
```

Set the IP parameter:
```python
# Set to 192.168.100.5X (e.g., 192.168.100.50 for Turtlebot0)
ROBOT_IP = "192.168.100.5X"
```

---

## 5. Network & Wi-Fi Persistent Configuration (on TurtleBot)

Ensure the TurtleBot connects automatically to the assigned Wi-Fi network on boot without dropping connections due to power-saving states.

### 5.1 Connect & Enable Autoconnect
```bash
# 1. Scan available networks
nmcli device wifi list

# 2. Connect to the designated robot Wi-Fi
sudo nmcli device wifi connect "TurtlebotX" password "YOUR_WIFI_PASSWORD"

# 3. Enable system-wide permissions and autoconnect
sudo nmcli connection modify "TurtlebotX" connection.permissions ""
sudo nmcli connection modify "TurtlebotX" connection.autoconnect yes

# 4. Store credentials in plaintext configuration (bypasses desktop keyring on boot)
sudo nmcli connection modify "TurtlebotX" 802-11-wireless-security.psk-flags 0
```

### 5.2 Disable Wi-Fi Power Saving
Prevent Wi-Fi dropouts caused by aggressive power management:

```bash
sudo nano /etc/NetworkManager/conf.d/default-wifi-powersave-on.conf
```

Change `wifi.powersave` from `3` (enabled) to `2` (disabled):
```ini
[connection]
wifi.powersave = 2
```

### 5.3 Reboot the Robot
```bash
sudo reboot
```

---

## 6. Verification & Health Checks

From your Remote PC / WSL terminal connected to the same network:

### 6.1 Ping Test
```bash
ping 192.168.100.5X
```

### 6.2 Port Connectivity Check
Verify that the service is running and listening on the expected TCP ports (`9997`, `9998`, `9999`):

```bash
nc -zv 192.168.100.5X 9997 9998 9999
```
*Expected output: Connection succeeded for all three ports.*

### 6.3 ROS Topics & Nodes
SSH into the robot:
```bash
ssh ubuntu@192.168.100.5X
```

Inspect active ROS topics:
```bash
rostopic list
```
*Ensure `/scan`, `/odom`, and `/cmd_vel` are present.*

Inspect active ROS nodes:
```bash
rosnode list
```
*Ensure `/turtlebot3_core` is running.*

---

## 7. Motion Test Script

Save the following test script as `drive_test.py` on your Remote PC to test remote velocity commands over TCP/IP:

```python
import socket
import json
import time

# Update with target robot IP
ROBOT_IP = "192.168.100.5X"  
PORT = 9999
START_STR = "---START---"
END_STR = "___END___"

def format_twist(linear: float, angular: float) -> bytes:
    payload = {"linear": round(linear, 4), "angular": round(angular, 4)}
    message = START_STR + json.dumps(payload) + END_STR
    return message.encode("utf-8")

def main():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    print(f"Connecting to {ROBOT_IP}:{PORT}...")
    s.connect((ROBOT_IP, PORT))
    print("Connected!")
    
    try:
        # Stream rotate command for 2 seconds at 10 Hz
        print("Rotating robot...")
        start_time = time.time()
        while time.time() - start_time < 2.0:
            s.sendall(format_twist(linear=0.0, angular=0.4))
            time.sleep(0.1)
            
        # Stop command
        print("Stopping robot...")
        s.sendall(format_twist(linear=0.0, angular=0.0))
        print("Done!")
    finally:
        s.close()

if __name__ == "__main__":
    main()
```

Run the script from your Remote PC:
```bash
python3 drive_test.py
```
*Expected behavior: The robot rotates in place for 2 seconds and stops.*