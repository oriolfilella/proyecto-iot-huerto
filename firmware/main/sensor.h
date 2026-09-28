#ifndef SENSOR_H
#define SENSOR_H

void sensor_init(void);
void sensor_task(void *pvParameters);
int calcular_humedad_porcentaje(int voltaje_mv);

#endif
