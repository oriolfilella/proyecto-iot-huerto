import { useState, type FormEvent } from "react";
import {
  dateInputValue,
  dateTimeInputValue,
  getAverageRange,
  type AveragePeriod,
  type AverageResult,
} from "../_lib/telemetry";

export default function AverageSearch({ sensorId }: { sensorId: string }) {
  const [period, setPeriod] = useState<AveragePeriod>("day");
  const [date, setDate] = useState(() => dateInputValue(new Date()));
  const [hour, setHour] = useState(() => {
    const currentHour = new Date();
    currentHour.setMinutes(0, 0, 0);
    return dateTimeInputValue(currentHour);
  });
  const [month, setMonth] = useState(() =>
    dateInputValue(new Date()).slice(0, 7),
  );
  const [result, setResult] = useState<AverageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchAverage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const selection =
        period === "hour" ? hour : period === "month" ? month : date;
      const range = getAverageRange(period, selection);
      const now = new Date();
      if (range.start.getTime() >= now.getTime()) {
        throw new Error("El periodo seleccionado todavía no ha comenzado.");
      }
      // Si se consulta el periodo actual, limita el final a los datos ya recibidos.
      const stop = new Date(Math.min(range.end.getTime(), now.getTime()));
      const params = new URLSearchParams({
        start: range.start.toISOString(),
        stop: stop.toISOString(),
        sensor: sensorId,
      });
      const response = await fetch(`/api/telemetry?${params.toString()}`, {
        cache: "no-store",
      });
      const data: { average?: unknown; error?: string } = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo calcular la media.");
      }
      setResult({
        value: typeof data.average === "number" ? data.average : null,
        label: range.label,
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo calcular la media.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="average-search">
      <form onSubmit={searchAverage}>
        <label className="average-field" htmlFor="average-period">
          Media de
          <select
            id="average-period"
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value as AveragePeriod);
              setResult(null);
            }}
          >
            <option value="hour">Una hora</option>
            <option value="day">Un día</option>
            <option value="week">Una semana</option>
            <option value="month">Un mes</option>
          </select>
        </label>
        {period === "hour" ? (
          <label className="average-field" htmlFor="average-hour">
            Fecha y hora
            <input
              id="average-hour"
              type="datetime-local"
              step={3600}
              max={dateTimeInputValue(new Date())}
              value={hour}
              onChange={(event) => {
                setHour(event.target.value);
                setResult(null);
              }}
              required
            />
          </label>
        ) : period === "month" ? (
          <label className="average-field" htmlFor="average-month">
            Mes
            <input
              id="average-month"
              type="month"
              max={dateInputValue(new Date()).slice(0, 7)}
              value={month}
              onChange={(event) => {
                setMonth(event.target.value);
                setResult(null);
              }}
              required
            />
          </label>
        ) : (
          <label className="average-field" htmlFor="average-date">
            {period === "week" ? "Fecha de la semana" : "Día"}
            <input
              id="average-date"
              type="date"
              max={dateInputValue(new Date())}
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                setResult(null);
              }}
              required
            />
          </label>
        )}
        <button type="submit" disabled={loading || !sensorId}>
          {loading ? "Calculando..." : "Calcular media"}
        </button>
      </form>
      {(result || error) && (
        <div
          className={`average-result${error ? " has-error" : ""}`}
          role="status"
          aria-live="polite"
        >
          {error ? (
            error
          ) : result?.value === null ? (
            `Sin lecturas para ${result.label}.`
          ) : (
            <>
              <span>Media de {result?.label}</span>
              <strong>{result?.value.toFixed(1)}%</strong>
            </>
          )}
        </div>
      )}
    </div>
  );
}
