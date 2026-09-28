#ifndef APP_CONFIG_H
#define APP_CONFIG_H

#include "esp_adc/adc_oneshot.h"

#define WIFI_SSID "Wokwi-GUEST"
#define WIFI_PASS ""

#define SENSOR_ADC_CHANNEL ADC_CHANNEL_6

#define VOLTAJE_SECO_MV 2800
#define VOLTAJE_AGUA_MV 1200

#define MQTT_BROKER_URI "mqtt://broker.hivemq.com"
#define MQTT_TOPIC "huerto/lleida/frutales/nispero_1/humedad"

#endif
