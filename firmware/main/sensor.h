#ifndef SENSOR_H
#define SENSOR_H

#include "telemetria.h"

void sensor_init(void);
void leer_sensor_suelo(telemetria_nodo_t *datos);
void leer_sensor_temperatura(telemetria_nodo_t *datos);
void leer_sensor_luz(telemetria_nodo_t *datos);
void sensor_task(void *pvParameters);

#endif // SENSOR_H
