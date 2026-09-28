"use client";

import { useState } from "react";
import DashboardHeader from "./DashboardHeader";
import HumidityChart from "./HumidityChart";
import MetricsOverview from "./MetricsOverview";
import TelemetryTable from "./TelemetryTable";
import { useTelemetryRanges } from "../_hooks/useTelemetryRanges";
import type { Period } from "../_lib/telemetry";

export default function Dashboard() {
  const [chartPeriod, setChartPeriod] = useState<Period>("day");
  const [tablePeriod, setTablePeriod] = useState<Period>("day");
  // Este hook coordina rangos independientes con la selección compartida del sensor.
  const {
    chartReadings,
    tableReadings,
    sensors,
    selectedSensorId,
    setSelectedSensorId,
    sensorsLoading,
    loading,
    error,
    connectionStatus,
    lastVerifiedAt,
  } = useTelemetryRanges(chartPeriod, tablePeriod);

  return (
    <main className="dashboard-shell">
      <DashboardHeader
        connectionStatus={connectionStatus}
        lastVerifiedAt={lastVerifiedAt}
        selectedSensorLabel={
          sensors.find((sensor) => sensor.id === selectedSensorId)?.label
        }
      />
      {error && <div className="error-message">{error}</div>}
      <MetricsOverview
        latest={chartReadings[0]}
        sensors={sensors}
        selectedSensorId={selectedSensorId}
        onSensorChange={setSelectedSensorId}
        sensorsLoading={sensorsLoading}
        loading={loading}
        period={chartPeriod}
      />
      <HumidityChart
        period={chartPeriod}
        onPeriodChange={setChartPeriod}
        readings={chartReadings}
        loading={loading}
      />
      <TelemetryTable
        period={tablePeriod}
        onPeriodChange={setTablePeriod}
        readings={tableReadings}
        loading={loading}
        sensorId={selectedSensorId}
      />
    </main>
  );
}
