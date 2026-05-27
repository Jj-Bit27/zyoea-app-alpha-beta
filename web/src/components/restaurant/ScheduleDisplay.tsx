import type { HoursData, HoursDayRange } from "../../libs/formatters";

const DAY_LABELS: Record<string, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

const DAY_ORDER = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
];

function formatRange(r: HoursDayRange) {
  return `${r.open} - ${r.close}`;
}

function ScheduleDisplay({ hours }: { hours: string }) {
  let data: HoursData | null = null;
  try {
    const parsed = JSON.parse(hours);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      data = parsed as HoursData;
    }
  } catch {
    return <span className="text-muted-foreground">{hours}</span>;
  }

  if (!data) return <span className="text-muted-foreground">{hours}</span>;

  const today = new Date().getDay();
  const todayKey = DAY_ORDER[today === 0 ? 6 : today - 1];

  return (
    <div className="space-y-1 text-sm">
      {DAY_ORDER.map((day) => {
        const ranges = data?.[day];
        const isToday = day === todayKey;
        return (
          <div
            key={day}
            className={`flex justify-between gap-4 ${isToday ? "font-semibold text-foreground" : "text-muted-foreground"}`}
          >
            <span>{DAY_LABELS[day]}</span>
            <span className="text-right">
              {ranges && ranges.length > 0
                ? ranges.map(formatRange).join(", ")
                : "Cerrado"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export { ScheduleDisplay };
