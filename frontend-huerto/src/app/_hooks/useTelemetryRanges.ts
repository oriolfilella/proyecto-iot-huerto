import { useEffect, useState } from "react";
import {
  apiRange,
  type ConnectionStatus,
  type Period,
  type SensorOption,
  type Telemetry,
} from "../_lib/telemetry";

export function useTelemetryRanges(chartPeriod: Period, tablePeriod: Period) {
  const [chartReadings, setChartReadings] = useState<Telemetry[]>([]);
  const [tableReadings, setTableReadings] = useState<Telemetry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("checking");
  const [lastVerifiedAt, setLastVerifiedAt] = useState<Date | null>(null);
  const [sensors, setSensors] = useState<SensorOption[]>([]);
  const [selectedSensorId, setSelectedSensorId] = useState("");
  const [sensorsLoading, setSensorsLoading] = useState(true);

  // El catálogo se refresca para descubrir dispositivos nuevos sin recargar la página.
  useEffect(() => {
    let active = true;
    let initialLoad = true;

    const loadSensors = async () => {
      try {
        const response = await fetch("/api/telemetry?sensors=1", {
          cache: "no-store",
        });
        const data: SensorOption[] = await response.json();
        if (!response.ok) {
          throw new Error("No se pudo cargar la lista de sensores.");
        }
        if (!active) return;

        setSensors(data);
        setSelectedSensorId((current) =>
          data.some((sensor) => sensor.id === current)
            ? current
            : (data[0]?.id ?? ""),
        );
        if (initialLoad) {
          setConnectionStatus("connected");
          setError("");
          setLastVerifiedAt(new Date());
        }
      } catch (requestError) {
        if (!active || !initialLoad) return;
        setConnectionStatus("error");
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudo cargar la lista de sensores.",
        );
      } finally {
        if (active) setSensorsLoading(false);
        initialLoad = false;
      }
    };

    loadSensors();
    const interval = window.setInterval(loadSensors, 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  // Gráfica y tabla pueden usar ventanas distintas, pero siempre el mismo sensor.
  useEffect(() => {
    let active = true;

    if (!selectedSensorId) {
      if (!sensorsLoading) {
        setChartReadings([]);
        setTableReadings([]);
        setLoading(false);
      }
      return;
    }

    const loadReadings = async () => {
      try {
        const chartParams = new URLSearchParams({
          range: apiRange[chartPeriod],
          sensor: selectedSensorId,
        });
        const tableParams = new URLSearchParams({
          range: apiRange[tablePeriod],
          sensor: selectedSensorId,
        });
        const responses = await Promise.all([
          fetch(`/api/telemetry?${chartParams.toString()}`, {
            cache: "no-store",
          }),
          fetch(`/api/telemetry?${tableParams.toString()}`, {
            cache: "no-store",
          }),
        ]);
        const data = await Promise.all(
          responses.map((response) => response.json()),
        );
        const failedRequest = responses.findIndex((response) => !response.ok);
        if (failedRequest !== -1) {
          throw new Error(
            data[failedRequest].error ?? "No se pudieron cargar las lecturas.",
          );
        }
        // Descarta respuestas antiguas si cambió el sensor o el rango durante la petición.
        if (!active) return;

        setChartReadings(data[0]);
        setTableReadings(data[1]);
        setError("");
        setConnectionStatus("connected");
        setLastVerifiedAt(new Date());
      } catch (requestError) {
        if (!active) return;
        setConnectionStatus("error");
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudieron cargar las lecturas.",
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    setLoading(true);
    setConnectionStatus("checking");
    loadReadings();
    const interval = window.setInterval(loadReadings, 30_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [chartPeriod, tablePeriod, selectedSensorId, sensorsLoading]);

  return {
    sensors,
    selectedSensorId,
    setSelectedSensorId,
    sensorsLoading,
    chartReadings,
    tableReadings,
    loading,
    error,
    connectionStatus,
    lastVerifiedAt,
  };
}
