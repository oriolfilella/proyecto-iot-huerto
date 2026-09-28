#include "sensor.h"

#include <stdbool.h>

#include "esp_adc/adc_cali.h"
#include "esp_adc/adc_cali_scheme.h"
#include "esp_adc/adc_oneshot.h"
#include "esp_err.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "app_config.h"
#include "mqtt.h"

static const char *TAG = "HUERTO_SENSOR";

static adc_oneshot_unit_handle_t adc1_handle = NULL;
static adc_cali_handle_t cali_handle = NULL;
static bool cali_enable = false;

int calcular_humedad_porcentaje(int voltaje_mv)
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

    ESP_ERROR_CHECK(adc_oneshot_new_unit(&init_config, &adc1_handle));

    adc_oneshot_chan_cfg_t channel_config = {
        .atten = ADC_ATTEN_DB_12,
        .bitwidth = ADC_BITWIDTH_DEFAULT,
    };

    ESP_ERROR_CHECK(adc_oneshot_config_channel(
        adc1_handle,
        SENSOR_ADC_CHANNEL,
        &channel_config
    ));

#if ADC_CALI_SCHEME_LINE_FITTING_SUPPORTED
    adc_cali_line_fitting_config_t cali_config = {
        .unit_id = ADC_UNIT_1,
        .atten = ADC_ATTEN_DB_12,
        .bitwidth = ADC_BITWIDTH_DEFAULT,
    };

    esp_err_t ret = adc_cali_create_scheme_line_fitting(&cali_config, &cali_handle);

    if (ret == ESP_OK) {
        cali_enable = true;
        ESP_LOGI(TAG, "[ADC] Calibración habilitada.");
    }
    else {
        ESP_LOGW(TAG, "[ADC] No se pudo habilitar la calibración.");
    }
#else
    ESP_LOGW(TAG, "[ADC] Line fitting no soportado.");
#endif
}

void sensor_task(void *pvParameters)
{
    int adc_raw_value = 0;
    int voltaje_mv = 0;

    ESP_LOGI(TAG, "[SENSOR] Tarea de sensores iniciada.");

    while (true) {
        esp_err_t ret = adc_oneshot_read(
            adc1_handle,
            SENSOR_ADC_CHANNEL,
            &adc_raw_value
        );

        if (ret == ESP_OK) {
            if (cali_enable) {
                ret = adc_cali_raw_to_voltage(cali_handle, adc_raw_value, &voltaje_mv);

                if (ret != ESP_OK) {
                    ESP_LOGE(TAG, "[ADC] Error convirtiendo a voltaje: %s",
                             esp_err_to_name(ret));
                    vTaskDelay(pdMS_TO_TICKS(2000));
                    continue;
                }
            }
            else {
                ESP_LOGW(TAG, "[ADC] Calibración no disponible.");
                vTaskDelay(pdMS_TO_TICKS(2000));
                continue;
            }

            int humedad_pct = calcular_humedad_porcentaje(voltaje_mv);

            ESP_LOGI(TAG, "[DATOS] Raw: %4d | Voltaje: %4d mV | Humedad: %3d %%",
                     adc_raw_value,
                     voltaje_mv,
                     humedad_pct);

            if (mqtt_is_connected()) {
                mqtt_publish_sensor_data(humedad_pct, voltaje_mv);
            }
            else {
                ESP_LOGW(TAG, "[MQTT] No conectado. Datos no enviados.");
            }
        }
        else {
            ESP_LOGE(TAG, "[ADC] Error leyendo ADC: %s",
                     esp_err_to_name(ret));
        }

        vTaskDelay(pdMS_TO_TICKS(2000));
    }
}
