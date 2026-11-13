/* Robot list shown on the dashboard.
   Each robot's setup guide is a Markdown file in frontend/docs/ (docFile).
   To add a robot: copy docs/_TEMPLATE.md to docs/<id>.md and add an entry here. */
window.LAB_ROBOTS=[
//  {id:"ur5e",name:"UR5e",maker:"Universal Robots",type:"Collaborative arm",cell:"CELL A1",axes:6,payload:"5 kg",reach:"850 mm",repeat:"±0.03 mm",ctrl:"CB5 / e-Series",ip:"192.168.10.11",sw:"PolyScope 5.x",sdk:"ur_rtde (Python)",art:"arm",docFile:"docs/ur5e.md"},
//  {id:"kr6",name:"KR 6 R900 sixx (AGILUS)",maker:"KUKA",type:"Industrial arm",cell:"CELL A2",axes:6,payload:"6 kg",reach:"901 mm",repeat:"±0.03 mm",ctrl:"KR C4 compact",ip:"192.168.10.21",sw:"KSS 8.6 / WorkVisual",sdk:"RSI / KUKA.EthernetKRL",art:"arm",docFile:"docs/kr6.md"},
//  {id:"yumi",name:"YuMi IRB 14000",maker:"ABB",type:"Dual-arm cobot",cell:"CELL B1",axes:14,payload:"0.5 kg / arm",reach:"559 mm",repeat:"±0.02 mm",ctrl:"IRC5 (integrated)",ip:"192.168.10.31",sw:"RobotWare 6.x / RobotStudio",sdk:"EGM / RWS (REST)",art:"dual",docFile:"docs/yumi.md"},
//  {id:"fr3",name:"Franka Research 3",maker:"Franka Robotics",type:"Torque-controlled arm",cell:"CELL B2",axes:7,payload:"3 kg",reach:"855 mm",repeat:"±0.1 mm",ctrl:"FR3 Control",ip:"172.16.0.2",sw:"Franka Desk",sdk:"libfranka / franka_ros2",art:"arm7",docFile:"docs/fr3.md"},
//  {id:"crx",name:"CRX-10iA",maker:"FANUC",type:"Collaborative arm",cell:"CELL C1",axes:6,payload:"10 kg",reach:"1249 mm",repeat:"±0.04 mm",ctrl:"R-30iB Mini Plus",ip:"192.168.10.41",sw:"Tablet TP / ROBOGUIDE",sdk:"Ethernet/IP · PCDK",art:"arm",docFile:"docs/crx.md"},
//  {id:"mir",name:"MiR250",maker:"Mobile Industrial Robots",type:"Autonomous mobile robot",cell:"FLOOR",axes:0,payload:"250 kg",reach:"—",repeat:"±50 mm docking",ctrl:"MiR onboard PC",ip:"192.168.12.20",sw:"MiR Robot Interface 3",sdk:"REST API v2.0",art:"amr",docFile:"docs/mir.md"},
//  {id:"ned2",name:"Ned2",maker:"Niryo",type:"Educational arm",cell:"CELL C2",axes:6,payload:"0.3 kg",reach:"490 mm",repeat:"±0.5 mm",ctrl:"Raspberry Pi 4 (onboard)",ip:"192.168.10.51",sw:"Niryo Studio",sdk:"pyniryo (Python)",art:"arm",docFile:"docs/ned2.md"},
//  {id:"rebel",name:"ReBeL 6DOF",maker:"igus",type:"Low-cost cobot",cell:"CELL D1",axes:6,payload:"2 kg",reach:"664 mm",repeat:"±1 mm",ctrl:"igus Robot Control",ip:"192.168.10.61",sw:"iRC software",sdk:"CRI interface / ROS 2",art:"arm",docFile:"docs/rebel.md"},
{id:"wavego",name:"WAVEGO EX Bionic Dog",maker:"Waveshare",type:"Legged robot (quadruped)",cell:"FLOOR",axes:12,payload:"PAYLOAD",reach:"REACH",repeat:"—",ctrl:"ESP32 (verify)",ip:"192.168.10.51",sw:"Waveshare factory firmware",sdk:"Wi-Fi web UI (HTTP, port 80)",art:"wavego_bionic",docFile:"docs/wavego.md"},
{id:"galaxyrvr",name:"Galaxy RVR Mars Rover",maker:"SunFounder",type:"Mobile rover (6 wheels)",cell:"FLOOR",axes:0,payload:"PAYLOAD",reach:"REACH",repeat:"—",ctrl:"Arduino Uno R3 + ESP32-CAM (verify)",ip:"192.168.10.52",sw:"SunFounder Arduino firmware",sdk:"SunFounder Controller app / WebSocket (port 8765, verify)",art:"galaxy_rvr_rover",docFile:"docs/galaxy-rvr.md"},
{id:"rasprover",name:"RaspRover (tracked, with arm)",maker:"Waveshare",type:"Mobile manipulator (tracked)",cell:"FLOOR",axes:4,payload:"PAYLOAD",reach:"REACH",repeat:"—",ctrl:"NVIDIA Jetson + ESP32 driver board",ip:"192.168.10.53",sw:"Ubuntu (JetPack) + Waveshare UGV app",sdk:"JSON commands via UART / HTTP; web UI port 5000, JupyterLab 8888 (verify)",art:"rasprover_tracked",docFile:"docs/rasprover.md"},
{id:"ddchassis",name:"Double-Deck Robot Chassis",maker:"BerryBase",type:"Robot chassis (2-level, wheeled)",cell:"BENCH",axes:0,payload:"PAYLOAD",reach:"REACH",repeat:"—",ctrl:"None fitted (e.g. Raspberry Pi + motor driver)",ip:"192.168.10.54",sw:"Depends on fitted controller",sdk:"GPIO / PWM (gpiozero) if Raspberry Pi fitted",art:"berrybase_chassis",docFile:"docs/double-deck-chassis.md"},
{id:"lidarbot",name:"LiDAR Bot AGV with Mecanum Wheels",maker:"M5Stack",type:"Mobile AGV (mecanum)",cell:"FLOOR",axes:0,payload:"PAYLOAD",reach:"PAYLOAD",repeat:"REACH",ctrl:"M5Stack Core (ESP32)",ip:"192.168.10.55",sw:"Arduino / UIFlow firmware",sdk:"USB serial; ESP-NOW remote (Wi-Fi only with custom firmware)",art:"mecanum",docFile:"docs/lidarbot.md"},
{id:"so101",name:"SO-ARM101",maker:"TheRobotStudio / Hugging Face (open source)",type:"Robotic arm (stationary)",cell:"TABLE",axes:6,payload:"PAYLOAD",reach:"REACH",repeat:"—",ctrl:"Feetech STS3215 bus servos + USB servo adapter",ip:"USB (host PC)",sw:"LeRobot (Python)",sdk:"Feetech serial bus protocol / LeRobot API",art:"so_arm",docFile:"docs/so-arm101.md"},
{id:"wheelleg",name:"Mini Wheeled-Legged Robot",maker:"StackForce",type:"Hybrid mobile robot (wheel-leg)",cell:"FLOOR",axes:6,payload:"PAYLOAD",reach:"REACH",repeat:"—",ctrl:"ESP32 (verify)",ip:"192.168.10.57",sw:"StackForce factory firmware",sdk:"Vendor app / remote (verify)",art:"stackforce_wheeled",docFile:"docs/wheeled-legged.md"},
{id:"dancebot",name:"Dancing Robot",maker:"Playtastic",type:"Humanoid toy robot (bipedal)",cell:"SHELF",axes:0,payload:"PAYLOAD",reach:"REACH",repeat:"—",ctrl:"Built-in toy electronics",ip:"—",sw:"Factory firmware",sdk:"None (buttons / remote)",art:"playtastic_humanoid",docFile:"docs/dancing-robot.md"},
{id:"tb3",name:"TurtleBot3 Burger",maker:"ROBOTIS",type:"Mobile robot (ROS)",cell:"FLOOR",axes:0,payload:"15 kg",reach:"0.22 m/s",repeat:"—",ctrl:"Raspberry Pi + OpenCR",ip:"192.168.100.50",sw:"ROS Melodic + Docker",sdk:"TCP/IP JSON (ports 9997–9999)",art:"turtlebot3",docFile:"docs/turtlebot3.md"},
{id:"hexapod",name:"Robotis Dynamixel Hexapod MKII",maker:"Interbotix / ROBOTIS",type:"Legged robot (hexapod)",cell:"FLOOR",axes:18,payload:"PAYLOAD",reach:"REACH",repeat:"—",ctrl:"ArbotiX-M (verify)",ip:"192.168.10.56",sw:"Interbotix hexapod firmware (verify)",sdk:"Dynamixel Protocol 1.0 via Arduino IDE (verify)",art:"hexapod",docFile:"docs/hexapod.md"},
{id:"taurob",name:"Taurob - Sieglinde",maker:"taurob",type:"Tracked mobile manipulator (prototype)",cell:"FLOOR",axes:0,payload:"PAYLOAD",reach:"REACH",repeat:"—",ctrl:"Onboard PC (verify)",ip:"192.168.10.57",sw:"Ubuntu + ROS (verify)",sdk:"ROS topics/services (verify)",art:"tracked_arm",docFile:"docs/taurob.md"},
{id:"zelos",name:"Zelos",maker:"Not specified",type:"Tracked mobile robot (prototype)",cell:"FLOOR",axes:0,payload:"PAYLOAD",reach:"REACH",repeat:"—",ctrl:"Not specified",ip:"192.168.10.58",sw:"Not specified",sdk:"Not specified",art:"tracked",docFile:"docs/zelos.md"},
{id:"mir",name:"MiR with UR5",maker:"Mobile Industrial Robots (MiR)",type:"Mobile manipulator (AMR + UR5 arm)",cell:"FLOOR",axes:6,payload:"PAYLOAD",reach:"850 mm (UR5)",repeat:"±0.1 mm (UR5)",ctrl:"MiR onboard PC + UR controller (verify)",ip:"192.168.10.59",sw:"MiR Robot software + PolyScope",sdk:"MiR REST API (port 80) + URScript / RTDE (port 30004)",art:"mir_ur5",docFile:"docs/mir.md"},
{id:"g1",name:"Unitree G1 EDU U2 Advanced",maker:"Unitree Robotics",type:"Humanoid robot (bipedal)",cell:"FLOOR",axes:29,payload:"PAYLOAD",reach:"REACH",repeat:"—",ctrl:"Onboard motion controller + NVIDIA Jetson Orin (EDU)",ip:"192.168.10.60",sw:"Unitree firmware + Ubuntu on Jetson (verify)",sdk:"unitree_sdk2 (DDS) / ROS 2 (unitree_ros2)",art:"humanoid",docFile:"docs/unitree-g1.md"},
{id:"robotino3",name:"Festo Robotino 3",maker:"Festo",type:"Educational robot (holonomic, omni-wheels)",cell:"FLOOR",axes:0,payload:"PAYLOAD",reach:"REACH",repeat:"—",ctrl:"Embedded PC (Linux)",ip:"192.168.10.61",sw:"Robotino OS + Robotino View",sdk:"Robotino REST API / API2 (C++, Python) / ROS (verify)",art:"robotino",docFile:"docs/robotino3.md"},
{id:"kr16",name:"KUKA KR 16-2",maker:"KUKA",type:"Industrial robotic arm (6-axis)",cell:"CELL",axes:6,payload:"16 kg",reach:"1611 mm",repeat:"±0.04 mm (verify)",ctrl:"KR C4 (verify; KR C2 on older units)",ip:"192.168.10.62",sw:"KUKA System Software (KSS)",sdk:"KRL; KUKA.RSI / EthernetKRL (options)",art:"kuka_kr16",docFile:"docs/kuka-kr16.md"},
{id:"w818",name:"Wittmann W818-2058",maker:"WITTMANN",type:"Cartesian gantry robot (3-axis)",cell:"CELL",axes:3,payload:"6 kg",reach:"REACH",repeat:"—",ctrl:"WITTMANN R8/R9 (verify)",ip:"192.168.10.63",sw:"WITTMANN teach software (verify)",sdk:"Euromap 67 machine interface (verify)",art:"gantry",docFile:"docs/wittmann-w818.md"},
{id:"ur5",name:"UR5",maker:"Universal Robots",type:"Collaborative robotic arm (6-axis)",cell:"CELL",axes:6,payload:"5 kg",reach:"850 mm",repeat:"±0.1 mm",ctrl:"UR CB3 (verify; e-Series if UR5e)",ip:"192.168.10.64",sw:"PolyScope",sdk:"URScript / RTDE (port 30004), Dashboard server (port 29999)",art:"ur5",docFile:"docs/ur5.md"},
{id:"gofa",name:"ABB CRB 15000-5/0.95 (GoFa)",maker:"ABB",type:"Collaborative robotic arm (6-axis)",cell:"CELL",axes:6,payload:"5 kg",reach:"950 mm",repeat:"±0.05 mm",ctrl:"OmniCore C30",ip:"192.168.10.65",sw:"RobotWare 7",sdk:"RAPID; Robot Web Services (REST) / EGM",art:"abb_gofa",docFile:"docs/abb-gofa.md"},
{id:"kr6",name:"KUKA KR 6 R900 sixx",maker:"KUKA",type:"Industrial robotic arm (6-axis)",cell:"CELL",axes:6,payload:"6 kg",reach:"901 mm",repeat:"±0.03 mm",ctrl:"KR C4 compact (verify)",ip:"192.168.10.66",sw:"KUKA System Software 8.x (verify)",sdk:"KRL; KUKA.RSI / EthernetKRL (options)",art:"kuka_kr6",docFile:"docs/kuka-kr6.md"},
{id:"m6ib",name:"FANUC M-6iB",maker:"FANUC",type:"Industrial robotic arm (6-axis)",cell:"CELL",axes:6,payload:"6 kg",reach:"1373 mm",repeat:"±0.08 mm",ctrl:"R-30iA (verify)",ip:"192.168.10.67",sw:"HandlingTool (verify)",sdk:"TP / KAREL; socket messaging (option)",art:"fanuc_m6ib",docFile:"docs/fanuc-m6ib.md"},
{id:"er4ia",name:"FANUC ER-4iA",maker:"FANUC",type:"Industrial robotic arm (6-axis)",cell:"CELL",axes:6,payload:"4 kg",reach:"550 mm",repeat:"±0.01 mm (verify)",ctrl:"R-30iB Mate Plus (verify)",ip:"192.168.10.68",sw:"HandlingTool (verify)",sdk:"TP / KAREL; socket messaging (option)",art:"fanuc_er4ia",docFile:"docs/fanuc-er4ia.md"},
];

// Robot Images
window.LAB_ART = {
  wavego_bionic:      "assets/robots/wavego_bionic.png",        // WAVEGO EX Bionic Dog
  galaxy_rvr_rover:   "assets/robots/galaxy_rvr_rover.png",     // Galaxy RVR Mars Rover
  rasprover_tracked:  "assets/robots/rasprover_tracked.png",    // RaspRover (tracked + arm)
  berrybase_chassis:  "assets/robots/berrybase_chassis.png",    // BerryBase Double-Deck Chassis
  mecanum:            "assets/robots/mecanum.png",              // M5Stack LiDAR Bot
  so_arm:      "assets/robots/so_arm.png",               // SO-ARM101  
  stackforce_wheeled: "assets/robots/stackforce_wheeled.png",   // StackForce Wheeled-Legged
  playtastic_humanoid: "assets/robots/playtastic_humanoid.png",  // Playtastic Dancing Robot
  turtlebot3:       "assets/robots/turtlebot3.png",           // Turtlebot3 Burger
  hexapod:      "assets/robots/hexapod.png",       // Robotis Dynamixel Hexapod MKII
  tracked_arm:  "assets/robots/tracked_arm.png",   // Taurob Tracker
  tracked:      "assets/robots/tracked.png",       // Zelos
  mir_ur5:      "assets/robots/mir_ur5.png",       // MiR with UR5
  humanoid:     "assets/robots/humanoid.png",      // Unitree G1 EDU U2 Advanced
  robotino:     "assets/robots/robotino.png",      // Festo Robotino 3
  kuka_kr16:    "assets/robots/kuka_kr16.png",     // KUKA KR 16-2
  gantry:       "assets/robots/gantry.png",        // Wittmann W818-2058
  ur5:          "assets/robots/ur5.png",           // UR5
  abb_gofa:     "assets/robots/abb_gofa.png",      // ABB CRB 15000 (GoFa)
  kuka_kr6:     "assets/robots/kuka_kr6.png",      // KUKA KR 6 R900 sixx
  fanuc_m6ib:   "assets/robots/fanuc_m6ib.png",    // FANUC M-6iB
  fanuc_er4ia:  "assets/robots/fanuc_er4ia.png",   // FANUC ER-4iA
};


window.labArt = (robot) => {
  const src = window.LAB_ART[robot.art];
  return src
    ? `<img class="robot-art" src="${src}" alt="${robot.name}" loading="lazy">`
    : "";
};
