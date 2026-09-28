#include <stdlib.h>

#include "esp_err.h"
#include "esp_log.h"
#include "esp_event.h"

#include "mqtt_client.h"
#include "cJSON.h"

#include "mqtt.h"

static const char *TAG = "HUERTO_NODE";

#define MQTT_BROKER_URI "mqtt://broker.hivemq.com"
#define MQTT_TOPIC "huerto/lleida/frutales/nispero_1/telemetria"

static esp_mqtt_client_handle_t mqtt_client = NULL;
volatile bool mqtt_conectado = false;

static void mqtt_event_handler(
    void *handler_args,
    esp_event_base_t base,
    int32_t event_id,
    void *event_data)
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
            ESP_LOGE(TAG, "[MQTT] Error MQTT.");
            break;

        default:
            break;
    }
}

esp_err_t mqtt_start(void)
{
    if (mqtt_client != NULL) {
        ESP_LOGI(TAG, "[MQTT] Cliente ya inicializado.");
        return ESP_OK;
    }

    ESP_LOGI(TAG, "[MQTT] Iniciando cliente MQTT...");

    esp_mqtt_client_config_t mqtt_cfg = {
        .broker.address.uri = MQTT_BROKER_URI,
    };

    mqtt_client = esp_mqtt_client_init(&mqtt_cfg);
    if (mqtt_client == NULL) {
        ESP_LOGE(TAG, "[MQTT] No se pudo crear el cliente.");
        return ESP_FAIL;
    }

    esp_err_t ret = esp_mqtt_client_register_event(
        mqtt_client,
        ESP_EVENT_ANY_ID,
        mqtt_event_handler,
        NULL
    );

    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "[MQTT] Error registrando handler: %s", esp_err_to_name(ret));
        mqtt_client = NULL;
        return ret;
    }

    ret = esp_mqtt_client_start(mqtt_client);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "[MQTT] Error iniciando MQTT: %s", esp_err_to_name(ret));
        mqtt_client = NULL;
        return ret;
    }

    return ESP_OK;
}

esp_err_t mqtt_publicar_telemetria(const telemetria_nodo_t *datos)
{
    if (datos == NULL) {
        ESP_LOGE(TAG, "[MQTT] Telemetría NULL.");
        return ESP_ERR_INVALID_ARG;
    }

    if (!mqtt_conectado || mqtt_client == NULL) {
        ESP_LOGW(TAG, "[MQTT] No conectado. Datos no enviados.");
        return ESP_ERR_INVALID_STATE;
    }

    cJSON *root = cJSON_CreateObject();
    if (root == NULL) {
        ESP_LOGE(TAG, "[MQTT] No se pudo crear objeto JSON.");
        return ESP_ERR_NO_MEM;
    }

    if (datos->suelo_ok) {
        if (cJSON_AddNumberToObject(root, "humedad_pct", datos->humedad_suelo_pct) == NULL) {
            ESP_LOGE(TAG, "[MQTT] Error añadiendo humedad.");
            cJSON_Delete(root);
            return ESP_ERR_NO_MEM;
        }

        if (cJSON_AddNumberToObject(root, "voltaje_mv", datos->humedad_suelo_mv) == NULL) {
            ESP_LOGE(TAG, "[MQTT] Error añadiendo voltaje.");
            cJSON_Delete(root);
            return ESP_ERR_NO_MEM;
        }
    }

    if (datos->temperatura_ok) {
        if (cJSON_AddNumberToObject(root, "temperatura_c", datos->temperatura_c) == NULL) {
            ESP_LOGE(TAG, "[MQTT] Error añadiendo temperatura.");
            cJSON_Delete(root);
            return ESP_ERR_NO_MEM;
        }
    }

    if (datos->luz_ok) {
        if (cJSON_AddNumberToObject(root, "luz_raw", datos->luz_raw) == NULL) {
            ESP_LOGE(TAG, "[MQTT] Error añadiendo luz.");
            cJSON_Delete(root);
            return ESP_ERR_NO_MEM;
        }
    }

    if (cJSON_GetArraySize(root) == 0) {
        ESP_LOGW(TAG, "[MQTT] No hay datos válidos para publicar.");
        cJSON_Delete(root);
        return ESP_ERR_INVALID_STATE;
    }

    char *json_string = cJSON_PrintUnformatted(root);
    if (json_string == NULL) {
        ESP_LOGE(TAG, "[MQTT] Error creando string JSON.");
        cJSON_Delete(root);
        return ESP_ERR_NO_MEM;
    }

    int msg_id = esp_mqtt_client_publish(mqtt_client, MQTT_TOPIC, json_string, 0, 1, 0);
    if (msg_id < 0) {
        ESP_LOGE(TAG, "[MQTT] Error publicando mensaje.");
        free(json_string);
        cJSON_Delete(root);
        return ESP_FAIL;
    }

    ESP_LOGI(TAG, "[MQTT] Publicado -> %s", json_string);

    free(json_string);
    cJSON_Delete(root);

    return ESP_OK;
}
