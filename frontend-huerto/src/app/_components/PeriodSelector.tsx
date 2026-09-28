import { periods, type Period } from "../_lib/telemetry";

type PeriodSelectorProps = {
  value: Period;
  onChange: (period: Period) => void;
  ariaLabel: string;
};

export default function PeriodSelector({
  value,
  onChange,
  ariaLabel,
}: PeriodSelectorProps) {
  return (
    <div className="period-control" role="group" aria-label={ariaLabel}>
      {periods.map((period) => (
        <button
          key={period.value}
          type="button"
          aria-pressed={value === period.value}
          onClick={() => onChange(period.value)}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
