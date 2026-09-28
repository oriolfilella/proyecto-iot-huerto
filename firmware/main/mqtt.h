#ifndef MQTT_H
#define MQTT_H

#include <stdbool.h>

void mqtt_start(void);
bool mqtt_is_connected(void);
int mqtt_publish_sensor_data(int humedad_pct, int voltaje_mv);

#endif
