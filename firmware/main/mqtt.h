#ifndef MQTT_H
#define MQTT_H

#include <stdbool.h>

#include "esp_err.h"

#include "telemetria.h"

extern volatile bool mqtt_conectado;

esp_err_t mqtt_start(void);
esp_err_t mqtt_publicar_telemetria(const telemetria_nodo_t *datos);

#endif // MQTT_H
