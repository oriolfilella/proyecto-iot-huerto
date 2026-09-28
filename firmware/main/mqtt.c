#include "mqtt.h"

#include <stdbool.h>
#include <stdio.h>

#include "esp_err.h"
#include "esp_event.h"
#include "esp_log.h"

#include "mqtt_client.h"

#include "app_config.h"

static const char *TAG = "HUERTO_MQTT";

static esp_mqtt_client_handle_t mqtt_client = NULL;
static volatile bool mqtt_conectado = false;

static void mqtt_event_handler(
    void *handler_args,
    esp_event_base_t base,
    int32_t event_id,
    void *event_data
)
{
    switch ((esp_mqtt_event_id_t)event_id) {
        case MQTT_EVENT_CONNECTED:
            ESP_LOGI(TAG, "[MQTT] Conectado al broker.");
            mqtt_conectado = true;
            break;

        case MQTT_EVENT_DISCONNECTED:
            ESP_LOGW(TAG, "[MQTT] Desconectado del broker.");
            mqtt_conectado = false;
            break;

        case MQTT_EVENT_PUBLISHED:
            ESP_LOGI(TAG, "[MQTT] Mensaje publicado correctamente.");
            break;

        case MQTT_EVENT_ERROR:
            ESP_LOGE(TAG, "[MQTT] Error en la conexión MQTT.");
            break;

        default:
            break;
    }
}

void mqtt_start(void)
{
    if (mqtt_client != NULL) {
        ESP_LOGI(TAG, "[MQTT] El cliente ya está creado.");
        return;
    }

    ESP_LOGI(TAG, "[MQTT] Iniciando cliente MQTT...");

    esp_mqtt_client_config_t mqtt_cfg = {
        .broker.address.uri = MQTT_BROKER_URI,
    };

    mqtt_client = esp_mqtt_client_init(&mqtt_cfg);

    if (mqtt_client == NULL) {
        ESP_LOGE(TAG, "[MQTT] No se pudo crear el cliente MQTT.");
        return;
    }

    esp_err_t ret = esp_mqtt_client_register_event(
        mqtt_client,
        ESP_EVENT_ANY_ID,
        mqtt_event_handler,
        NULL
    );

    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "[MQTT] Error registrando event handler: %s",
                 esp_err_to_name(ret));
        mqtt_client = NULL;
        return;
    }

    ret = esp_mqtt_client_start(mqtt_client);

    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "[MQTT] Error iniciando MQTT: %s",
                 esp_err_to_name(ret));
        mqtt_client = NULL;
        return;
    }
}

bool mqtt_is_connected(void)
{
    return mqtt_conectado && mqtt_client != NULL;
}

int mqtt_publish_sensor_data(int humedad_pct, int voltaje_mv)
{
    if (!mqtt_is_connected()) {
        ESP_LOGW(TAG, "[MQTT] No conectado. Datos no enviados.");
        return -1;
    }

    char payload_json[100];
    int ret_snprintf = snprintf(
        payload_json,
        sizeof(payload_json),
        "{\"humedad_pct\": %d, \"voltaje_mv\": %d}",
        humedad_pct,
        voltaje_mv
    );

    if (ret_snprintf < 0 || ret_snprintf >= (int)sizeof(payload_json)) {
        ESP_LOGE(TAG, "[MQTT] Error construyendo JSON.");
        return -1;
    }

    int msg_id = esp_mqtt_client_publish(
        mqtt_client,
        MQTT_TOPIC,
        payload_json,
        0,
        1,
        0
    );

    if (msg_id >= 0) {
        ESP_LOGI(TAG, "[MQTT] Publicado -> %s: %s",
                 MQTT_TOPIC,
                 payload_json);
    }
    else {
        ESP_LOGE(TAG, "[MQTT] Error publicando mensaje.");
    }

    return msg_id;
}
