import {
  formatPeriodDate,
  periodDescription,
  type Period,
  type Telemetry,
} from "../_lib/telemetry";
import AverageSearch from "./AverageSearch";
import PeriodSelector from "./PeriodSelector";

type TelemetryTableProps = {
  period: Period;
  onPeriodChange: (period: Period) => void;
  readings: Telemetry[];
  loading: boolean;
  sensorId: string;
};

export default function TelemetryTable({
  period,
  onPeriodChange,
  readings,
  loading,
  sensorId,
}: TelemetryTableProps) {
  return (
    <section className="panel table-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{periodDescription(period)}</p>
        </div>
        <div className="table-heading-actions">
          <PeriodSelector
            value={period}
            onChange={onPeriodChange}
            ariaLabel="Periodo de la tabla"
          />
          <span className="record-count">{readings.length} intervalos</span>
        </div>
      </div>
      <AverageSearch sensorId={sensorId} />
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Fecha y hora</th>
              <th>Humedad media</th>
              <th>Humedad mínima</th>
              <th>Humedad máxima</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((reading) => (
              <tr key={reading._time}>
                <td>{formatPeriodDate(reading._time, period)}</td>
                <td>
                  <span className="humidity-value">
                    {reading.humedad_media.toFixed(1)}%
                  </span>
                </td>
                <td>{reading.humedad_minima.toFixed(1)}%</td>
                <td>{reading.humedad_maxima.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && readings.length === 0 && (
          <div className="empty-state">Sin lecturas para mostrar.</div>
        )}
      </div>
    </section>
  );
}
