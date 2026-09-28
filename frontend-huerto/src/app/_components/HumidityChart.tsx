import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  chartGapThreshold,
  periodDescription,
  periods,
  type Period,
  type Telemetry,
} from "../_lib/telemetry";
import PeriodSelector from "./PeriodSelector";

type ChartPoint = {
  timestamp: number;
  humedad_media: number | null;
};

type HumidityChartProps = {
  period: Period;
  onPeriodChange: (period: Period) => void;
  readings: Telemetry[];
  loading: boolean;
};

export default function HumidityChart({
  period,
  onPeriodChange,
  readings,
  loading,
}: HumidityChartProps) {
  const now = Date.now();
  const chartData: ChartPoint[] = [];
  // Un punto nulo rompe la línea cuando faltan ventanas agregadas entre dos lecturas.
  [...readings].reverse().forEach((reading, index, orderedReadings) => {
    const timestamp = new Date(reading._time).getTime();
    if (index > 0) {
      const previousTimestamp = new Date(
        orderedReadings[index - 1]._time,
      ).getTime();
      if (timestamp - previousTimestamp > chartGapThreshold(period)) {
        chartData.push({
          timestamp: (previousTimestamp + timestamp) / 2,
          humedad_media: null,
        });
      }
    }
    chartData.push({ timestamp, humedad_media: reading.humedad_media });
  });
  const chartStart =
    now - periods.find((item) => item.value === period)!.duration;

  return (
    <section className="panel chart-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{periodDescription(period)}</p>
          <p className="chart-gap-note">
            Los cortes de la línea indican periodos sin lecturas.
          </p>
        </div>
        <PeriodSelector
          value={period}
          onChange={onPeriodChange}
          ariaLabel="Periodo de la gráfica"
        />
      </div>
      <div className="chart-wrap">
        {loading ? (
          <div className="empty-state">Cargando lecturas...</div>
        ) : (
          <>
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
                  dataKey="timestamp"
                  type="number"
                  scale="time"
                  domain={[chartStart, now]}
                  tick={{ fill: "#657267", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                  tickFormatter={(value: number) =>
                    new Intl.DateTimeFormat(
                      "es-ES",
                      period === "10m"
                        ? { minute: "2-digit", second: "2-digit" }
                        : period === "day"
                          ? { hour: "2-digit", minute: "2-digit" }
                          : { day: "2-digit", month: "2-digit" },
                    ).format(new Date(value))
                  }
                />
                <YAxis
                  yAxisId="humidity"
                  domain={[0, 100]}
                  tick={{ fill: "#657267", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  labelFormatter={(value) =>
                    new Intl.DateTimeFormat("es-ES", {
                      ...(period === "10m"
                        ? {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          }
                        : {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          }),
                    }).format(new Date(Number(value)))
                  }
                  formatter={(value) => [`${value}%`, "Humedad media"]}
                />
                <Line
                  yAxisId="humidity"
                  type="monotone"
                  dataKey="humedad_media"
                  stroke="#2f7d59"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
            {chartData.length === 0 && (
              <div className="chart-empty-state">
                Sin lecturas en este periodo
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
