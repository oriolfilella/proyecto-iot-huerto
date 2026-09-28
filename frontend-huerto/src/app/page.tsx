"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Telemetry = {
  _time?: string;
  humedad_pct: number;
  voltaje_mv: number;
  sensor?: string;
};

const formatDate = (value?: string) =>
  value
    ? new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "Sin fecha";

export default function Home() {
  const [readings, setReadings] = useState<Telemetry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadReadings = async () => {
      try {
        const response = await fetch("/api/telemetry", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "No se pudieron cargar las lecturas.");
        }
        setReadings(data);
        setError("");
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudieron cargar las lecturas.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadReadings();
    const interval = window.setInterval(loadReadings, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const latest = readings[0];
  const chartData = [...readings].reverse().map((reading) => ({
    ...reading,
    hora: formatDate(reading._time),
  }));

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Telemetría IoT · Lleida</p>
          <h1>Estado del huerto</h1>
          <p className="subtitle">Níspero 1 · Sensor de humedad del suelo</p>
        </div>
        <div className="live-status">
          <span /> Actualización automática
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      <section className="metric-grid" aria-label="Última lectura">
        <article className="metric-card metric-primary">
          <span>Humedad actual</span>
          <strong>{loading ? "--" : `${latest?.humedad_pct ?? "--"}%`}</strong>
          <small>{latest ? formatDate(latest._time) : "Esperando datos"}</small>
        </article>
        <article className="metric-card">
          <span>Voltaje del sensor</span>
          <strong>{loading ? "--" : `${latest?.voltaje_mv ?? "--"} mV`}</strong>
          <small>Lectura analógica calibrada</small>
        </article>
        <article className="metric-card">
          <span>Registros visibles</span>
          <strong>{loading ? "--" : readings.length}</strong>
          <small>Últimas 24 horas</small>
        </article>
      </section>

      <section className="panel chart-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Últimas 24 horas</p>
            <h2>Evolución de las lecturas</h2>
          </div>
          <div className="legend-note">
            <i /> Humedad <i className="voltaje-dot" /> Voltaje
          </div>
        </div>
        <div className="chart-wrap">
          {loading ? (
            <div className="empty-state">Cargando lecturas...</div>
          ) : chartData.length === 0 ? (
            <div className="empty-state">Todavía no hay datos del ESP32.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 12, left: -18, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="#dfe7df"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="hora"
                  tick={{ fill: "#657267", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                />
                <YAxis
                  yAxisId="humidity"
                  domain={[0, 100]}
                  tick={{ fill: "#657267", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                />
                <YAxis
                  yAxisId="voltage"
                  orientation="right"
                  domain={[0, "auto"]}
                  hide
                />
                <Tooltip
                  labelFormatter={(value) => `Hora: ${value}`}
                  formatter={(value, name) => [
                    name === "humedad_pct" ? `${value}%` : `${value} mV`,
                    name === "humedad_pct" ? "Humedad" : "Voltaje",
                  ]}
                />
                <Legend
                  formatter={(value) =>
                    value === "humedad_pct" ? "Humedad" : "Voltaje"
                  }
                />
                <Line
                  yAxisId="humidity"
                  type="monotone"
                  dataKey="humedad_pct"
                  stroke="#2f7d59"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId="voltage"
                  type="monotone"
                  dataKey="voltaje_mv"
                  stroke="#e38b42"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Datos recibidos</p>
            <h2>Histórico reciente</h2>
          </div>
          <span className="record-count">{readings.length} lecturas</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Humedad</th>
                <th>Voltaje</th>
                <th>Sensor</th>
              </tr>
            </thead>
            <tbody>
              {readings.map((reading, index) => (
                <tr key={`${reading._time}-${index}`}>
                  <td>{formatDate(reading._time)}</td>
                  <td>
                    <span className="humidity-value">
                      {reading.humedad_pct}%
                    </span>
                  </td>
                  <td>{reading.voltaje_mv} mV</td>
                  <td>{reading.sensor ?? "humedad"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && readings.length === 0 && (
            <div className="empty-state">Sin lecturas para mostrar.</div>
          )}
        </div>
      </section>
    </main>
  );
}
