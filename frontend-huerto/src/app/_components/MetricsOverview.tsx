import {
  formatPeriodDate,
  type Period,
  type SensorOption,
  type Telemetry,
} from "../_lib/telemetry";
import SensorSelector from "./SensorSelector";

type MetricsOverviewProps = {
  latest?: Telemetry;
  sensors: SensorOption[];
  selectedSensorId: string;
  onSensorChange: (sensorId: string) => void;
  sensorsLoading: boolean;
  loading: boolean;
  period: Period;
};

export default function MetricsOverview({
  latest,
  sensors,
  selectedSensorId,
  onSensorChange,
  sensorsLoading,
  loading,
  period,
}: MetricsOverviewProps) {
  return (
    <section className="metric-grid" aria-label="Resumen de humedad">
      <article className="metric-card metric-primary">
        <span>Media del intervalo más reciente</span>
        <strong>
          {loading ? "--" : `${latest?.humedad_media.toFixed(1) ?? "--"}%`}
        </strong>
        <small>
          {latest ? formatPeriodDate(latest._time, period) : "Esperando datos"}
        </small>
      </article>
      <SensorSelector
        sensors={sensors}
        selectedSensorId={selectedSensorId}
        onChange={onSensorChange}
        loading={sensorsLoading}
      />
    </section>
  );
}
