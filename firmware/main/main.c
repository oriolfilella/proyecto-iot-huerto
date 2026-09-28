#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "esp_log.h"
#include "esp_err.h"

#include "nvs_flash.h"

#include "sensor.h"
#include "wifi.h"

static const char *TAG = "HUERTO_NODE";

static void init_nvs(void)
{
    esp_err_t ret = nvs_flash_init();

    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_LOGW(TAG, "[NVS] Borrando NVS...");
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }

    ESP_ERROR_CHECK(ret);
}

void app_main(void)
{
    ESP_LOGI(TAG, "====================================");
    ESP_LOGI(TAG, "       HUERTO NODE - INICIO");
    ESP_LOGI(TAG, "====================================");

    init_nvs();
    wifi_init_sta();
    sensor_init();

    BaseType_t task_ret = xTaskCreate(
        sensor_task,
        "sensor_task",
        4096,
        NULL,
        5,
        NULL
    );

    if (task_ret != pdPASS) {
        ESP_LOGE(TAG, "[TASK] No se pudo crear sensor_task.");
        return;
    }

    ESP_LOGI(TAG, "[SYSTEM] Inicialización completada.");
}
