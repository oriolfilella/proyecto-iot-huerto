#include <stdio.h>
#include <stdbool.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "esp_log.h"
#include "esp_err.h"

#include "esp_adc/adc_oneshot.h"
#include "esp_adc/adc_cali.h"
#include "esp_adc/adc_cali_scheme.h"

#include "mqtt.h"
#include "sensor.h"

static const char *TAG = "HUERTO_NODE";

#define SENSOR_ADC_CHANNEL ADC_CHANNEL_6
#define VOLTAJE_SECO_MV 2800
#define VOLTAJE_AGUA_MV 1200

static adc_oneshot_unit_handle_t adc1_handle = NULL;
static adc_cali_handle_t cali_handle = NULL;
static bool cali_enable = false;

static int calcular_humedad_porcentaje(int voltaje_mv)
{
    if (voltaje_mv >= VOLTAJE_SECO_MV) {
        return 0;
    }

    if (voltaje_mv <= VOLTAJE_AGUA_MV) {
        return 100;
    }

    int rango_mv = VOLTAJE_SECO_MV - VOLTAJE_AGUA_MV;
    int delta_actual = VOLTAJE_SECO_MV - voltaje_mv;

    return (delta_actual * 100) / rango_mv;
}

void sensor_init(void)
{
    adc_oneshot_unit_init_cfg_t init_config = {
        .unit_id = ADC_UNIT_1,
    };

    esp_err_t ret = adc_oneshot_new_unit(&init_config, &adc1_handle);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "[ADC] Error inicializando ADC: %s", esp_err_to_name(ret));
        ESP_ERROR_CHECK(ret);
    }

    adc_oneshot_chan_cfg_t channel_config = {
        .atten = ADC_ATTEN_DB_12,
        .bitwidth = ADC_BITWIDTH_DEFAULT,
    };

    ret = adc_oneshot_config_channel(adc1_handle, SENSOR_ADC_CHANNEL, &channel_config);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "[ADC] Error configurando canal ADC: %s", esp_err_to_name(ret));
        ESP_ERROR_CHECK(ret);
    }

#if ADC_CALI_SCHEME_LINE_FITTING_SUPPORTED
    adc_cali_line_fitting_config_t cali_config = {
        .unit_id = ADC_UNIT_1,
        .atten = ADC_ATTEN_DB_12,
        .bitwidth = ADC_BITWIDTH_DEFAULT,
    };

    ret = adc_cali_create_scheme_line_fitting(&cali_config, &cali_handle);

    if (ret == ESP_OK) {
        cali_enable = true;
        ESP_LOGI(TAG, "[ADC] Calibración habilitada.");
    } else {
        ESP_LOGW(TAG, "[ADC] No se pudo habilitar la calibración: %s", esp_err_to_name(ret));
    }
#else
    ESP_LOGW(TAG, "[ADC] Line fitting no soportado.");
#endif
}

void leer_sensor_suelo(telemetria_nodo_t *datos)
{
    int raw = 0;
    int voltaje_mv = 0;

    if (datos == NULL) {
        ESP_LOGE(TAG, "[SUELO] Puntero de telemetría NULL.");
        return;
    }

    if (adc1_handle == NULL) {
        ESP_LOGE(TAG, "[SUELO] ADC no inicializado.");
        return;
    }

    esp_err_t ret = adc_oneshot_read(adc1_handle, SENSOR_ADC_CHANNEL, &raw);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "[SUELO] Error leyendo ADC: %s", esp_err_to_name(ret));
        datos->suelo_ok = false;
        return;
    }

    if (!cali_enable || cali_handle == NULL) {
        ESP_LOGW(TAG, "[SUELO] Calibración no disponible.");
        datos->suelo_ok = false;
        return;
    }

    ret = adc_cali_raw_to_voltage(cali_handle, raw, &voltaje_mv);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "[SUELO] Error convirtiendo ADC a mV: %s", esp_err_to_name(ret));
        datos->suelo_ok = false;
        return;
    }

    datos->humedad_suelo_mv = voltaje_mv;
    datos->humedad_suelo_pct = calcular_humedad_porcentaje(voltaje_mv);
    datos->suelo_ok = true;

    ESP_LOGI(TAG, "[SUELO] Raw: %d | Voltaje: %d mV | Humedad: %d %%", raw, voltaje_mv, datos->humedad_suelo_pct);
}

void leer_sensor_temperatura(telemetria_nodo_t *datos)
{
    if (datos == NULL) {
        ESP_LOGE(TAG, "[TEMP] Puntero de telemetría NULL.");
        return;
    }

    datos->temperatura_c = 23.5f;
    datos->temperatura_ok = true;

    ESP_LOGI(TAG, "[TEMP] Temperatura: %.1f °C", datos->temperatura_c);
}

void leer_sensor_luz(telemetria_nodo_t *datos)
{
    if (datos == NULL) {
        ESP_LOGE(TAG, "[LUZ] Puntero de telemetría NULL.");
        return;
    }

    datos->luz_raw = 450;
    datos->luz_ok = true;

    ESP_LOGI(TAG, "[LUZ] Valor RAW: %d", datos->luz_raw);
}

void sensor_task(void *pvParameters)
{
    ESP_LOGI(TAG, "[SENSOR] Tarea de sensores iniciada.");

    while (true) {
        telemetria_nodo_t telemetria = {0};

        leer_sensor_suelo(&telemetria);
        leer_sensor_temperatura(&telemetria);
        leer_sensor_luz(&telemetria);

        esp_err_t ret = mqtt_publicar_telemetria(&telemetria);
        if (ret != ESP_OK && ret != ESP_ERR_INVALID_STATE) {
            ESP_LOGW(TAG, "[SENSOR] No se pudo publicar: %s", esp_err_to_name(ret));
        }

        vTaskDelay(pdMS_TO_TICKS(5000));
    }
}
