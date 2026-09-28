import type { ConnectionStatus } from "../_lib/telemetry";

type DashboardHeaderProps = {
  connectionStatus: ConnectionStatus;
  lastVerifiedAt: Date | null;
  selectedSensorLabel?: string;
};

export default function DashboardHeader({
  connectionStatus,
  lastVerifiedAt,
  selectedSensorLabel,
}: DashboardHeaderProps) {
  return (
    <header className="dashboard-header">
      <div>
        <p className="eyebrow">Telemetría IoT · Lleida</p>
        <h1>Estado del huerto</h1>
        <p className="subtitle">
          {selectedSensorLabel
            ? `Sensor seleccionado · ${selectedSensorLabel}`
            : "No hay sensores con datos recientes"}
        </p>
      </div>
      <div
        className="live-status"
        data-status={connectionStatus}
        role="status"
        aria-live="polite"
      >
        <span />
        {connectionStatus === "checking"
          ? "Comprobando conexión con InfluxDB..."
          : connectionStatus === "connected"
            ? `InfluxDB conectado · Verificado ${lastVerifiedAt?.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
            : "Sin conexión con InfluxDB"}
      </div>
    </header>
  );
}
