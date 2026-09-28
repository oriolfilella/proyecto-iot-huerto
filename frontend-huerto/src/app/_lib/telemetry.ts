export type Telemetry = {
  _time: string;
  humedad_media: number;
  humedad_minima: number;
  humedad_maxima: number;
};

export type Period = "10m" | "day" | "week" | "month";
export type AveragePeriod = "hour" | "day" | "week" | "month";
export type AverageResult = {
  value: number | null;
  label: string;
};
export type ConnectionStatus = "checking" | "connected" | "error";
export type SensorOption = {
  id: string;
  label: string;
};

export const periods: { value: Period; label: string; duration: number }[] = [
  { value: "10m", label: "10 min", duration: 10 * 60 * 1000 },
  { value: "day", label: "Día", duration: 24 * 60 * 60 * 1000 },
  { value: "week", label: "Semana", duration: 7 * 24 * 60 * 60 * 1000 },
  { value: "month", label: "Mes", duration: 30 * 24 * 60 * 60 * 1000 },
];

// Traduce los periodos del selector a los valores que espera la API.
export const apiRange: Record<Period, string> = {
  "10m": "10min",
  day: "dia",
  week: "semana",
  month: "mes",
};

export const periodDescription = (period: Period) =>
  period === "10m"
    ? "Últimos 10 minutos"
    : period === "day"
      ? "Últimas 24 horas"
      : period === "week"
        ? "Últimos 7 días"
        : "Últimos 30 días";

// Tolera variaciones pequeñas y detecta ventanas horarias o diarias ausentes.
export const chartGapThreshold = (period: Period) =>
  period === "10m" ? 15_000 : period === "day" ? 90 * 60_000 : 36 * 60 * 60_000;

export const dateInputValue = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const dateTimeInputValue = (date: Date) => {
  // datetime-local espera la hora local, no la representación UTC de toISOString().
  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );
  return localDate.toISOString().slice(0, 16);
};

export const formatPeriodDate = (value: string | undefined, period: Period) =>
  value
    ? new Intl.DateTimeFormat(
        "es-ES",
        period === "10m"
          ? {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }
          : period === "day"
            ? {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              }
            : { day: "2-digit", month: "2-digit", year: "numeric" },
      ).format(new Date(value))
    : "Sin fecha";

export const getAverageRange = (period: AveragePeriod, selection: string) => {
  let start: Date;
  let end: Date;
  let label: string;

  if (period === "hour") {
    start = new Date(selection);
    if (!Number.isFinite(start.getTime())) {
      throw new Error("Selecciona una hora válida.");
    }
    start.setMinutes(0, 0, 0);
    end = new Date(start);
    end.setHours(end.getHours() + 1);
    label = `Hora del ${new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(start)} a las ${String(start.getHours()).padStart(2, "0")}:00`;
  } else if (period === "month") {
    const [year, month] = selection.split("-").map(Number);
    start = new Date(year, month - 1, 1);
    end = new Date(year, month, 1);
    label = new Intl.DateTimeFormat("es-ES", {
      month: "long",
      year: "numeric",
    }).format(start);
  } else {
    const [year, month, day] = selection.split("-").map(Number);
    start = new Date(year, month - 1, day);
    if (!selection || !Number.isFinite(start.getTime())) {
      throw new Error("Selecciona una fecha válida.");
    }
    if (period === "week") {
      // Las semanas del selector y de la búsqueda empiezan el lunes.
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      end = new Date(start);
      end.setDate(end.getDate() + 7);
      const lastDay = new Date(end);
      lastDay.setDate(lastDay.getDate() - 1);
      label = `Semana del ${dateInputValue(start)} al ${dateInputValue(lastDay)}`;
    } else {
      end = new Date(start);
      end.setDate(end.getDate() + 1);
      label = new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(start);
    }
  }

  return { start, end, label };
};
