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

# Recibe la telemetría de todos los dispositivos de frutales
MQTT_TOPIC = "huerto/+/frutales/+/telemetria"

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
# FUNCIONES AUXILIARES
# ================================================================

def crear_punto(sensor, valor, ubicacion, tipo, dispositivo):
    """
    Crea un punto de InfluxDB para una medición individual.

    Tags:
        ubicacion
        tipo
        dispositivo
        sensor

    Field:
        valor
    """

    return (
        Point("telemetria")
        .tag("ubicacion", ubicacion)
        .tag("tipo", tipo)
        .tag("dispositivo", dispositivo)
        .tag("sensor", sensor)
        .field("valor", valor)
    )


def guardar_medicion(sensor, valor, ubicacion, tipo, dispositivo):
    """
    Guarda una medición individual en InfluxDB.
    """

    try:

        punto = crear_punto(
            sensor=sensor,
            valor=valor,
            ubicacion=ubicacion,
            tipo=tipo,
            dispositivo=dispositivo
        )

        write_api.write(
            bucket=INFLUX_BUCKET,
            org=INFLUX_ORG,
            record=punto
        )

        print(
            f"[INFLUXDB] Guardado -> "
            f"sensor={sensor}, "
            f"valor={valor}"
        )

    except Exception as e:

        print(
            f"[ERROR] No se pudo guardar "
            f"sensor={sensor}: {e}"
        )


# ================================================================
# CALLBACK MQTT
# ================================================================

def on_connect(client, userdata, flags, reason_code, properties):

    if reason_code == 0:

        print("[INFO] Conectado al broker MQTT.")

        result, mid = client.subscribe(MQTT_TOPIC)

        if result == mqtt.MQTT_ERR_SUCCESS:

            print(
                f"[INFO] Suscrito a: {MQTT_TOPIC}"
            )

        else:

            print(
                f"[ERROR] No se pudo suscribir. "
                f"Código: {result}"
            )

    else:

        print(
            f"[ERROR] Fallo al conectar. "
            f"Código: {reason_code}"
        )


def on_message(client, userdata, msg):

    topic = msg.topic

    # ------------------------------------------------------------
    # Decodificar payload
    # ------------------------------------------------------------

    try:

        payload_str = msg.payload.decode("utf-8")
        datos = json.loads(payload_str)

    except UnicodeDecodeError:

        print(
            "[ERROR] El payload no contiene UTF-8 válido."
        )

        return

    except json.JSONDecodeError:

        print(
            "[ERROR] El payload no es un JSON válido."
        )

        return


    # ------------------------------------------------------------
    # Validar topic
    # ------------------------------------------------------------

    partes = topic.split("/")

    if len(partes) != 5:

        print(
            f"[ERROR] Topic con formato incorrecto: {topic}"
        )

        return


    # Estructura:
    #
    # huerto / ubicacion / tipo / dispositivo / mensaje
    #
    #      0       1          2        3          4

    ubicacion = partes[1]
    tipo = partes[2]
    dispositivo = partes[3]
    mensaje = partes[4]


    if mensaje != "telemetria":

        print(
            f"[ERROR] Tipo de mensaje no soportado: {mensaje}"
        )

        return


    # ------------------------------------------------------------
    # Mostrar mensaje recibido
    # ------------------------------------------------------------

    print(
        f"[RX] {topic} -> {payload_str}"
    )


    # ------------------------------------------------------------
    # HUMEDAD DEL SUELO
    # ------------------------------------------------------------

    humedad_pct = datos.get("humedad_pct")

    if humedad_pct is not None:

        try:

            humedad_pct = float(humedad_pct)

            if 0 <= humedad_pct <= 100:

                guardar_medicion(
                    sensor="humedad_suelo",
                    valor=humedad_pct,
                    ubicacion=ubicacion,
                    tipo=tipo,
                    dispositivo=dispositivo
                )

            else:

                print(
                    f"[ERROR] Humedad fuera de rango: "
                    f"{humedad_pct}"
                )

        except (TypeError, ValueError):

            print(
                "[ERROR] humedad_pct no es numérico."
            )


    # ------------------------------------------------------------
    # TEMPERATURA
    # ------------------------------------------------------------

    temperatura_c = datos.get("temperatura_c")

    if temperatura_c is not None:

        try:

            temperatura_c = float(temperatura_c)

            guardar_medicion(
                sensor="temperatura",
                valor=temperatura_c,
                ubicacion=ubicacion,
                tipo=tipo,
                dispositivo=dispositivo
            )

        except (TypeError, ValueError):

            print(
                "[ERROR] temperatura_c no es numérico."
            )


    # ------------------------------------------------------------
    # LUZ
    # ------------------------------------------------------------

    luz_raw = datos.get("luz_raw")

    if luz_raw is not None:

        try:

            luz_raw = float(luz_raw)

            guardar_medicion(
                sensor="luz",
                valor=luz_raw,
                ubicacion=ubicacion,
                tipo=tipo,
                dispositivo=dispositivo
            )

        except (TypeError, ValueError):

            print(
                "[ERROR] luz_raw no es numérico."
            )


# ================================================================
# MAIN
# ================================================================

def main():

    print(
        "--- INICIANDO WORKER DE INGESTIÓN IOT ---"
    )

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

        print(
            "\n[INFO] Apagando worker..."
        )

    finally:

        client.disconnect()
        influx_client.close()

        print(
            "[INFO] Worker detenido."
        )


# ================================================================
# ENTRY POINT
# ================================================================

if __name__ == "__main__":
    main()

