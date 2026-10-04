export function todayKey(timeZone = "Asia/Jakarta") {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function formatDateTime(value: unknown, timeZone = "Asia/Jakarta") {
  if (!value) return "-";
  const date = typeof value === "object" && value !== null && "toDate" in value
    ? (value as { toDate: () => Date }).toDate()
    : value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
