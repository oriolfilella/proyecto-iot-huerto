import type { SensorOption } from "../_lib/telemetry";

type SensorSelectorProps = {
  sensors: SensorOption[];
  selectedSensorId: string;
  onChange: (sensorId: string) => void;
  loading: boolean;
};

export default function SensorSelector({
  sensors,
  selectedSensorId,
  onChange,
  loading,
}: SensorSelectorProps) {
  // El id combina los tags de ubicación, tipo, árbol y sensor.
  return (
    <label className="metric-card sensor-selector" htmlFor="selected-sensor">
      <span>Sensor seleccionado</span>
      <select
        id="selected-sensor"
        value={selectedSensorId}
        disabled={loading || sensors.length === 0}
        onChange={(event) => onChange(event.target.value)}
      >
        {sensors.length === 0 ? (
          <option value="">Sin sensores detectados</option>
        ) : (
          sensors.map((sensor) => (
            <option key={sensor.id} value={sensor.id}>
              {sensor.label}
            </option>
          ))
        )}
      </select>
      <small>
        {loading
          ? "Buscando sensores..."
          : `${sensors.length} sensor${sensors.length === 1 ? "" : "es"} detectado${sensors.length === 1 ? "" : "s"}`}
      </small>
    </label>
  );
}
