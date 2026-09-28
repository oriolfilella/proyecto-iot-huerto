import { InfluxDB } from "@influxdata/influxdb-client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type TelemetryRow = {
  _time?: string;
  humedad_pct?: number | string;
  voltaje_mv?: number | string;
  sensor?: string;
};

export async function GET() {
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

  const query = `
    from(bucket: ${JSON.stringify(bucket)})
      |> range(start: -24h)
      |> filter(fn: (r) => r._measurement == "telemetria_suelo")
      |> filter(fn: (r) => r._field == "humedad_pct" or r._field == "voltaje_mv")
      |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
      |> sort(columns: ["_time"], desc: true)
      |> limit(n: 100)
  `;

  try {
    const influx = new InfluxDB({ url, token });
    const rows: TelemetryRow[] = [];

    await influx.getQueryApi(org).queryRows(query, {
      next(row, tableMeta) {
        const record = tableMeta.toObject(row) as TelemetryRow;
        rows.push({
          _time: record._time,
          humedad_pct: Number(record.humedad_pct),
          voltaje_mv: Number(record.voltaje_mv),
          sensor: record.sensor,
        });
      },
      error(error) {
        throw error;
      },
      complete() {},
    });

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
