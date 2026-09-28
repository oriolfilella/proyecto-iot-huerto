# 🌱 IoT Garden Monitoring System

An end-to-end IoT system for monitoring soil moisture from multiple plants and trees.

The project integrates **embedded firmware, MQTT communication, a Python backend, time-series data storage, and a web dashboard**.

The main goal is to build a complete IoT pipeline, from collecting sensor data on an **ESP32** to storing, processing, and visualizing that data through a web application.

---

## 📐 Architecture

```text
┌─────────────────┐
│      ESP32      │
│                 │
│  Soil Sensor    │
│      ADC        │
│       ↓         │
│   Processing    │
└────────┬────────┘
         │
         │ MQTT
         ▼
┌─────────────────┐
│  MQTT Broker    │
│     HiveMQ      │
└────────┬────────┘
         │
         │ MQTT subscription
         ▼
┌─────────────────┐
│ Python Backend  │
│                 │
│ Paho MQTT       │
│ Data validation │
│ Transformation  │
└────────┬────────┘
         │
         │ Write
         ▼
┌─────────────────┐
│    InfluxDB     │
│                 │
│ Time-series DB  │
└────────┬────────┘
         │
         │ Query
         ▼
┌─────────────────┐
│ Web Dashboard   │
│                 │
│ Next.js         │
│ TypeScript      │
└─────────────────┘
```

---

## 🎯 Project Goals

This project was built to develop and integrate skills across several areas of software and embedded engineering:

- Embedded C development on ESP32
- ESP-IDF and FreeRTOS
- ADC sensor acquisition
- GPIO and low-level hardware interaction
- Wi-Fi connectivity
- MQTT communication
- IoT messaging architecture
- Backend development with Python
- Time-series data storage
- Web development with Next.js and TypeScript
- Separation of concerns between firmware, backend, and frontend
- Environment-based configuration
- Development and testing using simulation before deploying to physical hardware

---

## 🧰 Technologies

### Embedded / IoT

- **C**
- **ESP32**
- **ESP-IDF**
- **FreeRTOS**
- ADC
- GPIO
- Wi-Fi
- MQTT
- Wokwi

### Backend

- **Python**
- **Paho MQTT**
- **InfluxDB Client**
- **python-dotenv**
- JSON

### Database

- **InfluxDB**
- Time-series data model

### Frontend

- **Next.js**
- **React**
- **TypeScript**

### Development

- Git
- GitHub
- Visual Studio Code
- Wokwi

---

# 🔌 Embedded System

The ESP32 is responsible for acquiring sensor data and transmitting it to the IoT infrastructure.

The firmware is developed using **ESP-IDF** and **FreeRTOS**.

Its main responsibilities are:

1. Initialize the hardware.
2. Configure the ADC.
3. Read the soil moisture sensor.
4. Process the sensor measurements.
5. Connect to the Wi-Fi network.
6. Connect to the MQTT broker.
7. Publish telemetry periodically.

Example telemetry payload:

```json
{
  "humedad_pct": 65.4,
  "voltaje_mv": 1850
}
```

The sensor data is published using the following MQTT topic:

```text
huerto/lleida/frutales/nispero_1/humedad
```

The topic structure is designed to support multiple locations, plant types, devices, and sensors.

For example:

```text
huerto/lleida/frutales/nispero_1/humedad
huerto/lleida/frutales/manzano_1/humedad
huerto/barcelona/huerta/tomate_1/humedad
```

---

# 📡 MQTT Communication

MQTT is used as the communication protocol between the embedded devices and the backend.

The current development architecture is:

```text
ESP32
  │
  │ publish
  ▼
HiveMQ
  │
  │ subscribe
  ▼
Python Worker
```

The backend subscribes to:

```text
huerto/lleida/frutales/+/humedad
```

The `+` wildcard allows the backend to receive telemetry from multiple devices without requiring a separate subscription for each one.

The MQTT payload is encoded as JSON.

The backend validates:

- UTF-8 encoding
- JSON format
- Required fields
- Numeric values
- Humidity range
- MQTT topic structure

---

# 🐍 Backend

The backend contains an MQTT worker implemented in Python.

Its main responsibility is to act as the bridge between the IoT messaging infrastructure and the time-series database.

The data flow is:

```text
MQTT message
      ↓
Decode JSON
      ↓
Validate data
      ↓
Extract metadata
      ↓
Create InfluxDB Point
      ↓
Store telemetry
```

The backend extracts metadata directly from the MQTT topic:

```text
huerto/lleida/frutales/nispero_1/humedad
       │       │        │        │
       │       │        │        └── sensor
       │       │        └─────────── device/tree
       │       └──────────────────── type
       └──────────────────────────── location
```

This metadata is stored as InfluxDB tags.

Example data model:

```text
measurement: telemetria_suelo

tags:
  ubicacion = lleida
  tipo      = frutales
  arbol     = nispero_1
  sensor    = humedad

fields:
  humedad_pct
  voltaje_mv
```

Using tags for metadata makes it possible to efficiently filter and group measurements when querying the database.

---

# 📊 Data Flow

A complete measurement follows this path:

```text
Soil Sensor
     ↓
ESP32 ADC
     ↓
Sensor processing
     ↓
JSON
     ↓
MQTT
     ↓
HiveMQ
     ↓
Python Worker
     ↓
Data validation
     ↓
InfluxDB
     ↓
Next.js
     ↓
Web Dashboard
```

Each layer has a specific responsibility.

The ESP32 focuses on hardware and data acquisition, the backend handles message processing and persistence, and the frontend focuses on data visualization.

This separation allows each component to evolve independently.

---

# 🌐 Frontend

The web dashboard is built using:

- Next.js
- React
- TypeScript

It provides a user interface for visualizing the telemetry collected by the IoT system.

The dashboard can display information such as:

- Soil moisture
- Sensor voltage
- Device identification
- Historical measurements
- Telemetry trends

The frontend is separated from the embedded firmware and data ingestion backend.

This makes it possible to modify or replace the user interface without changing the firmware architecture.

---

# 🗂️ Project Structure

```text
proyecto-iot-huerto/
│
├── firmware/
│   ├── main/
│   ├── CMakeLists.txt
│   └── ...
│
├── backend/
│   ├── worker.py
│   ├── requirements.txt
│   └── .env.example
│
├── frontend-huerto/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── docs/
│
├── .gitignore
└── README.md
```

---

# 🧪 Development with Wokwi

The embedded system can be developed and tested using **Wokwi** before deploying to physical hardware.

This makes it possible to test firmware and communication logic without requiring the complete physical sensor setup.

The simulated system follows the same basic architecture:

```text
ESP32
  ↓
Simulated sensor
  ↓
ADC
  ↓
Wi-Fi
  ↓
MQTT
```

Using simulation during development reduces the feedback cycle and makes the project easier to reproduce.

> **Wokwi simulation:** https://wokwi.com/projects/474179510594150401

# ⚙️ Configuration

Sensitive configuration is not stored in the repository.

The backend uses environment variables for InfluxDB configuration:

```env
INFLUX_URL=
INFLUX_TOKEN=
INFLUX_ORG=
INFLUX_BUCKET=
```

A configuration template is provided in:

```text
backend/.env.example
```

The real `.env` file is excluded from Git using `.gitignore`.

---

# 🚀 Running the Project

## 1. Firmware

Install:

- ESP-IDF
- ESP-IDF VS Code extension
- ESP32 toolchain

Build the firmware:

```bash
idf.py build
```

Flash it to the ESP32:

```bash
idf.py flash
```

Monitor the device:

```bash
idf.py monitor
```

The firmware can also be tested using the Wokwi simulation.

---

## 2. Backend

Navigate to the backend directory:

```bash
cd backend
```

Create a Python virtual environment:

```bash
python -m venv venv
```

Activate it on Windows:

```bash
venv\Scripts\activate
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

Create the environment configuration file:

```text
backend/.env
```

using `.env.example` as a template.

Then run the MQTT worker:

```bash
python worker.py
```

---

## 3. Frontend

Navigate to the frontend:

```bash
cd frontend-huerto
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The Next.js development server will then be available locally.

---

# 🔐 Security

The repository does not contain production credentials.

Sensitive information such as:

- InfluxDB tokens
- API keys
- Passwords
- Local environment configuration

is managed through environment variables.

The public HiveMQ broker is currently used for **development and demonstration purposes** and is not intended to be used as production infrastructure.

---

# 📈 Scalability

The communication architecture was designed with future expansion in mind.

The MQTT topic follows the general structure:

```text
huerto/{location}/{type}/{device}/{sensor}
```

This allows additional devices and sensors to be added without fundamentally changing the communication architecture.

For example:

```text
huerto/lleida/frutales/nispero_1/humedad
huerto/lleida/frutales/nispero_2/humedad
huerto/lleida/frutales/manzano_1/humedad
```

Possible future extensions include:

- Multiple ESP32 nodes
- Temperature and humidity sensors
- Soil temperature sensors
- Light sensors
- Battery monitoring
- Automatic irrigation
- Device health monitoring
- MQTT authentication
- TLS encryption
- Dedicated MQTT infrastructure
- Dockerized services
- Alerting
- Historical analytics
- Remote device configuration

---

# 🧠 Engineering Concepts Practiced

This project serves as a practical environment for learning and applying embedded and distributed-systems concepts.

### Embedded Systems

- C programming
- Pointers and memory
- ADC acquisition
- GPIO configuration
- Interrupts
- `volatile`
- State machines
- FreeRTOS tasks
- Event-driven programming
- Hardware abstraction

### Networking

- Wi-Fi
- MQTT
- Publish/Subscribe architecture
- MQTT topics
- Wildcards
- JSON serialization

### Backend

- Event-driven message processing
- Input validation
- Data transformation
- Environment-based configuration
- Time-series databases

### Software Architecture

- Separation of concerns
- Modular components
- Layered architecture
- Scalable communication protocols
- Independent firmware, backend, and frontend components

---

# 🔭 Future Improvements

- [ ] Add MQTT authentication
- [ ] Enable MQTT over TLS
- [ ] Move MQTT configuration to environment variables
- [ ] Add device identification
- [ ] Add sensor health/status telemetry
- [ ] Add automatic irrigation control
- [ ] Add low-moisture alerts
- [ ] Containerize backend services with Docker
- [ ] Add automated tests
- [ ] Add CI/CD
- [ ] Deploy the web dashboard
- [ ] Add more physical sensors
- [ ] Improve ESP32 power management

---

# 👨‍💻 About the Project

This project is part of my development towards **Embedded Systems and IoT Engineering**.

It combines low-level embedded programming with networking, backend development, databases, and modern web technologies.

The main objective is not only to build a working prototype, but to understand and implement the complete data pipeline:

```text
Physical world
      ↓
     MCU
      ↓
   Network
      ↓
   Backend
      ↓
   Database
      ↓
Web application
```

The project demonstrates how embedded devices, network protocols, backend services, databases, and web applications can be combined into a complete IoT system.
