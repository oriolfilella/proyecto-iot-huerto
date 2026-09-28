import json
import os

import paho.mqtt.client as mqtt
from paho.mqtt.enums import CallbackAPIVersion

from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

from dotenv import load_dotenv


# ================================================================
# CONFIGURACIÓN
# ================================================================

load_dotenv()

MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
MQTT_TOPIC = "huerto/+/frutales/+/humedad"

INFLUX_URL = os.getenv("INFLUX_URL")
INFLUX_TOKEN = os.getenv("INFLUX_TOKEN")
INFLUX_ORG = os.getenv("INFLUX_ORG")
INFLUX_BUCKET = os.getenv("INFLUX_BUCKET")


# ================================================================
# INFLUXDB
# ================================================================

influx_client = InfluxDBClient(
    url=INFLUX_URL,
    token=INFLUX_TOKEN,
    org=INFLUX_ORG
)

write_api = influx_client.write_api(
    write_options=SYNCHRONOUS
)


# ================================================================
# CALLBACK MQTT
# ================================================================

def on_connect(client, userdata, flags, reason_code, properties):

    if reason_code == 0:
        print("[INFO] Conectado al broker MQTT.")

        client.subscribe(MQTT_TOPIC)

        print(f"[INFO] Suscrito a: {MQTT_TOPIC}")

    else:
        print(f"[ERROR] Fallo al conectar. Código: {reason_code}")


def on_message(client, userdata, msg):

    topic = msg.topic

    # ------------------------------------------------------------
    # Decodificar payload
    # ------------------------------------------------------------

    try:
        payload_str = msg.payload.decode("utf-8")
        datos = json.loads(payload_str)

    except UnicodeDecodeError:
        print("[ERROR] El payload no contiene UTF-8 válido.")
        return

    except json.JSONDecodeError:
        print("[ERROR] El payload no es un JSON válido.")
        return


    # ------------------------------------------------------------
    # Obtener datos
    # ------------------------------------------------------------

    humedad_pct = datos.get("humedad_pct")
    voltaje_mv = datos.get("voltaje_mv")


    if humedad_pct is None or voltaje_mv is None:
        print("[ERROR] Faltan datos en el payload.")
        return


    # ------------------------------------------------------------
    # Convertir tipos
    # ------------------------------------------------------------

    try:
        humedad_pct = float(humedad_pct)
        voltaje_mv = float(voltaje_mv)

    except (TypeError, ValueError):
        print("[ERROR] Los valores recibidos no son numéricos.")
        return


    # ------------------------------------------------------------
    # Validar rango
    # ------------------------------------------------------------

    if not 0 <= humedad_pct <= 100:
        print(f"[ERROR] Humedad fuera de rango: {humedad_pct}")
        return


    # ------------------------------------------------------------
    # Obtener árbol desde el topic
    # ------------------------------------------------------------

    partes = topic.split("/")

    if len(partes) != 5:
        print(f"[ERROR] Topic con formato incorrecto: {topic}")
        return

    ubicacion = partes[1]
    tipo = partes[2]
    arbol = partes[3]
    sensor = partes[4]


    # ------------------------------------------------------------
    # Mostrar información
    # ------------------------------------------------------------

    print(
        f"[RX] {topic} -> "
        f"Humedad: {humedad_pct}% | "
        f"Voltaje: {voltaje_mv}mV"
    )


    # ------------------------------------------------------------
    # Crear punto InfluxDB
    # ------------------------------------------------------------

    punto = (
        Point("telemetria_suelo")
        .tag("arbol", arbol)
        .tag("ubicacion", ubicacion)
        .tag("tipo", tipo)
        .tag("sensor", sensor)
        .field("humedad_pct", humedad_pct)
        .field("voltaje_mv", voltaje_mv)
    )


    # ------------------------------------------------------------
    # Guardar en InfluxDB
    # ------------------------------------------------------------

    try:

        write_api.write(
            bucket=INFLUX_BUCKET,
            org=INFLUX_ORG,
            record=punto
        )

        print("[INFLUXDB] Dato guardado correctamente.")

    except Exception as e:

        print(f"[ERROR] No se pudo guardar en InfluxDB: {e}")


# ================================================================
# MAIN
# ================================================================

def main():

    print("--- INICIANDO WORKER DE INGESTIÓN IOT ---")

    client = mqtt.Client(
        CallbackAPIVersion.VERSION2
    )

    client.on_connect = on_connect
    client.on_message = on_message

    client.connect(
        MQTT_BROKER,
        MQTT_PORT,
        60
    )

    try:

        client.loop_forever()

    except KeyboardInterrupt:

        print("\n[INFO] Apagando worker...")

    finally:

        client.disconnect()
        influx_client.close()

        print("[INFO] Worker detenido.")


# ================================================================
# ENTRY POINT
# ================================================================

if __name__ == "__main__":
    main()