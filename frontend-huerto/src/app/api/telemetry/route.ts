import { InfluxDB } from "@influxdata/influxdb-client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type TelemetryRow = {
  _time?: string;
  humedad_pct?: number | string;
  sensor?: string;
};

type AggregateTelemetryRow = {
  _time?: string;
  humedad_media: number;
  humedad_minima: number;
  humedad_maxima: number;
};

type SensorIdentity = {
  location: string;
  type: string;
  device: string;
  sensor: string;
};

type SensorOption = {
  id: string;
  label: string;
};

// Serializar los cuatro tags evita colisiones entre dispositivos con nombres repetidos.
const parseSensorIdentity = (value: string | null): SensorIdentity | null => {
  if (!value) return null;
  try {
    const parts: unknown = JSON.parse(value);
    if (
      !Array.isArray(parts) ||
      parts.length !== 4 ||
      parts.some(
        (part) => typeof part !== "string" || !part || part.length > 128,
      )
    ) {
      return null;
    }
    return {
      location: parts[0],
      type: parts[1],
      device: parts[2],
      sensor: parts[3],
    };
  } catch {
    return null;
  }
};

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const startParam = searchParams.get("start");
  const stopParam = searchParams.get("stop");
  const hasAverageRange = startParam !== null || stopParam !== null;
  const sensorsParam = searchParams.get("sensors");
  const isSensorsRequest = sensorsParam === "1";
  const sensorParam = searchParams.get("sensor");
  const sensorIdentity = parseSensorIdentity(sensorParam);
  if (
    (sensorsParam !== null && !isSensorsRequest) ||
    (sensorParam !== null && !sensorIdentity) ||
    (isSensorsRequest && (hasAverageRange || searchParams.has("range")))
  ) {
    return NextResponse.json(
      { error: "Los parámetros de sensor no son válidos." },
      { status: 400 },
    );
  }

  const aggregateRange = searchParams.get("range");
  const hasAggregateRange = aggregateRange !== null;
  const aggregateWindows = {
    "10min": { lookback: "-10m", every: "10s" },
    dia: { lookback: "-24h", every: "1h" },
    semana: { lookback: "-7d", every: "1d" },
    mes: { lookback: "-30d", every: "1d" },
  } as const;
  const aggregateWindow = aggregateRange
    ? aggregateWindows[aggregateRange as keyof typeof aggregateWindows]
    : undefined;
  let averageStart: Date | undefined;
  let averageStop: Date | undefined;

  if (hasAggregateRange && (!aggregateWindow || hasAverageRange)) {
    return NextResponse.json(
      { error: "El rango solicitado no es válido." },
      { status: 400 },
    );
  }

  if (hasAverageRange) {
    averageStart = new Date(startParam ?? "");
    averageStop = new Date(stopParam ?? "");
    const intervalMs = averageStop.getTime() - averageStart.getTime();
    if (
      !startParam ||
      !stopParam ||
      !Number.isFinite(averageStart.getTime()) ||
      !Number.isFinite(averageStop.getTime()) ||
      intervalMs <= 0 ||
      intervalMs > 32 * 24 * 60 * 60 * 1000 ||
      averageStop.getTime() > Date.now() + 60_000
    ) {
      return NextResponse.json(
        { error: "El intervalo solicitado no es válido." },
        { status: 400 },
      );
    }
  }

  // Los valores ya validados se escapan como literales Flux antes de filtrar.
  const sensorFilter = sensorIdentity
    ? `|> filter(fn: (r) => r.ubicacion == ${JSON.stringify(sensorIdentity.location)} and r.tipo == ${JSON.stringify(sensorIdentity.type)} and r.dispositivo == ${JSON.stringify(sensorIdentity.device)} and r.sensor == ${JSON.stringify(sensorIdentity.sensor)})`
    : "";

  const url = process.env.INFLUX_URL;
  const token = process.env.INFLUX_TOKEN;
  const org = process.env.INFLUX_ORG;
  const bucket = process.env.INFLUX_BUCKET;

  if (!url || !token || !org || !bucket) {
    return NextResponse.json(
      { error: "Faltan las variables de entorno de InfluxDB." },
      { status: 500 },
    );
  }

  // Una sola ruta sirve el catálogo, la media puntual y las ventanas agregadas.
  const query = isSensorsRequest
    ? `
        from(bucket: ${JSON.stringify(bucket)})
          |> range(start: -30d)
          |> filter(fn: (r) => r._measurement == "telemetria")
          |> filter(fn: (r) => r._field == "valor")
          |> filter(fn: (r) => r.sensor == "humedad_suelo")
          |> group(columns: ["ubicacion", "tipo", "dispositivo", "sensor"])
          |> last()
          |> keep(columns: ["ubicacion", "tipo", "dispositivo", "sensor"])
      `
    : hasAverageRange
      ? `
        from(bucket: ${JSON.stringify(bucket)})
          |> range(
            start: time(v: ${JSON.stringify(averageStart!.toISOString())}),
            stop: time(v: ${JSON.stringify(averageStop!.toISOString())})
          )
          |> filter(fn: (r) => r._measurement == "telemetria")
          |> filter(fn: (r) => r._field == "valor")
          |> filter(fn: (r) => r.sensor == "humedad_suelo")
          ${sensorFilter}
          |> group()
          |> mean()
      `
      : aggregateWindow
        ? `
          data = from(bucket: ${JSON.stringify(bucket)})
            |> range(start: ${aggregateWindow.lookback})
            |> filter(fn: (r) => r._measurement == "telemetria")
            |> filter(fn: (r) => r._field == "valor")
            |> filter(fn: (r) => r.sensor == "humedad_suelo")
            ${sensorFilter}
            |> group()

            // Las tres métricas se calculan en una consulta y se pivotan por ventana.
          meanData = data
            |> aggregateWindow(every: ${aggregateWindow.every}, fn: mean, createEmpty: false, timeSrc: "_start")
            |> set(key: "_field", value: "humedad_media")
          minData = data
            |> aggregateWindow(every: ${aggregateWindow.every}, fn: min, createEmpty: false, timeSrc: "_start")
            |> set(key: "_field", value: "humedad_minima")
          maxData = data
            |> aggregateWindow(every: ${aggregateWindow.every}, fn: max, createEmpty: false, timeSrc: "_start")
            |> set(key: "_field", value: "humedad_maxima")

          union(tables: [meanData, minData, maxData])
            |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
            |> sort(columns: ["_time"], desc: true)
        `
        : `
        from(bucket: ${JSON.stringify(bucket)})
          |> range(start: -30d)
          |> filter(fn: (r) => r._measurement == "telemetria")
          |> filter(fn: (r) => r._field == "valor")
          |> filter(fn: (r) => r.sensor == "humedad_suelo")
          ${sensorFilter}
          |> sort(columns: ["_time"], desc: true)
      `;

  try {
    const influx = new InfluxDB({ url, token });

    // collectRows espera (await) a que InfluxDB devuelva todas las filas
    const rawData = await influx.getQueryApi(org).collectRows(query);

    if (isSensorsRequest) {
      const options = new Map<string, SensorOption>();
      rawData.forEach((record: any) => {
        const identity: SensorIdentity = {
          location: record.ubicacion,
          type: record.tipo,
          device: record.dispositivo,
          sensor: record.sensor,
        };
        if (
          Object.values(identity).some(
            (value) => typeof value !== "string" || !value,
          )
        ) {
          return;
        }
        const id = JSON.stringify([
          identity.location,
          identity.type,
          identity.device,
          identity.sensor,
        ]);
        options.set(id, {
          id,
          label: `${identity.device} · ${identity.location} · ${identity.type} · ${identity.sensor}`,
        });
      });
      return NextResponse.json(
        [...options.values()].sort((first, second) =>
          first.label.localeCompare(second.label, "es"),
        ),
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (hasAverageRange) {
      const average = rawData.length
        ? Number((rawData[0] as { _value?: number | string })._value)
        : null;
      return NextResponse.json(
        {
          average:
            average !== null && Number.isFinite(average) ? average : null,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (aggregateWindow) {
      const rows: AggregateTelemetryRow[] = rawData.map((record: any) => ({
        _time: record._time,
        humedad_media: Number(record.humedad_media),
        humedad_minima: Number(record.humedad_minima),
        humedad_maxima: Number(record.humedad_maxima),
      }));
      return NextResponse.json(rows, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const rows: TelemetryRow[] = rawData.map((record: any) => ({
      _time: record._time,
      humedad_pct: Number(record._value),
      sensor: record.sensor,
    }));

    return NextResponse.json(rows, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Error consultando InfluxDB", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las lecturas del sensor." },
      { status: 502 },
    );
  }
}
