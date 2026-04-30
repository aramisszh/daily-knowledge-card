export function getSingaporeDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getSingaporeWeekdayIndex(dateString: string) {
  const date = new Date(`${dateString}T00:00:00+08:00`);
  return date.getDay();
}
