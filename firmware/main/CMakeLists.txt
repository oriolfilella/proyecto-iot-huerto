idf_component_register(
    SRCS "main.c" "sensor.c" "wifi.c" "mqtt.c"
    INCLUDE_DIRS "."
    REQUIRES mqtt nvs_flash esp_wifi esp_event esp_netif esp_adc
)