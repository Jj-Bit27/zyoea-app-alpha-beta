export function formatCardNumber(value: string): string {
  const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
  const parts = v.match(/.{1,4}/g);
  return parts ? parts.join(" ") : v;
}

export function formatExpiry(value: string): string {
  const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
  if (v.length >= 2) return v.substring(0, 2) + "/" + v.substring(2, 4);
  return v;
}

const locale = "es-MX";

export function formatDateShort(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateLong(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatTimeShort(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function extractGraphQLError(err: unknown): string {
  const apolloErr = err as {
    graphQLErrors?: Array<{ message?: string }>;
    message?: string;
  };
  return (
    apolloErr?.graphQLErrors?.[0]?.message ||
    apolloErr?.message ||
    "Error desconocido"
  );
}

export interface HoursDayRange {
  open: string;
  close: string;
}

export interface HoursData {
  sunday: HoursDayRange[];
  monday: HoursDayRange[];
  tuesday: HoursDayRange[];
  wednesday: HoursDayRange[];
  thursday: HoursDayRange[];
  friday: HoursDayRange[];
  saturday: HoursDayRange[];
}

export function parseHoursData(hours: string): HoursData | null {
  try {
    return JSON.parse(hours);
  } catch {
    return null;
  }
}

export function serializeHoursData(data: HoursData): string {
  return JSON.stringify(data);
}
