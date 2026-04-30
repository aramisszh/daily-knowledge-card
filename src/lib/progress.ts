export type MinimalStudyRecord = {
  completed_at: string | null;
};

export function calculateStreak(records: MinimalStudyRecord[], todayDateString: string) {
  const completedDates = new Set(
    records
      .map((record) => record.completed_at?.slice(0, 10))
      .filter((value): value is string => Boolean(value))
  );

  let streak = 0;
  const cursor = new Date(`${todayDateString}T00:00:00+08:00`);

  while (true) {
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Singapore",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(cursor);

    if (!completedDates.has(date)) break;

    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
