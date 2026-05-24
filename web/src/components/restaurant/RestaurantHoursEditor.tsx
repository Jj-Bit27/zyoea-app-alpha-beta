import { useState, useEffect } from "react";
import { FiPlus, FiTrash2, FiClock } from "react-icons/fi";

interface TimeRange {
  open: string;
  close: string;
}

type HoursData = Record<string, TimeRange[]>;

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const DAY_LABELS: Record<string, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

function parseHours(hours: string): HoursData {
  try {
    const parsed = JSON.parse(hours);
    if (typeof parsed === "object" && !Array.isArray(parsed)) {
      const result: HoursData = {};
      for (const day of DAYS) {
        if (Array.isArray(parsed[day])) {
          result[day] = parsed[day].map((r) => ({
            open: r.open || "09:00",
            close: r.close || "22:00",
          }));
        } else {
          result[day] = [];
        }
      }
      return result;
    }
  } catch {}
  const result: HoursData = {};
  for (const day of DAYS) result[day] = [];
  return result;
}

function serializeHours(data: HoursData): string {
  const clean: Record<string, TimeRange[]> = {};
  for (const [day, ranges] of Object.entries(data)) {
    const filtered = ranges.filter((r) => r.open && r.close);
    if (filtered.length > 0) clean[day] = filtered;
  }
  return JSON.stringify(clean);
}

interface Props {
  hours: string;
  onChange: (hours: string) => void;
}

export function RestaurantHoursEditor({ hours, onChange }: Props) {
  const [data, setData] = useState<HoursData>(() => parseHours(hours));

  useEffect(() => {
    setData(parseHours(hours));
  }, [hours]);

  const updateDay = (day: string, ranges: TimeRange[]) => {
    const next = { ...data, [day]: ranges };
    setData(next);
    onChange(serializeHours(next));
  };

  const addRange = (day: string) => {
    const ranges = [...(data[day] || []), { open: "09:00", close: "22:00" }];
    updateDay(day, ranges);
  };

  const removeRange = (day: string, index: number) => {
    const ranges = (data[day] || []).filter((_, i) => i !== index);
    updateDay(day, ranges);
  };

  const updateRange = (day: string, index: number, field: "open" | "close", value: string) => {
    const ranges = (data[day] || []).map((r, i) =>
      i === index ? { ...r, [field]: value } : r,
    );
    updateDay(day, ranges);
  };

  const hasAnyHours = Object.values(data).some((ranges) => ranges.length > 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-1">
        <FiClock size={16} />
        <span>Horarios de operación</span>
      </div>
      {!hasAnyHours && (
        <p className="text-xs text-muted-foreground mb-2">
          No hay horarios configurados. Agrega horarios para cada día.
        </p>
      )}
      <div className="space-y-2">
        {DAYS.map((day) => {
          const ranges = data[day] || [];
          return (
            <div key={day} className="flex flex-col gap-1.5 p-2 rounded-lg border border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground capitalize">
                  {DAY_LABELS[day]}
                </span>
                <button
                  type="button"
                  onClick={() => addRange(day)}
                  className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  <FiPlus size={12} /> Agregar horario
                </button>
              </div>
              {ranges.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Cerrado</p>
              ) : (
                <div className="space-y-1.5">
                  {ranges.map((range, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={range.open}
                        onChange={(e) => updateRange(day, idx, "open", e.target.value)}
                        className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-xs text-muted-foreground">a</span>
                      <input
                        type="time"
                        value={range.close}
                        onChange={(e) => updateRange(day, idx, "close", e.target.value)}
                        className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => removeRange(day, idx)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
