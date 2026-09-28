#ifndef TELEMETRIA_H
#define TELEMETRIA_H

#include <stdbool.h>

// ================================================================
// ESTRUCTURA DE TELEMETRÍA
// ================================================================

typedef struct
{
    // Sensor de humedad del suelo
    int humedad_suelo_pct;
    int humedad_suelo_mv;

    // Sensor de temperatura
    float temperatura_c;

    // Sensor de luz
    int luz_raw;

    // Estado de los sensores
    bool suelo_ok;
    bool temperatura_ok;
    bool luz_ok;

} telemetria_nodo_t;

#endif // TELEMETRIA_H
